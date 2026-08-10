from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.friends.models import Friendship
from apps.profiles.subjects import SUBJECT_LABELS

from .models import MonthlyXP, RankHistory, RankingAward, RankingScope, SubjectXP
from .serializers import (
    RankingAwardSerializer,
    RankingEntrySerializer,
    RankHistorySerializer,
    SchoolComparisonEntrySerializer,
)
from .services import (
    close_previous_month_if_needed,
    leaderboard_visible,
    maybe_notify_season_ending,
    maybe_snapshot_rank_history,
    month_label,
)

TOP_N = 50
NEARBY_RADIUS = 3
MIN_SUBJECT_PARTICIPANTS = 3


def _friend_ids(user) -> set:
    pairs = Friendship.objects.filter(Q(user1=user) | Q(user2=user))
    return {f.user2_id if f.user1_id == user.id else f.user1_id for f in pairs}


class BaseRankingView(APIView):
    """
    Live top-N leaderboard for the current calendar month. The visible list
    is always capped at TOP_N, but `my_rank` reports the caller's true
    position even when they're far outside it (e.g. #1023) — nobody but
    themself sees that number, and the list itself never grows past TOP_N.
    """

    permission_classes = [permissions.IsAuthenticated]

    RANK_HISTORY_SCOPE = None  # set on subclasses that should snapshot daily rank history

    def get_queryset(self):
        raise NotImplementedError

    def _rank_history_kwargs(self):
        return {}

    def get(self, request):
        close_previous_month_if_needed()

        base_qs = leaderboard_visible(self.get_queryset(), request.user)
        if self.RANK_HISTORY_SCOPE:
            maybe_snapshot_rank_history(
                request.user, self.RANK_HISTORY_SCOPE, base_qs, **self._rank_history_kwargs()
            )
        rows = list(base_qs.select_related("user", "user__school", "user__profile")[:TOP_N])
        entries = [{"rank": i, "row": row} for i, row in enumerate(rows, start=1)]
        data = RankingEntrySerializer(entries, many=True, context={"request": request}).data

        my_row = next((e for e in entries if e["row"].user_id == request.user.id), None)
        if my_row:
            my_rank = my_row["rank"]
            my_xp = my_row["row"].xp
        else:
            my_rank, my_xp = self._rank_outside_top(base_qs, request.user)

        if self.RANK_HISTORY_SCOPE and my_rank is not None and my_rank <= TOP_N:
            maybe_notify_season_ending(request.user, self.RANK_HISTORY_SCOPE)

        today = timezone.localdate()
        return Response({
            "year": today.year,
            "month": today.month,
            "month_label": month_label(today.year, today.month),
            "results": data,
            "my_rank": my_rank,
            "my_xp": my_xp,
            "nearby": self._nearby_entries(base_qs, entries, my_rank, request),
        })

    def _rank_outside_top(self, base_qs, user):
        """(rank, xp) for a user who didn't make the visible TOP_N, or (None, None)
        if they have no XP this month at all (base_qs already excludes xp=0)."""
        my_row = base_qs.filter(user_id=user.id).first()
        if my_row is None:
            return None, None
        better_count = base_qs.filter(
            Q(xp__gt=my_row.xp) | (Q(xp=my_row.xp) & Q(user_id__lt=my_row.user_id))
        ).count()
        return better_count + 1, my_row.xp

    def _nearby_entries(self, base_qs, entries, my_rank, request):
        """A small window of ranks around the caller (e.g. #84-#89, "you" at
        #87) for a compact "monthly challenge" card — free when the caller
        is already inside the visible TOP_N list, one bounded extra query
        otherwise."""
        if my_rank is None:
            return []
        start = max(0, my_rank - 1 - NEARBY_RADIUS)
        end = my_rank + NEARBY_RADIUS
        if my_rank <= TOP_N:
            return RankingEntrySerializer(entries[start:end], many=True, context={"request": request}).data
        rows = list(base_qs.select_related("user", "user__school", "user__profile")[start:end])
        window_entries = [{"rank": start + i + 1, "row": row} for i, row in enumerate(rows)]
        return RankingEntrySerializer(window_entries, many=True, context={"request": request}).data


class GlobalRankingView(BaseRankingView):
    """GET /api/rankings/global/ — top 50 students app-wide for the current month."""

    RANK_HISTORY_SCOPE = RankingScope.GLOBAL

    def get_queryset(self):
        today = timezone.localdate()
        return MonthlyXP.objects.filter(year=today.year, month=today.month, xp__gt=0).order_by("-xp", "user_id")


class SchoolRankingView(BaseRankingView):
    """GET /api/rankings/school/ — top 50 students at the caller's own school, this month."""

    RANK_HISTORY_SCOPE = RankingScope.SCHOOL

    def _rank_history_kwargs(self):
        return {"school": self.request.user.school}

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
            today = timezone.localdate()
            return Response({
                "year": today.year,
                "month": today.month,
                "month_label": month_label(today.year, today.month),
                "results": [],
                "my_rank": None,
                "no_school": True,
            })
        return super().get(request)


class ClassRankingView(BaseRankingView):
    """GET /api/rankings/class/ — top 50 students in the caller's own grade at their own school, this month."""

    RANK_HISTORY_SCOPE = RankingScope.CLASS

    def _rank_history_kwargs(self):
        return {"school": self.request.user.school, "grade": self.request.user.grade}

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
        today = timezone.localdate()
        if not request.user.school_id:
            return Response({
                "year": today.year,
                "month": today.month,
                "month_label": month_label(today.year, today.month),
                "results": [],
                "my_rank": None,
                "no_school": True,
            })
        if not request.user.grade:
            return Response({
                "year": today.year,
                "month": today.month,
                "month_label": month_label(today.year, today.month),
                "results": [],
                "my_rank": None,
                "no_grade": True,
            })
        return super().get(request)


class FriendsRankingView(BaseRankingView):
    """GET /api/rankings/friends/ — the caller plus their accepted friends,
    ranked by this month's XP. apps.friends.Friendship was deliberately kept
    standalone (see its docstring) specifically so this could be built as a
    plain join, with no changes needed to the friends app itself."""

    def get_queryset(self):
        today = timezone.localdate()
        ids = _friend_ids(self.request.user) | {self.request.user.id}
        return MonthlyXP.objects.filter(
            year=today.year, month=today.month, xp__gt=0, user_id__in=ids
        ).order_by("-xp", "user_id")


class SubjectRankingView(BaseRankingView):
    """GET /api/rankings/subject/<subject_key>/ — top 50 students for one
    subject's XP this month. A subject with too little real participation
    this month (see apps.profiles.subjects.SUBJECT_LABELS — only math/
    english have real practice content today) returns still_growing=True
    with an empty list instead of a near-empty, misleading board."""

    def get_queryset(self):
        today = timezone.localdate()
        subject_key = self.kwargs["subject_key"]
        return SubjectXP.objects.filter(
            subject_key=subject_key, year=today.year, month=today.month, xp__gt=0
        ).order_by("-xp", "user_id")

    def get(self, request, subject_key):
        if subject_key not in SUBJECT_LABELS:
            return Response({"detail": "Անհայտ առարկա։"}, status=404)
        visible_count = leaderboard_visible(self.get_queryset(), request.user).count()
        if visible_count < MIN_SUBJECT_PARTICIPANTS:
            today = timezone.localdate()
            return Response({
                "year": today.year,
                "month": today.month,
                "month_label": month_label(today.year, today.month),
                "results": [],
                "my_rank": None,
                "still_growing": True,
            })
        return super().get(request)


class RankHistoryView(APIView):
    """GET /api/rankings/history/?scope=global — the caller's own last 30
    days of rank/xp snapshots for the requested scope, oldest first. Powers
    the season progress chart. Snapshots are written lazily by the scope
    views themselves (see BaseRankingView.get) — this endpoint only reads."""

    permission_classes = [permissions.IsAuthenticated]
    HISTORY_DAYS = 30

    def get(self, request):
        scope = request.query_params.get("scope", RankingScope.GLOBAL)
        if scope not in RankingScope.values:
            return Response({"detail": "Անվավեր scope։"}, status=400)
        cutoff = timezone.localdate() - timezone.timedelta(days=self.HISTORY_DAYS)
        rows = RankHistory.objects.filter(user=request.user, scope=scope, date__gte=cutoff).order_by("date")
        return Response(RankHistorySerializer(rows, many=True).data)


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
            "month_label": month_label(today.year, today.month),
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
        target_id = self.kwargs["user_id"]
        if target_id != self.request.user.id:
            from apps.profiles.models import ProfilePrivacySettings  # local import: avoids a load-order dependency

            privacy, _ = ProfilePrivacySettings.objects.get_or_create(user_id=target_id)
            if not privacy.show_ranking:
                return RankingAward.objects.none()
        return RankingAward.objects.filter(user_id=target_id).select_related("school")
