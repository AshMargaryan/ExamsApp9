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
from calendar import month_name

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.users.models import School

from .models import MonthlyXP, RankingAward, RankingScope

ARMENIAN_MONTHS = {
    1: "Հունվար", 2: "Փետրվար", 3: "Մարտ", 4: "Ապրիլ", 5: "Մայիս", 6: "Հունիս",
    7: "Հուլիս", 8: "Օգոստոս", 9: "Սեպտեմբեր", 10: "Հոկտեմբեր", 11: "Նոյեմբեր", 12: "Դեկտեմբեր",
}

TOP_N_AWARDED = 3


def _previous_period(today=None):
    today = today or timezone.localdate()
    year, month = today.year, today.month
    if month == 1:
        return year - 1, 12
    return year, month - 1


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


def _award_title(
    scope: str, rank: int, year: int, month: int, school_name: str | None, grade: int | None = None
) -> str:
    month_label = f"{ARMENIAN_MONTHS.get(month, month_name[month])} {year}"
    place = {1: "1-ին", 2: "2-րդ", 3: "3-րդ"}.get(rank, f"{rank}-րդ")
    if scope == RankingScope.CLASS and school_name and grade:
        return f"{school_name}, {grade}-րդ դասարան — {month_label} #{place} տեղ"
    if scope == RankingScope.SCHOOL and school_name:
        return f"{school_name} — {month_label} #{place} տեղ"
    return f"Համադպրոցական — {month_label} #{place} տեղ"


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
        RankingAward.objects.get_or_create(
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
