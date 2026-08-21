from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.activity.services import total_seconds_since, weekly_seconds
from apps.friends.serializers import MiniUserSerializer
from apps.friends.services import are_friends
from apps.games.models import GameStats
from apps.games.serializers import GameStatsSerializer
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus, MockExamSubject
from apps.practice.models import AttemptAnswer
from apps.streaks.models import LearningStreak
from apps.streaks.serializers import LearningStreakSerializer
from apps.teaching.models import ConnectionStatus, TeacherProfile, TeacherStudentConnection
from apps.users.serializers import SchoolSerializer, UniversitySerializer
from apps.users.models import School, University
from apps.users.utils import suggest_usernames

from . import analytics
from .leveling import xp_progress
from .models import (
    CoachPreferences,
    Achievement,
    GoalType,
    LearningEvent,
    LearningPreferences,
    PersonalGoal,
    Profile,
    ProfilePrivacySettings,
    Rarity,
    ShowcaseSlot,
    StudentExam,
    StudentSubject,
    StudyAvailability,
    UserAchievement,
)
from .validators import validate_avatar_file

User = get_user_model()

_RARITY_RANK = {Rarity.LEGENDARY: 0, Rarity.EPIC: 1, Rarity.RARE: 2, Rarity.COMMON: 3}


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
    tests_completed = serializers.IntegerField()
    total_learning_time_seconds = serializers.IntegerField(allow_null=True)
    weekly_study_seconds = serializers.IntegerField()


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
    tutor_subjects = serializers.ListField(
        child=serializers.ChoiceField(choices=MockExamSubject.choices),
        source="user.tutor_subjects", required=False,
    )

    total_xp = serializers.IntegerField(read_only=True)
    level = serializers.SerializerMethodField()
    xp_into_level = serializers.SerializerMethodField()
    xp_for_next_level = serializers.SerializerMethodField()
    trophies_count = serializers.SerializerMethodField()
    days_until_exam = serializers.SerializerMethodField()
    username_change_available_at = serializers.SerializerMethodField()

    stats = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()
    game_stats = serializers.SerializerMethodField()
    showcase_achievements = serializers.SerializerMethodField()
    profile_completion = serializers.SerializerMethodField()

    # Teacher-only — null for students, populated from apps.teaching data.
    total_students = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()
    avg_student_accuracy_improvement = serializers.SerializerMethodField()
    avg_student_test_improvement = serializers.SerializerMethodField()

    # Student-only — null for teachers.
    teachers = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "avatar", "bio", "role",
            "username", "first_name", "last_name",
            "school", "school_id", "grade", "age", "marz", "university", "university_id",
            "tutor_subjects",
            "target_major",
            "total_xp", "level", "xp_into_level", "xp_for_next_level", "trophies_count",
            "target_exam_date", "days_until_exam", "username_change_available_at",
            "stats", "streak", "game_stats", "showcase_achievements", "profile_completion",
            "total_students", "students",
            "avg_student_accuracy_improvement", "avg_student_test_improvement",
            "teachers",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        current_user_id = self.instance.user_id if self.instance is not None else None
        if current_user_id is not None:
            qs = qs.exclude(pk=current_user_id)
        if qs.exists():
            raise serializers.ValidationError({
                "message": "Այս օգտանունն արդեն զբաղված է։",
                "suggestions": suggest_usernames(value, exclude_user_id=current_user_id),
            })
        if self.instance is not None and value != self.instance.user.username:
            user = self.instance.user
            if not user.can_change_username():
                days_left = user.days_until_username_change()
                raise serializers.ValidationError(
                    f"Օգտանունը կրկին կարող ես փոխել {days_left} օրից։"
                )
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

    def get_days_until_exam(self, obj):
        if not obj.target_exam_date:
            return None
        return (obj.target_exam_date - timezone.localdate()).days

    def get_username_change_available_at(self, obj):
        return obj.user.next_username_change_at()

    def get_stats(self, obj):
        answers = AttemptAnswer.objects.filter(
            attempt__user=obj.user,
            attempt__completed_at__isnull=False,
            attempt__revealed_answers=False,
        )
        questions_solved = answers.count()
        correct_answers = answers.filter(is_correct=True).count()
        accuracy = round((correct_answers / questions_solved) * 100, 1) if questions_solved else 0.0
        tests_completed = MockExamAttempt.objects.filter(
            user=obj.user, status=MockExamAttemptStatus.COMPLETED,
        ).count()

        data = {
            "questions_solved": questions_solved,
            "correct_answers": correct_answers,
            "accuracy_percentage": accuracy,
            "tests_completed": tests_completed,
            "total_learning_time_seconds": total_seconds_since(obj.user, obj.user.created_at),
            "weekly_study_seconds": weekly_seconds(obj.user),
        }
        return LearningStatsSerializer(data).data

    def get_streak(self, obj):
        streak, _ = LearningStreak.objects.get_or_create(user=obj.user)
        return LearningStreakSerializer(streak).data

    def get_game_stats(self, obj):
        stats, _ = GameStats.objects.get_or_create(user=obj.user)
        return GameStatsSerializer(stats).data

    def get_showcase_achievements(self, obj):
        """Uses the student's own 3 pinned ShowcaseSlot rows when set;
        otherwise auto-picks the rarest unlocked achievements (rarest first,
        most-recently-unlocked as tiebreaker) as a sensible default."""
        slots = list(
            ShowcaseSlot.objects.filter(user=obj.user).select_related("achievement").order_by("position")
        )
        if slots:
            unlocked_ats = {
                ua.achievement_id: ua.unlocked_at
                for ua in UserAchievement.objects.filter(
                    user=obj.user, achievement_id__in=[s.achievement_id for s in slots]
                )
            }
            return [
                {"id": s.achievement_id, "achievement": AchievementSerializer(s.achievement).data,
                 "unlocked_at": unlocked_ats.get(s.achievement_id)}
                for s in slots
            ]

        unlocks = (
            UserAchievement.objects.filter(user=obj.user)
            .select_related("achievement")
            .order_by("-unlocked_at")
        )
        top = sorted(unlocks, key=lambda ua: (_RARITY_RANK[ua.achievement.rarity], -ua.unlocked_at.timestamp()))[:3]
        return UserAchievementSerializer(top, many=True).data

    def get_profile_completion(self, obj):
        return analytics.profile_completion(obj.user)

    def _accepted_connections_as_teacher(self, obj):
        return TeacherStudentConnection.objects.filter(
            teacher=obj.user, status=ConnectionStatus.ACCEPTED, active=True
        ).select_related("student__profile")

    def _accepted_connections_as_student(self, obj):
        return TeacherStudentConnection.objects.filter(
            student=obj.user, status=ConnectionStatus.ACCEPTED, active=True
        ).select_related("teacher__profile")

    def get_total_students(self, obj):
        if obj.user.role != "teacher":
            return None
        return self._accepted_connections_as_teacher(obj).count()

    def get_students(self, obj):
        if obj.user.role != "teacher":
            return None
        students = [conn.student for conn in self._accepted_connections_as_teacher(obj)]
        return MiniUserSerializer(students, many=True, context=self.context).data

    def get_teachers(self, obj):
        if obj.user.role != "student":
            return None
        teachers = [conn.teacher for conn in self._accepted_connections_as_student(obj)]
        return MiniUserSerializer(teachers, many=True, context=self.context).data

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

    def _viewer_is_teacher_of(self, viewer, student) -> bool:
        return TeacherStudentConnection.objects.filter(
            teacher=viewer, student=student, status=ConnectionStatus.ACCEPTED, active=True
        ).exists()

    def to_representation(self, instance):
        """When rendering someone ELSE's profile (never the owner's own),
        mask fields per that person's ProfilePrivacySettings. Owner always
        sees their own full profile — this only ever narrows the other-user
        view (UserProfileDetailView), never the self view (ProfileMeView).
        Exception: a student's own connected teacher always sees full stats —
        that's the existing StudentReviewPanel feature, not a stranger view.
        Same exception for a confirmed friend (see apps.friends.services.are_friends) —
        friends unlock each other's full profile, same as the parent-facing
        child dashboard does for a linked parent."""
        data = super().to_representation(instance)
        request = self.context.get("request")
        viewer = getattr(request, "user", None) if request else None
        if (
            viewer is not None
            and getattr(viewer, "id", None) != instance.user_id
            and not self._viewer_is_teacher_of(viewer, instance.user)
            and not are_friends(viewer, instance.user)
        ):
            privacy, _ = ProfilePrivacySettings.objects.get_or_create(user=instance.user)
            if not privacy.show_age:
                data["age"] = None
            if not privacy.show_school:
                data["school"] = None
            if not privacy.show_university:
                data["university"] = None
            if not privacy.show_stats:
                data["stats"] = None
                data["streak"] = None
            if not privacy.show_achievements:
                data["showcase_achievements"] = []
        return data

    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        user = instance.user
        update_fields = list(user_data.keys())
        if "username" in user_data and user_data["username"] != user.username:
            user.username_changed_at = timezone.now()
            update_fields.append("username_changed_at")
        for attr, value in user_data.items():
            setattr(user, attr, value)
        if update_fields:
            user.save(update_fields=update_fields)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class PersonalGoalSerializer(serializers.ModelSerializer):
    """Progress is never stored — always computed live via
    analytics.goal_progress, same "can't go stale" philosophy as the rest
    of this module."""

    subject_name = serializers.CharField(source="subject.name", read_only=True, default=None)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = PersonalGoal
        fields = [
            "id", "goal_type", "target_value", "subject", "subject_name", "custom_title",
            "priority", "metadata", "deadline", "created_at", "completed_at", "progress",
        ]
        read_only_fields = ["created_at"]

    def get_progress(self, obj):
        return analytics.goal_progress(obj)

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("metadata must be a JSON object.")
        return value

    def validate(self, attrs):
        goal_type = attrs.get("goal_type", getattr(self.instance, "goal_type", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        custom_title = attrs.get("custom_title", getattr(self.instance, "custom_title", ""))
        if goal_type == GoalType.SUBJECT_ACCURACY and subject is None:
            raise serializers.ValidationError({"subject": "Այս նպատակի համար պետք է ընտրել առարկա։"})
        if goal_type == GoalType.CUSTOM and not custom_title:
            raise serializers.ValidationError({"custom_title": "Անհատական նպատակի համար պետք է վերնագիր նշել։"})
        if goal_type != GoalType.SUBJECT_ACCURACY and goal_type != GoalType.CUSTOM and not attrs.get(
            "target_value", getattr(self.instance, "target_value", None)
        ):
            raise serializers.ValidationError({"target_value": "Պետք է նշել նպատակային արժեք։"})
        return attrs


class PersonalGoalCompleteSerializer(serializers.Serializer):
    """POST-only action serializer for marking a CUSTOM goal done."""

    completed = serializers.BooleanField()


class StudentExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentExam
        fields = [
            "id", "name", "subject_key", "exam_date", "target_score", "importance",
            "status", "topics_note", "notes", "metadata", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("metadata must be a JSON object.")
        return value


class StudentSubjectSerializer(serializers.ModelSerializer):
    subject_label = serializers.CharField(source="get_subject_key_display", read_only=True)

    class Meta:
        model = StudentSubject
        fields = [
            "id", "subject_key", "subject_label", "is_active", "priority", "target_note",
            "exam", "start_date", "metadata", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_metadata(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("metadata must be a JSON object.")
        return value

    def validate(self, attrs):
        exam = attrs.get("exam", getattr(self.instance, "exam", None))
        subject_key = attrs.get("subject_key", getattr(self.instance, "subject_key", None))
        if exam is not None and exam.subject_key and exam.subject_key != subject_key:
            raise serializers.ValidationError({"exam": "Linked exam is for a different subject."})

        request = self.context.get("request")
        if request and subject_key and self.instance is None:
            if StudentSubject.objects.filter(user=request.user, subject_key=subject_key).exists():
                raise serializers.ValidationError({"subject_key": "You already have an entry for this subject."})
        return attrs

    def validate_exam(self, value):
        request = self.context.get("request")
        if value is not None and request and value.user_id != request.user.id:
            raise serializers.ValidationError("Exam not found.")
        return value


class LearningEventSerializer(serializers.ModelSerializer):
    """Read-only — events are written server-side via services.record_event,
    never accepted from student-facing requests."""

    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = LearningEvent
        fields = [
            "id", "event_type", "event_type_display", "subject_key", "topic_label",
            "source", "session", "target_id", "result", "metadata", "occurred_at",
        ]
        read_only_fields = fields


class StudyAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyAvailability
        fields = [
            "preferred_days", "preferred_start_time", "typical_session_minutes",
            "min_daily_minutes", "max_daily_minutes", "timezone", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate_preferred_days(self, value):
        if not isinstance(value, list) or any(not isinstance(d, int) or d < 0 or d > 6 for d in value):
            raise serializers.ValidationError("preferred_days must be a list of integers 0-6 (Monday-Sunday).")
        return value

    def validate(self, attrs):
        min_daily = attrs.get("min_daily_minutes", getattr(self.instance, "min_daily_minutes", None))
        max_daily = attrs.get("max_daily_minutes", getattr(self.instance, "max_daily_minutes", None))
        if min_daily is not None and max_daily is not None and min_daily > max_daily:
            raise serializers.ValidationError({"min_daily_minutes": "Cannot exceed max_daily_minutes."})
        return attrs


class LearningPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPreferences
        fields = ["explanation_style", "hints_before_answers", "preferred_language", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate_preferred_language(self, value):
        if value and value not in ("hy", "en"):
            raise serializers.ValidationError("preferred_language must be 'hy', 'en', or blank.")
        return value


class ProfilePrivacySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilePrivacySettings
        fields = [
            "show_school", "show_age", "show_university", "show_stats",
            "show_ranking", "show_achievements", "show_friends", "show_activity",
            "show_on_leaderboard",
        ]


class ShowcaseUpdateSerializer(serializers.Serializer):
    """PATCH /profile/showcase/ body: an ordered list of up to 3 achievement
    ids the caller has actually unlocked. An empty list clears the pins and
    reverts to the auto-picked default."""

    achievement_ids = serializers.ListField(
        child=serializers.IntegerField(), max_length=3, allow_empty=True
    )

    def validate_achievement_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Կրկնվող նվաճում։")
        user = self.context["request"].user
        unlocked_ids = set(
            UserAchievement.objects.filter(user=user, achievement_id__in=value).values_list(
                "achievement_id", flat=True
            )
        )
        missing = set(value) - unlocked_ids
        if missing:
            raise serializers.ValidationError("Ցուցադրության մեջ կարող ես դնել միայն ապակողպված նվաճումներ։")
        return value

    def save(self):
        user = self.context["request"].user
        ShowcaseSlot.objects.filter(user=user).delete()
        ShowcaseSlot.objects.bulk_create([
            ShowcaseSlot(user=user, achievement_id=aid, position=i)
            for i, aid in enumerate(self.validated_data["achievement_ids"])
        ])


class CoachPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachPreferences
        fields = [
            "mock_exams_per_week", "preferred_test_days", "preferred_test_time",
            "configured_at", "updated_at",
        ]
        read_only_fields = ["configured_at", "updated_at"]

    def update(self, instance, validated_data):
        # Any save is a deliberate choice — including "the defaults are fine",
        # which is otherwise indistinguishable from never having looked.
        if instance.configured_at is None:
            validated_data["configured_at"] = timezone.now()
        return super().update(instance, validated_data)

    def validate_preferred_test_days(self, value):
        if not isinstance(value, list) or any(not isinstance(d, int) or d < 0 or d > 6 for d in value):
            raise serializers.ValidationError(
                "preferred_test_days must be a list of integers 0-6 (Monday-Sunday)."
            )
        return sorted(set(value))

    def validate(self, attrs):
        # Model.clean() isn't run by DRF, and the "can't pick more test days
        # than exams per week" rule has to hold across a PATCH that touches
        # only one of the two fields — so both sides are resolved here first.
        per_week = attrs.get(
            "mock_exams_per_week",
            getattr(self.instance, "mock_exams_per_week", 1),
        )
        days = attrs.get("preferred_test_days", getattr(self.instance, "preferred_test_days", []))
        if per_week and len(days) > per_week:
            raise serializers.ValidationError(
                {"preferred_test_days": "Ընտրված օրերը չեն կարող ավելի շատ լինել, քան շաբաթական թեստերի քանակը։"}
            )
        return attrs
