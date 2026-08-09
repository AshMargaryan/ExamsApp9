import jwt
from django.conf import settings
from django.core import signing
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jwt import PyJWKClient

TICKET_SALT = "apps.users.oauth.registration_ticket"
TICKET_MAX_AGE_SECONDS = 15 * 60

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"

_apple_jwk_client: PyJWKClient | None = None


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


def _apple_email_verified(value) -> bool:
    # Apple has been known to send this claim as the string "true"/"false"
    # rather than a JSON boolean, depending on client/flow — accept both.
    if isinstance(value, bool):
        return value
    return str(value).lower() == "true"


def _get_apple_jwk_client() -> PyJWKClient:
    global _apple_jwk_client
    if _apple_jwk_client is None:
        _apple_jwk_client = PyJWKClient(APPLE_JWKS_URL, cache_keys=True)
    return _apple_jwk_client


def verify_apple_id_token(token: str) -> dict:
    """Verify an Apple identity token and return its claims. Raises ValueError if invalid.

    Apple never includes the user's name in the token — it's only sent once,
    as a separate `user` field alongside the token on the very first
    authorization. The caller is responsible for capturing and forwarding it;
    see AppleAuthView."""
    try:
        signing_key = _get_apple_jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.APPLE_OAUTH_CLIENT_ID,
            issuer=APPLE_ISSUER,
        )
    except jwt.PyJWTError as exc:
        raise ValueError(str(exc)) from exc

    return {
        "sub": claims["sub"],
        "email": claims.get("email", ""),
        "email_verified": _apple_email_verified(claims.get("email_verified", False)),
    }
