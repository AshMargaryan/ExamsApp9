import random

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def issue_tokens_for_user(user, session) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["session_id"] = str(session.session_id)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def suggest_usernames(base: str, count: int = 4, exclude_user_id: int | None = None) -> list[str]:
    """Suggest `count` free usernames derived from `base` by appending random digits."""
    suggestions: list[str] = []
    attempts = 0
    while len(suggestions) < count and attempts < count * 20:
        attempts += 1
        candidate = f"{base}{random.randint(1, 999)}"
        if candidate in suggestions:
            continue
        qs = User.objects.filter(username=candidate)
        if exclude_user_id is not None:
            qs = qs.exclude(pk=exclude_user_id)
        if not qs.exists():
            suggestions.append(candidate)
    while len(suggestions) < count:
        suggestions.append(f"{base}{random.randint(1000, 999999)}")
    return suggestions
