from django.conf import settings
from django.core import signing
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

TICKET_SALT = "apps.users.oauth.registration_ticket"
TICKET_MAX_AGE_SECONDS = 15 * 60


def make_registration_ticket(provider: str, sub: str, email: str, first_name: str, last_name: str) -> str:
    """Sign a short-lived, tamper-proof payload identifying a not-yet-created OAuth user."""
    payload = {
        "provider": provider,
        "sub": sub,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    }
    return signing.dumps(payload, salt=TICKET_SALT)


def read_registration_ticket(ticket: str) -> dict:
    """Verify and decode a registration ticket. Raises signing.BadSignature/SignatureExpired."""
    return signing.loads(ticket, salt=TICKET_SALT, max_age=TICKET_MAX_AGE_SECONDS)


def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and return its claims. Raises ValueError if invalid."""
    claims = google_id_token.verify_oauth2_token(
        token, google_requests.Request(), settings.GOOGLE_OAUTH_CLIENT_ID
    )
    return {
        "sub": claims["sub"],
        "email": claims.get("email", ""),
        "email_verified": bool(claims.get("email_verified", False)),
        "first_name": claims.get("given_name", ""),
        "last_name": claims.get("family_name", ""),
    }
