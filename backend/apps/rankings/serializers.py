from rest_framework import serializers

from apps.users.serializers import SchoolSerializer

from .models import RankHistory, RankingAward


class RankingEntrySerializer(serializers.Serializer):
    """Expects context items of the form {"rank": int, "row": MonthlyXP}."""

    rank = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    school = serializers.SerializerMethodField()
    xp = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()

    def get_rank(self, obj):
        return obj["rank"]

    def get_user_id(self, obj):
        return obj["row"].user_id

    def get_username(self, obj):
        return obj["row"].user.username

    def get_first_name(self, obj):
        return obj["row"].user.first_name

    def get_last_name(self, obj):
        return obj["row"].user.last_name

    def get_avatar(self, obj):
        profile = getattr(obj["row"].user, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        url = profile.avatar.url
        return request.build_absolute_uri(url) if request else url

    def get_school(self, obj):
        school = obj["row"].user.school
        return SchoolSerializer(school).data if school else None

    def get_xp(self, obj):
        return obj["row"].xp

    def get_level(self, obj):
        from apps.profiles.leveling import level_for_xp

        profile = getattr(obj["row"].user, "profile", None)
        return level_for_xp(profile.total_xp) if profile else 1


class SchoolComparisonEntrySerializer(serializers.Serializer):
    """Expects context items of the form
    {"rank", "school_id", "school_name", "school_marz", "total_xp", "student_count"}."""

    rank = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    student_count = serializers.IntegerField()
    school = serializers.SerializerMethodField()

    def get_school(self, obj):
        return {"id": obj["school_id"], "name": obj["school_name"], "marz": obj["school_marz"]}


class RankingAwardSerializer(serializers.ModelSerializer):
    school = SchoolSerializer(read_only=True)

    class Meta:
        model = RankingAward
        fields = ["id", "scope", "school", "grade", "year", "month", "rank", "xp", "title", "awarded_at"]


class RankHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RankHistory
        fields = ["date", "xp", "rank"]
