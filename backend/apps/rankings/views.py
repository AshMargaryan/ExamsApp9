from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MonthlyXP, RankingAward
from .serializers import RankingAwardSerializer, RankingEntrySerializer, SchoolComparisonEntrySerializer
from .services import close_previous_month_if_needed

TOP_N = 50


class BaseRankingView(APIView):
    """
    Live top-N leaderboard for the current calendar month. The visible list
    is always capped at TOP_N, but `my_rank` reports the caller's true
    position even when they're far outside it (e.g. #1023) — nobody but
    themself sees that number, and the list itself never grows past TOP_N.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        raise NotImplementedError

    def get(self, request):
        close_previous_month_if_needed()

        base_qs = self.get_queryset()
        rows = list(base_qs.select_related("user", "user__school", "user__profile")[:TOP_N])
        entries = [{"rank": i, "row": row} for i, row in enumerate(rows, start=1)]
        data = RankingEntrySerializer(entries, many=True, context={"request": request}).data

        my_row = next((e for e in entries if e["row"].user_id == request.user.id), None)
        my_rank = my_row["rank"] if my_row else self._rank_outside_top(base_qs, request.user)

        return Response({
            "year": timezone.localdate().year,
            "month": timezone.localdate().month,
            "results": data,
            "my_rank": my_rank,
        })

    def _rank_outside_top(self, base_qs, user):
        """1-based rank for a user who didn't make the visible TOP_N, or None
        if they have no XP this month at all (base_qs already excludes xp=0)."""
        my_row = base_qs.filter(user_id=user.id).first()
        if my_row is None:
            return None
        better_count = base_qs.filter(
            Q(xp__gt=my_row.xp) | (Q(xp=my_row.xp) & Q(user_id__lt=my_row.user_id))
        ).count()
        return better_count + 1


class GlobalRankingView(BaseRankingView):
    """GET /api/rankings/global/ — top 50 students app-wide for the current month."""

    def get_queryset(self):
        today = timezone.localdate()
        return MonthlyXP.objects.filter(year=today.year, month=today.month, xp__gt=0).order_by("-xp", "user_id")


class SchoolRankingView(BaseRankingView):
    """GET /api/rankings/school/ — top 50 students at the caller's own school, this month."""

    def get_queryset(self):
        today = timezone.localdate()
        school_id = self.request.user.school_id
        if not school_id:
            return MonthlyXP.objects.none()
        return MonthlyXP.objects.filter(
            year=today.year, month=today.month, xp__gt=0, user__school_id=school_id
        ).order_by("-xp", "user_id")

    def get(self, request):
        if not request.user.school_id:
            return Response({
                "year": timezone.localdate().year,
                "month": timezone.localdate().month,
                "results": [],
                "my_rank": None,
                "no_school": True,
            })
        return super().get(request)


class ClassRankingView(BaseRankingView):
    """GET /api/rankings/class/ — top 50 students in the caller's own grade at their own school, this month."""

    def get_queryset(self):
        today = timezone.localdate()
        school_id = self.request.user.school_id
        grade = self.request.user.grade
        if not school_id or not grade:
            return MonthlyXP.objects.none()
        return MonthlyXP.objects.filter(
            year=today.year, month=today.month, xp__gt=0, user__school_id=school_id, user__grade=grade
        ).order_by("-xp", "user_id")

    def get(self, request):
        if not request.user.school_id:
            return Response({
                "year": timezone.localdate().year,
                "month": timezone.localdate().month,
                "results": [],
                "my_rank": None,
                "no_school": True,
            })
        if not request.user.grade:
            return Response({
                "year": timezone.localdate().year,
                "month": timezone.localdate().month,
                "results": [],
                "my_rank": None,
                "no_grade": True,
            })
        return super().get(request)


class SchoolComparisonView(APIView):
    """
    GET /api/rankings/schools/ — top 50 schools this month, ranked by the
    combined XP of their students. Reads the same live MonthlyXP ledger as
    the other ranking views, so it's adaptive by construction: as soon as a
    student earns XP, their school's total reflects it on the next request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        close_previous_month_if_needed()
        today = timezone.localdate()

        schools = list(
            MonthlyXP.objects.filter(year=today.year, month=today.month, xp__gt=0, user__school__isnull=False)
            .values("user__school_id", "user__school__name", "user__school__marz")
            .annotate(total_xp=Sum("xp"), student_count=Count("user", distinct=True))
            .order_by("-total_xp", "user__school_id")
        )

        entries = [
            {
                "rank": i,
                "school_id": row["user__school_id"],
                "school_name": row["user__school__name"],
                "school_marz": row["user__school__marz"],
                "total_xp": row["total_xp"],
                "student_count": row["student_count"],
            }
            for i, row in enumerate(schools, start=1)
        ]

        my_school_id = request.user.school_id
        my_entry = next((e for e in entries if e["school_id"] == my_school_id), None) if my_school_id else None

        data = SchoolComparisonEntrySerializer(entries[:TOP_N], many=True).data

        return Response({
            "year": today.year,
            "month": today.month,
            "results": data,
            "my_school_rank": my_entry["rank"] if my_entry else None,
        })


class MyRankingAwardsView(generics.ListAPIView):
    """GET /api/rankings/awards/mine/ — the authenticated user's trophy case."""

    serializer_class = RankingAwardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return RankingAward.objects.filter(user=self.request.user).select_related("school")


class UserRankingAwardsView(generics.ListAPIView):
    """GET /api/rankings/awards/<user_id>/ — another user's trophy case (e.g. viewing a friend's profile)."""

    serializer_class = RankingAwardSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return RankingAward.objects.filter(user_id=self.kwargs["user_id"]).select_related("school")
