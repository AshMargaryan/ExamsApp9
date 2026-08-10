"""
Monthly XP tracking + leaderboard closing.

`record_xp_gain` should be called anywhere Profile.total_xp is incremented,
so the current month's row always mirrors lifetime XP gained since the 1st.

The live leaderboard needs no explicit "reset" — it's just MonthlyXP rows
filtered to the current (year, month). The only thing that needs to happen
at a month boundary is minting RankingAward trophies for whoever finished
top 3 in the month that just ended. There's no cron/celery in this project,
so that close-out is done lazily: the first ranking request after a new
month begins triggers `close_previous_month_if_needed`, which is idempotent
(a no-op once that month's awards already exist).
"""
import calendar
from calendar import month_name

from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.users.models import School

from .models import MonthlyXP, RankHistory, RankingAward, RankingScope, SubjectXP

SEASON_ENDING_DAYS_BEFORE = 3

ARMENIAN_MONTHS = {
    1: "Հունվար", 2: "Փետրվար", 3: "Մարտ", 4: "Ապրիլ", 5: "Մայիս", 6: "Հունիս",
    7: "Հուլիս", 8: "Օգոստոս", 9: "Սեպտեմբեր", 10: "Հոկտեմբեր", 11: "Նոյեմբեր", 12: "Դեկտեմբեր",
}

TOP_N_AWARDED = 3


def month_label(year: int, month: int) -> str:
    """Single source of truth for the Armenian 'Month Year' label — the
    frontend used to hardcode its own copy of this list (RankingsPage.tsx's
    MONTH_NAMES), which could silently drift from this one."""
    return f"{ARMENIAN_MONTHS.get(month, month_name[month])} {year}"


def _previous_period(today=None):
    today = today or timezone.localdate()
    year, month = today.year, today.month
    if month == 1:
        return year - 1, 12
    return year, month - 1


def leaderboard_visible(base_qs, requesting_user):
    """Excludes users who've opted out of leaderboard visibility
    (ProfilePrivacySettings.show_on_leaderboard=False), except the
    requesting user themself — they can always see their own position, even
    while hidden from everyone else's view. Shared by the ranking views and
    the rank-history snapshot so both apply the exact same rule."""
    return base_qs.exclude(
        Q(user__privacy_settings__show_on_leaderboard=False) & ~Q(user_id=requesting_user.id)
    )


def _rank_history_scope_key(scope: str, school: School | None, grade: int | None) -> str:
    if scope == RankingScope.SCHOOL:
        return f"SCHOOL:{school.id}"
    if scope == RankingScope.CLASS:
        return f"CLASS:{school.id}:{grade}"
    return "GLOBAL"


_SCOPE_LABELS = {"global": "Համադպրոցական", "school": "Դպրոցական", "class": "Դասարանական"}


def _notify_rank_change(user, scope: str, new_rank: int, previous_rank: int) -> None:
    # Local import: apps.notifications doesn't depend on apps.rankings, but
    # importing it at module load time here would still create an avoidable
    # load-order coupling — same convention used elsewhere in this codebase.
    from apps.notifications.models import NotificationType
    from apps.notifications.services import create_notification

    scope_label = _SCOPE_LABELS.get(scope, scope)
    context = {"scope": scope, "rank": new_rank}
    if new_rank < previous_rank:
        create_notification(
            user, NotificationType.RANK_UP,
            f"🔥 Դու բարձրացել ես {scope_label} դասակարգման մեջ. այժմ դու #{new_rank}-ն ես։",
            context=context, link="/rankings",
        )
    else:
        create_notification(
            user, NotificationType.OVERTAKEN,
            f"⚠️ Քեզ առաջ են անցել {scope_label} դասակարգման մեջ. այժմ դու #{new_rank}-ն ես։",
            context=context, link="/rankings",
        )


def maybe_snapshot_rank_history(user, scope: str, base_qs, school: School | None = None, grade: int | None = None) -> None:
    """Records today's (rank, xp) for `user` in this scope, once per day, and
    fires a RANK_UP/OVERTAKEN notification if it moved since the last
    snapshot. `base_qs` must already be the scope-filtered, privacy-filtered
    MonthlyXP queryset a ranking view is about to render — passed in rather
    than rebuilt, so this always reflects exactly what that view just
    computed. No-op if already snapshotted today, or if the user has no XP
    this month (nothing meaningful to chart or notify about).

    The resulting notification is a once-a-day approximation ("your rank
    dropped since yesterday"), not real-time rival attribution — this
    project has no cron/background scheduler, so it can only compare against
    whatever the last lazy snapshot was, which is at most one per day."""
    today = timezone.localdate()
    scope_key = _rank_history_scope_key(scope, school, grade)
    if RankHistory.objects.filter(user=user, scope_key=scope_key, date=today).exists():
        return
    my_row = base_qs.filter(user_id=user.id).first()
    if my_row is None:
        return
    better_count = base_qs.filter(
        Q(xp__gt=my_row.xp) | (Q(xp=my_row.xp) & Q(user_id__lt=my_row.user_id))
    ).count()
    new_rank = better_count + 1

    previous = RankHistory.objects.filter(user=user, scope_key=scope_key).order_by("-date").first()

    RankHistory.objects.create(
        user=user, scope=scope, scope_key=scope_key, school=school, grade=grade,
        date=today, xp=my_row.xp, rank=new_rank,
    )

    if previous is not None and previous.rank != new_rank:
        _notify_rank_change(user, scope, new_rank, previous.rank)


def _days_left_in_month(today) -> int:
    last_day = calendar.monthrange(today.year, today.month)[1]
    return last_day - today.day


def maybe_notify_season_ending(user, scope: str) -> None:
    """One-time-per-month nudge for a user who's inside a scope board's
    visible top-N, once the season has SEASON_ENDING_DAYS_BEFORE or fewer
    days left. Callers are expected to only call this when the user is
    already known to be in the visible list — this only handles the
    day-of-month gate and the once-per-scope-per-month dedupe."""
    today = timezone.localdate()
    if _days_left_in_month(today) > SEASON_ENDING_DAYS_BEFORE:
        return

    from apps.notifications.models import NotificationType, StudentNotification
    from apps.notifications.services import create_notification

    already_notified = StudentNotification.objects.filter(
        user=user, notification_type=NotificationType.SEASON_ENDING,
        created_at__year=today.year, created_at__month=today.month,
        context__scope=scope,
    ).exists()
    if already_notified:
        return

    create_notification(
        user, NotificationType.SEASON_ENDING,
        f"⏳ {month_label(today.year, today.month)} սեզոնն ավարտվում է շուտով! Պահպանիր քո տեղը դասակարգման մեջ։",
        context={"scope": scope}, link="/rankings",
    )


def record_xp_gain(user, amount: int) -> None:
    """Credits `amount` XP to the user's current-month tally. No-op for amount <= 0."""
    if amount <= 0:
        return
    now = timezone.localdate()
    row, created = MonthlyXP.objects.get_or_create(
        user=user, year=now.year, month=now.month, defaults={"xp": amount}
    )
    if not created:
        MonthlyXP.objects.filter(pk=row.pk).update(xp=F("xp") + amount)


def record_subject_xp_gain(user, subject_key: str, amount: int) -> None:
    """Credits `amount` XP to the user's current-month tally for one
    subject. No-op for amount <= 0. Parallel to record_xp_gain — called
    alongside it, never instead of it, whenever award_xp knows the subject."""
    if amount <= 0:
        return
    now = timezone.localdate()
    row, created = SubjectXP.objects.get_or_create(
        user=user, subject_key=subject_key, year=now.year, month=now.month, defaults={"xp": amount}
    )
    if not created:
        SubjectXP.objects.filter(pk=row.pk).update(xp=F("xp") + amount)


def _award_title(
    scope: str, rank: int, year: int, month: int, school_name: str | None, grade: int | None = None
) -> str:
    label = month_label(year, month)
    place = {1: "1-ին", 2: "2-րդ", 3: "3-րդ"}.get(rank, f"{rank}-րդ")
    if scope == RankingScope.CLASS and school_name and grade:
        return f"{school_name}, {grade}-րդ դասարան — {label} #{place} տեղ"
    if scope == RankingScope.SCHOOL and school_name:
        return f"{school_name} — {label} #{place} տեղ"
    return f"Համադպրոցական — {label} #{place} տեղ"


def _notify_season_result(award: RankingAward) -> None:
    from apps.notifications.models import NotificationType
    from apps.notifications.services import create_notification

    create_notification(
        award.user, NotificationType.SEASON_RESULT, f"🏆 {award.title}",
        context={"scope": award.scope, "rank": award.rank, "award_id": award.id}, link="/profile",
    )


@transaction.atomic
def _close_scope(
    scope: str, year: int, month: int, school: School | None = None, grade: int | None = None
) -> None:
    qs = MonthlyXP.objects.filter(year=year, month=month, xp__gt=0).select_related("user")
    if scope == RankingScope.SCHOOL:
        qs = qs.filter(user__school=school)
    elif scope == RankingScope.CLASS:
        qs = qs.filter(user__school=school, user__grade=grade)

    top = list(qs.order_by("-xp", "user_id")[:TOP_N_AWARDED])
    for rank, row in enumerate(top, start=1):
        award, created = RankingAward.objects.get_or_create(
            scope=scope,
            school=school,
            grade=grade,
            year=year,
            month=month,
            rank=rank,
            defaults={
                "user": row.user,
                "xp": row.xp,
                "title": _award_title(scope, rank, year, month, school.name if school else None, grade),
            },
        )
        if created:
            _notify_season_result(award)


def close_month(year: int, month: int) -> None:
    """Idempotent: mints RankingAward rows for a finished month, globally, per school, and per class."""
    if RankingAward.objects.filter(scope=RankingScope.GLOBAL, year=year, month=month).exists():
        return

    _close_scope(RankingScope.GLOBAL, year, month)

    school_ids = (
        MonthlyXP.objects.filter(year=year, month=month, xp__gt=0, user__school__isnull=False)
        .values_list("user__school_id", flat=True)
        .distinct()
    )
    for school in School.objects.filter(id__in=school_ids):
        _close_scope(RankingScope.SCHOOL, year, month, school=school)

    school_grade_pairs = (
        MonthlyXP.objects.filter(
            year=year, month=month, xp__gt=0, user__school__isnull=False, user__grade__isnull=False
        )
        .values_list("user__school_id", "user__grade")
        .distinct()
    )
    schools_by_id = {school.id: school for school in School.objects.filter(id__in=school_ids)}
    for school_id, grade in school_grade_pairs:
        school = schools_by_id.get(school_id)
        if school:
            _close_scope(RankingScope.CLASS, year, month, school=school, grade=grade)


def close_previous_month_if_needed() -> None:
    year, month = _previous_period()
    close_month(year, month)
