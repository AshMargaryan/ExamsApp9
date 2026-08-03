from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer
from apps.practice.models import AttemptAnswer, PracticeAttempt
from apps.teaching.models import ConnectionStatus, TeacherProfile, TeacherStudentConnection
from apps.users.serializers import SchoolSerializer, UniversitySerializer
from apps.users.models import School, University

from .leveling import xp_progress
from .models import Achievement, Profile, UserAchievement
from .validators import validate_avatar_file

User = get_user_model()


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = [
            "id", "key", "name", "description", "icon", "rarity",
            "requirement_type", "requirement_value", "xp_reward",
        ]


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ["id", "achievement", "unlocked_at"]


class LearningStatsSerializer(serializers.Serializer):
    """Read-only, computed from apps.practice data — never stored, so it can't go stale."""

    questions_solved = serializers.IntegerField()
    correct_answers = serializers.IntegerField()
    accuracy_percentage = serializers.FloatField()
    practice_tests_completed = serializers.IntegerField()
    total_learning_time_seconds = serializers.IntegerField(allow_null=True)


class ProfileSerializer(serializers.ModelSerializer):
    """Combined profile view: Profile fields + a slice of User (education/identity)
    fields + computed gamification and learning-stats data."""

    avatar = serializers.ImageField(required=False, allow_null=True)

    role = serializers.CharField(source="user.role", read_only=True)
    username = serializers.CharField(source="user.username")
    first_name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    last_name = serializers.CharField(source="user.last_name", required=False, allow_blank=True)

    school = SchoolSerializer(source="user.school", read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        source="user.school", queryset=School.objects.all(), write_only=True, required=False, allow_null=True
    )
    university = UniversitySerializer(source="user.university", read_only=True)
    university_id = serializers.PrimaryKeyRelatedField(
        source="user.university", queryset=University.objects.all(), write_only=True, required=False, allow_null=True
    )
    grade = serializers.IntegerField(source="user.grade", required=False, allow_null=True)
    age = serializers.IntegerField(source="user.age", required=False, allow_null=True)
    marz = serializers.CharField(source="user.marz", required=False, allow_blank=True)

    total_xp = serializers.IntegerField(read_only=True)
    level = serializers.SerializerMethodField()
    xp_into_level = serializers.SerializerMethodField()
    xp_for_next_level = serializers.SerializerMethodField()
    trophies_count = serializers.SerializerMethodField()

    stats = serializers.SerializerMethodField()

    # Teacher-only — null for students, populated from apps.teaching data.
    total_students = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()
    avg_student_accuracy_improvement = serializers.SerializerMethodField()
    avg_student_test_improvement = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "avatar", "bio", "role",
            "username", "first_name", "last_name",
            "school", "school_id", "grade", "age", "marz", "university", "university_id",
            "total_xp", "level", "xp_into_level", "xp_for_next_level", "trophies_count",
            "stats",
            "total_students", "students",
            "avg_student_accuracy_improvement", "avg_student_test_improvement",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.user_id)
        if qs.exists():
            raise serializers.ValidationError("Այս օգտանունն արդեն զբաղված է։")
        return value

    def validate_bio(self, value):
        if len(value) > 500:
            raise serializers.ValidationError("Բիոն չպետք է գերազանցի 500 նիշը։")
        return value

    def validate_avatar(self, value):
        if value is not None:
            validate_avatar_file(value)
        return value

    def validate_grade(self, value):
        if value is not None and not (1 <= value <= 12):
            raise serializers.ValidationError("Դասարանը պետք է լինի 1-ից 12 միջակայքում։")
        return value

    def validate_age(self, value):
        if value is not None and not (1 <= value <= 120):
            raise serializers.ValidationError("Տարիքը պետք է լինի 1-ից 120 միջակայքում։")
        return value

    def _xp_progress(self, obj):
        return xp_progress(obj.total_xp)

    def get_level(self, obj):
        return self._xp_progress(obj)["level"]

    def get_xp_into_level(self, obj):
        return self._xp_progress(obj)["xp_into_level"]

    def get_xp_for_next_level(self, obj):
        return self._xp_progress(obj)["xp_for_next_level"]

    def get_trophies_count(self, obj):
        return obj.user.unlocked_achievements.count()

    def get_stats(self, obj):
        answers = AttemptAnswer.objects.filter(
            attempt__user=obj.user,
            attempt__completed_at__isnull=False,
            attempt__revealed_answers=False,
        )
        questions_solved = answers.count()
        correct_answers = answers.filter(is_correct=True).count()
        accuracy = round((correct_answers / questions_solved) * 100, 1) if questions_solved else 0.0
        practice_tests_completed = PracticeAttempt.objects.filter(
            user=obj.user, completed_at__isnull=False, revealed_answers=False,
        ).count()

        data = {
            "questions_solved": questions_solved,
            "correct_answers": correct_answers,
            "accuracy_percentage": accuracy,
            "practice_tests_completed": practice_tests_completed,
            # Not derivable: PracticeAttempt has no started_at, so per-question/
            # per-test duration can't be computed from existing data.
            "total_learning_time_seconds": None,
        }
        return LearningStatsSerializer(data).data

    def _accepted_connections(self, obj):
        return TeacherStudentConnection.objects.filter(
            teacher=obj.user, status=ConnectionStatus.ACCEPTED, active=True
        ).select_related("student__profile")

    def get_total_students(self, obj):
        if obj.user.role != "teacher":
            return None
        return self._accepted_connections(obj).count()

    def get_students(self, obj):
        if obj.user.role != "teacher":
            return None
        students = [conn.student for conn in self._accepted_connections(obj)]
        return MiniUserSerializer(students, many=True, context=self.context).data

    def _teacher_profile(self, obj):
        teacher_profile, _ = TeacherProfile.objects.get_or_create(user=obj.user)
        return teacher_profile

    def get_avg_student_accuracy_improvement(self, obj):
        if obj.user.role != "teacher":
            return None
        return self._teacher_profile(obj).avg_student_accuracy_improvement

    def get_avg_student_test_improvement(self, obj):
        if obj.user.role != "teacher":
            return None
        return self._teacher_profile(obj).avg_student_test_improvement

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)
        if user_data:
            user.save(update_fields=list(user_data.keys()))

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
