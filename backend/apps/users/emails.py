import secrets

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

ICON_URL = f"{settings.BACKEND_URL}/static/email/icon.png"


def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_email_with_icon(subject: str, text_body: str, to_email: str) -> None:
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="white-space: pre-line; font-size: 15px; color: #222;">{text_body}</div>
        <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin-top: 20px;">
            <img src="{ICON_URL}" alt="Gitus" width="80" height="80" style="border-radius: 16px;">
        </div>
    </div>
    """
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=False)


def send_verification_email(user) -> None:
    _send_email_with_icon(
        subject="Հաստատիր էլ․ հասցեդ",
        text_body=(
            f"Բարև, {user.first_name or user.username}։\n\n"
            f"Հաստատման կոդդ է՝ {user.email_verification_code}\n\n"
            "Կոդը վավեր է 15 րոպե։ Եթե դու չես գրանցվել այս կայքում, անտեսիր այս նամակը։"
        ),
        to_email=user.email,
    )


def send_password_reset_email(user, uid: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"
    _send_email_with_icon(
        subject="Գաղտնաբառի վերականգնում",
        text_body=(
            f"Բարև, {user.first_name or user.username}։\n\n"
            "Հայցել ես գաղտնաբառիդ վերականգնումը։ Անցիր հետևյալ հղմամբ՝ "
            "նոր գաղտնաբառ սահմանելու համար.\n\n"
            f"{reset_url}\n\n"
            "Եթե դու չես հայցել գաղտնաբառի փոփոխություն, անտեսիր այս նամակը։"
        ),
        to_email=user.email,
    )
