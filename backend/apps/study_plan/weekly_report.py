"""
A short AI-written weekly narrative report for the student themselves —
adapted from apps.parents.services' weekly report pattern (same lazy
send-at-most-once-a-week check, same send_mail delivery), but written
directly to the student ("you"), in the warm-mentor voice, from data this
app already computes elsewhere (apps.study_plan.coach.build_coach_panel's
week block, apps.parents.services.predicted_exam_score which is generic
despite its parent-facing name).
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import WeeklyCoachReportDelivery

logger = logging.getLogger(__name__)

WEEKLY_REPORT_INTERVAL = timedelta(days=7)


def _report_prompt_context(user, week: dict) -> str:
    from apps.parents.services import predicted_exam_score
    from apps.streaks.models import LearningStreak

    streak = LearningStreak.objects.filter(user=user).first()
    lines = [
        f"Այս շաբաթ ուսումնասիրել է {week['days_studied']} օր, ընդհանուր {week['minutes']} րոպե։",
        f"Լուծել է {week['questions']} հարց։",
    ]
    if week.get("accuracy") is not None:
        lines.append(f"Ճշտությունը եղել է {week['accuracy']}%։")
    if streak and streak.current_streak:
        lines.append(f"Ընթացիկ streak. {streak.current_streak} օր անընդմեջ։")
    score = predicted_exam_score(user)
    if score is not None:
        lines.append(f"Վերջին քննական թեստերի միջին միավորը՝ {score}։")
    lines.append(week.get("narrative", ""))
    return "\n".join(line for line in lines if line)


def generate_weekly_report_text(user, week: dict) -> str:
    from apps.ai_assistant.providers.base import AIMessage, AIRequest
    from apps.ai_assistant.services.ai_service import AIService

    context = _report_prompt_context(user, week)
    system_prompt = (
        "Դու ջերմ, խրախուսող անհատական ուսումնական մենթոր ես, ով ուղղակի "
        "դիմում է աշակերտին («դու»)։ Ստորև իրական տվյալներ են այս շաբաթվա "
        "ուսուցման մասին։ Գրիր կարճ, ջերմ ամփոփում հայերենով՝ 3-5 "
        "նախադասությամբ. նշիր առաջընթացը, մեկ կոնկրետ ուժեղ կողմ, և մեկ "
        "կոնկրետ առաջարկություն հաջորդ շաբաթվա համար։ Մի հորինիր տվյալներ, "
        "որոնք տրված չեն։"
    )
    response, _response_time_ms = AIService().generate(AIRequest(
        messages=[AIMessage(role="user", content=context)],
        system_prompt=system_prompt,
    ))
    return response.content.strip()


def email_weekly_report(user, report_text: str):
    if not user.email:
        return
    send_mail(
        subject="Քո շաբաթական հաշվետվությունը",
        message=report_text,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[user.email],
        fail_silently=False,
    )


def maybe_send_weekly_report(user, week: dict) -> bool:
    """Sends (and emails) a fresh AI weekly report if one hasn't gone out
    in the last 7 days. Returns True if one was actually sent this call."""
    now = timezone.now()
    delivery = WeeklyCoachReportDelivery.objects.filter(user=user).first()
    if delivery and now - delivery.last_sent_at < WEEKLY_REPORT_INTERVAL:
        return False
    if week["days_studied"] == 0:
        return False  # nothing to report yet — don't email an empty week

    report_text = generate_weekly_report_text(user, week)
    email_weekly_report(user, report_text)

    if delivery:
        delivery.last_sent_at = now
        delivery.last_report_text = report_text
        delivery.save(update_fields=["last_sent_at", "last_report_text"])
    else:
        WeeklyCoachReportDelivery.objects.create(user=user, last_sent_at=now, last_report_text=report_text)
    return True


def get_weekly_report_panel(user, week: dict):
    """Lazily refreshes the weekly report (see maybe_send_weekly_report),
    then returns what the page should show — never raises, so a flaky AI
    provider or email backend can't break the study plan page itself."""
    try:
        maybe_send_weekly_report(user, week)
    except Exception:
        logger.exception("maybe_send_weekly_report failed for user %s", user.id)

    delivery = WeeklyCoachReportDelivery.objects.filter(user=user).first()
    if not delivery or not delivery.last_report_text:
        return None
    return {"text": delivery.last_report_text, "sent_at": delivery.last_sent_at.isoformat()}
