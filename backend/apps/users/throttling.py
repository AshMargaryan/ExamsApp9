from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle


class LoginAccountThrottle(SimpleRateThrottle):
    """Caps login attempts against a *single account*, regardless of where
    they come from — so a distributed brute force that rotates source IPs is
    still bounded by the one thing it can't rotate: the username it's
    attacking.

    This is the half that actually stops password guessing. The IP-keyed
    ScopedRateThrottle on LoginView is the complementary half (one client
    spraying many different accounts), and it is deliberately loose: this
    platform's users are students who sit behind a school's single NAT
    gateway, so a tight per-IP login cap would lock out a whole classroom at
    the start of a lesson. Keying the strict limit on the account instead of
    the network is what makes it safe to be strict.

    Counts every attempt, not just failures — simpler, and a client making
    hundreds of *successful* logins per minute for one account is not a
    scenario worth accommodating either.
    """

    scope = "login-account"

    def get_cache_key(self, request, view):
        username = str(request.data.get("username", "")).strip().lower()
        if not username:
            # Nothing to key on (malformed request). The IP-keyed throttle on
            # the view still applies, so this isn't a bypass.
            return None
        # Hashed rather than raw: keeps usernames out of cache keys, and keeps
        # the key within the charset/length limits of non-local cache backends.
        return self.cache_format % {
            "scope": self.scope,
            "ident": sha256(username.encode("utf-8")).hexdigest(),
        }


class PasswordResetEmailThrottle(SimpleRateThrottle):
    """Same idea as LoginAccountThrottle, for password-reset requests: bounds
    how often *one mailbox* can be sent a reset email, so the endpoint can't
    be used to email-bomb a specific user from rotating IPs.
    """

    scope = "password-reset-email"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": sha256(email.encode("utf-8")).hexdigest(),
        }
