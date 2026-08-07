from collections import Counter, defaultdict
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone

from apps.notifications.realtime import push_notification_refresh
from apps.practice.models import AttemptAnswer, PracticeAttempt, Subject, Subtopic
from apps.practice.services import get_weekly_progress, progress_by_subtopic, subtopic_ids_with_questions
from apps.profiles.models import Profile, UserAchievement

from .models import (
    GoalType, LearningGoal, Notification, NotificationType,
    ParentChildLink, ParentChildRequest, ParentChildRequestStatus, WeeklyReportDelivery,
)

User = get_user_model()

MIN_ANSWERS_FOR_BEST_STUDY_TIME = 5
MASTERED_SCORE_THRESHOLD = 85
NEEDS_IMPROVEMENT_SCORE_THRESHOLD = 50
WEEKLY_REPORT_INTERVAL = timedelta(days=7)


# ---------------------------------------------------------------------------
# Linking — a parent finds their child by username and sends a request; the
# child sees it in their notification bell (same UX as friend requests) and
# accepts or rejects. Mirrors apps.friends.FriendRequest exactly.
# ---------------------------------------------------------------------------

class LinkError(Exception):
    pass


def send_child_request(parent, child) -> ParentChildRequest:
    if child.id == parent.id:
        raise LinkError("Չեք կարող ինքդ քեզ ծնող նշանակել։")
    if ParentChildLink.objects.filter(parent=parent, child=child).exists():
        raise LinkError("Այս հաշիվն արդեն կապված է որպես ձեր երեխա։")
    existing = ParentChildRequest.objects.filter(
        parent=parent, child=child, status=ParentChildRequestStatus.PENDING,
    ).first()
    if existing:
        raise LinkError("Հարցումն արդեն ուղարկված է։")
    req = ParentChildRequest.objects.create(parent=parent, child=child)
    push_notification_refresh(child.id)
    return req


def list_child_requests(user, direction="incoming"):
    base = ParentChildRequest.objects.filter(status=ParentChildRequestStatus.PENDING).select_related(
        "parent__profile", "child__profile",
    )
    if direction == "outgoing":
        return base.filter(parent=user)
    return base.filter(child=user)


def respond_to_child_request(request_id: int, child, action: str) -> ParentChildRequest:
    req = ParentChildRequest.objects.select_related("parent").get(
        pk=request_id, child=child, status=ParentChildRequestStatus.PENDING,
    )
    if action == "accept":
        req.status = ParentChildRequestStatus.ACCEPTED
        req.save(update_fields=["status"])
        ParentChildLink.objects.get_or_create(parent=req.parent, child=child)
    elif action == "reject":
        req.status = ParentChildRequestStatus.REJECTED
        req.save(update_fields=["status"])
    else:
        raise LinkError("Սխալ գործողություն։")
    push_notification_refresh(child.id)
    return req


def cancel_child_request(request_id: int, parent) -> None:
    ParentChildRequest.objects.filter(
        pk=request_id, parent=parent, status=ParentChildRequestStatus.PENDING,
    ).delete()


def search_children(parent, query: str):
    """Users matching `query` by username, annotated with their relationship
    to `parent` so the UI can show 'already linked' / 'request pending'."""
    query = (query or "").strip()
    if not query:
        return []
    users = list(
        User.objects.exclude(id=parent.id)
        .filter(username__icontains=query)
        .select_related("profile")
        .order_by("username")[:20]
    )
    linked_ids = set(
        ParentChildLink.objects.filter(parent=parent, child__in=users).values_list("child_id", flat=True)
    )
    pending_ids = set(
        ParentChildRequest.objects.filter(
            parent=parent, child__in=users, status=ParentChildRequestStatus.PENDING,
        ).values_list("child_id", flat=True)
    )
    results = []
    for user in users:
        if user.id in linked_ids:
            status = "already_linked"
        elif user.id in pending_ids:
            status = "request_pending"
        else:
            status = "none"
        results.append((user, status))
    return results


def get_children(parent):
    return (
        User.objects.filter(parent_links__parent=parent)
        .select_related("profile", "school")
        .order_by("first_name", "username")
    )


def get_linked_child_or_none(parent, child_id):
    return get_children(parent).filter(id=child_id).first()


def unlink_child(parent, child_id):
    ParentChildLink.objects.filter(parent=parent, child_id=child_id).delete()


# ---------------------------------------------------------------------------
# Dashboard data — every value here is computed live from real activity data.
# ---------------------------------------------------------------------------

def build_overview(child):
    from apps.streaks.models import LearningStreak

    profile, _ = Profile.objects.get_or_create(user=child)
    streak = LearningStreak.objects.filter(user=child).first()

    return {
        "id": child.id,
        "username": child.username,
        "first_name": child.first_name,
        "last_name": child.last_name,
        "avatar": profile.avatar.url if profile.avatar else None,
        "age": child.age,
        "grade": child.grade,
        "school": child.school.name if child.school else None,
        "level": profile.level,
        "total_xp": profile.total_xp,
        "current_streak": streak.current_streak if streak else 0,
        "longest_streak": streak.longest_streak if streak else 0,
        "last_active_date": streak.last_activity_date if streak else None,
    }


def build_subject_performance(child):
    progress = progress_by_subtopic(child)
    ids_with_questions = subtopic_ids_with_questions()

    results = []
    for subject in Subject.objects.prefetch_related("domains__topics__subtopics"):
        subtopic_ids = [
            s.id for d in subject.domains.all() for t in d.topics.all() for s in t.subtopics.all()
            if s.id in ids_with_questions
        ]
        if not subtopic_ids:
            continue

        scores = []
        for sid in subtopic_ids:
            scores.extend(progress.get(sid, {}).values())

        total_tiers = len(subtopic_ids) * 3
        results.append({
            "subject_id": subject.id,
            "subject_name": subject.name,
            "completion_percent": round(100 * len(scores) / total_tiers, 1) if total_tiers else 0.0,
            "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
            "tiers_completed": len(scores),
        })
    return results


def build_skills_mastery(child):
    progress = progress_by_subtopic(child)
    ids_with_questions = subtopic_ids_with_questions()
    subtopics = (
        Subtopic.objects.filter(id__in=ids_with_questions)
        .select_related("topic__domain__subject")
        .order_by("topic__domain__subject__order", "topic__domain__order", "topic__order", "order")
    )

    buckets = {"mastered": [], "practicing": [], "needs_improvement": []}
    for s in subtopics:
        scores = progress.get(s.id, {})
        if not scores:
            continue
        avg = sum(scores.values()) / len(scores)
        entry = {
            "subtopic_id": s.id, "name": s.name,
            "subject_name": s.topic.domain.subject.name, "avg_score": round(avg, 1),
        }
        if avg >= MASTERED_SCORE_THRESHOLD and len(scores) == 3:
            buckets["mastered"].append(entry)
        elif avg < NEEDS_IMPROVEMENT_SCORE_THRESHOLD:
            buckets["needs_improvement"].append(entry)
        else:
            buckets["practicing"].append(entry)
    return buckets


def build_activity_calendar(child, days=30):
    start = timezone.localdate() - timedelta(days=days - 1)
    answers = AttemptAnswer.objects.filter(
        attempt__user=child, attempt__completed_at__isnull=False,
        attempt__revealed_answers=False, answered_at__date__gte=start,
    ).values_list("answered_at", flat=True)

    counts = defaultdict(int)
    for ts in answers:
        counts[timezone.localtime(ts).date()] += 1

    return [
        {"date": (start + timedelta(days=i)).isoformat(), "count": counts.get(start + timedelta(days=i), 0)}
        for i in range(days)
    ]


def predicted_exam_score(child):
    from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus

    recent = MockExamAttempt.objects.filter(
        user=child, status=MockExamAttemptStatus.COMPLETED, scaled_score__isnull=False,
    ).order_by("-completed_at")[:5]
    scores = [a.scaled_score for a in recent]
    return round(sum(scores) / len(scores), 1) if scores else None


def best_study_hour(child):
    """Hour-of-day (0-23) the child most often answers correctly. None if not
    enough data yet — a single lucky answer at 3am shouldn't be reported as a habit."""
    timestamps = list(
        AttemptAnswer.objects.filter(attempt__user=child, is_correct=True).values_list("answered_at", flat=True)
    )
    if len(timestamps) < MIN_ANSWERS_FOR_BEST_STUDY_TIME:
        return None
    counter = Counter(timezone.localtime(ts).hour for ts in timestamps)
    return counter.most_common(1)[0][0]


def recent_achievements(child, limit=5):
    return (
        UserAchievement.objects.filter(user=child)
        .select_related("achievement")
        .order_by("-unlocked_at")[:limit]
    )


def build_child_dashboard(child):
    return {
        "overview": build_overview(child),
        "subject_performance": build_subject_performance(child),
        "skills_mastery": build_skills_mastery(child),
        "weekly_progress": get_weekly_progress(child),
        "activity_calendar": build_activity_calendar(child),
        "recent_achievements": recent_achievements(child),
        "predicted_exam_score": predicted_exam_score(child),
        "best_study_hour": best_study_hour(child),
    }


# ---------------------------------------------------------------------------
# Goals
# ---------------------------------------------------------------------------

def compute_goal_progress(goal: LearningGoal):
    today = timezone.localdate()

    if goal.goal_type == GoalType.LESSONS_PER_WEEK:
        week_start = today - timedelta(days=today.weekday())
        current = PracticeAttempt.objects.filter(
            user=goal.child, completed_at__date__gte=week_start,
            completed_at__isnull=False, revealed_answers=False,
        ).count()
    elif goal.goal_type == GoalType.XP_PER_MONTH:
        from apps.rankings.models import MonthlyXP
        row = MonthlyXP.objects.filter(user=goal.child, year=today.year, month=today.month).first()
        current = row.xp if row else 0
    elif goal.goal_type == GoalType.SUBJECT_ACCURACY:
        answers = AttemptAnswer.objects.filter(
            attempt__user=goal.child, attempt__subtopic__topic__domain__subject=goal.subject,
            attempt__completed_at__isnull=False, attempt__revealed_answers=False,
        )
        total = answers.count()
        current = round(100 * answers.filter(is_correct=True).count() / total, 1) if total else 0
    else:
        current = 0

    percent = min(100, round(100 * current / goal.target_value, 1)) if goal.target_value else 0
    return {"current": current, "target": goal.target_value, "percent": percent}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

def notify_parents(child, notification_type: str, message: str):
    links = ParentChildLink.objects.filter(child=child).select_related("parent")
    Notification.objects.bulk_create([
        Notification(parent=link.parent, child=child, notification_type=notification_type, message=message)
        for link in links
    ])


def list_notifications(parent, unread_only=False, limit=50):
    qs = Notification.objects.filter(parent=parent).select_related("child")
    if unread_only:
        qs = qs.filter(is_read=False)
    return qs[:limit]


def mark_notifications_read(parent, notification_ids=None):
    qs = Notification.objects.filter(parent=parent, is_read=False)
    if notification_ids is not None:
        qs = qs.filter(id__in=notification_ids)
    qs.update(is_read=True)


# ---------------------------------------------------------------------------
# AI weekly report
# ---------------------------------------------------------------------------

def _report_prompt_context(child, dashboard: dict) -> str:
    overview = dashboard["overview"]
    scored_subjects = [s for s in dashboard["subject_performance"] if s["avg_score"] is not None]
    strongest = max(scored_subjects, key=lambda s: s["avg_score"], default=None)
    weakest = min(scored_subjects, key=lambda s: s["avg_score"], default=None)
    week = dashboard["weekly_progress"][-1] if dashboard["weekly_progress"] else {"solved": 0, "correct": 0}

    lines = [
        f"Աշակերտ՝ {overview['first_name'] or overview['username']}, {overview['grade'] or '?'}-րդ դասարան։",
        f"Այս շաբաթ լուծել է {week['solved']} հարց, ճիշտ՝ {week['correct']}։",
        f"Ընթացիկ շարք՝ {overview['current_streak']} օր (ռեկորդ՝ {overview['longest_streak']} օր)։",
        f"Ընդհանուր փորձ (XP)՝ {overview['total_xp']}, մակարդակ {overview['level']}։",
    ]
    if strongest:
        lines.append(f"Ամենաուժեղ առարկան՝ {strongest['subject_name']} ({strongest['avg_score']}%)։")
    if weakest and weakest is not strongest:
        lines.append(f"Ամենաթույլ առարկան՝ {weakest['subject_name']} ({weakest['avg_score']}%)։")
    if dashboard["predicted_exam_score"] is not None:
        lines.append(f"Վերջին քննական թեստերի միջին միավորը՝ {dashboard['predicted_exam_score']}։")
    mastery = dashboard["skills_mastery"]
    if mastery["needs_improvement"]:
        weak_names = ", ".join(e["name"] for e in mastery["needs_improvement"][:3])
        lines.append(f"Լրացուցիչ ուշադրություն է պահանջվում այս թեմաներում՝ {weak_names}։")
    return "\n".join(lines)


def generate_weekly_report_text(child) -> str:
    from apps.ai_assistant.providers import AIMessage, AIRequest, get_provider

    dashboard = build_child_dashboard(child)
    context = _report_prompt_context(child, dashboard)

    system_prompt = (
        "Դու օգնում ես ծնողներին հասկանալ իրենց երեխայի ուսումնական առաջընթացը։ "
        "Ստորև տրված են երեխայի իրական այս շաբաթվա տվյալները։ Գրիր կարճ, "
        "ջերմ, կոնկրետ ամփոփում հայերենով ծնողի համար՝ 4-6 նախադասությամբ. "
        "նշիր առաջընթացը, ուժեղ և թույլ կողմերը, և տուր 1-2 կոնկրետ առաջարկություն "
        "հաջորդ շաբաթվա համար։ Մի հորինիր տվյալներ, որոնք տրված չեն։"
    )
    provider = get_provider()
    response = provider.generate(AIRequest(
        messages=[AIMessage(role="user", content=context)],
        system_prompt=system_prompt,
    ))
    return response.content


def email_weekly_report(parent, child, report_text: str):
    subject = f"Շաբաթական հաշվետվություն՝ {child.first_name or child.username}"
    send_mail(
        subject=subject,
        message=report_text,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[parent.email],
        fail_silently=False,
    )


def maybe_send_weekly_report(parent, child) -> bool:
    """
    Sends (and emails) a fresh AI weekly report for `child` to `parent` if
    one hasn't gone out in the last 7 days. Checked lazily whenever the
    parent opens their dashboard — there's no cron/Celery in this project
    (see apps.rankings.services for the same lazy-check pattern), so a
    parent who never opens the app won't get emailed on a fixed schedule;
    they'll get one the next time they do, at most once per week.
    Returns True if an email was actually sent this call.
    """
    now = timezone.now()
    delivery = WeeklyReportDelivery.objects.filter(parent=parent, child=child).first()
    if delivery and now - delivery.last_sent_at < WEEKLY_REPORT_INTERVAL:
        return False

    # Only record the send after it actually succeeds — if generation or
    # delivery raises, we want the next dashboard visit to retry, not wait
    # out a full week because a record already claimed it was sent.
    report_text = generate_weekly_report_text(child)
    email_weekly_report(parent, child, report_text)

    if delivery:
        delivery.last_sent_at = now
        delivery.save(update_fields=["last_sent_at"])
    else:
        WeeklyReportDelivery.objects.create(parent=parent, child=child, last_sent_at=now)
    return True
