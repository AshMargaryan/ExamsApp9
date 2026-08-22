from pathlib import Path
from datetime import timedelta
import environ
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Application definition

INSTALLED_APPS = [
    'daphne',  # must be first — gives `runserver` ASGI/WebSocket support in dev

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "channels",

    "apps.users",
    "apps.practice",
    "apps.ai_assistant",
    "apps.profiles",
    "apps.streaks",
    "apps.friends",
    "apps.games",
    "apps.notifications",
    "apps.mock_exams",
    "apps.flashcards",
    "apps.rankings",
    "apps.challenges",
    "apps.parents",
    "apps.activity",
    "apps.teaching",
    "apps.chat",
    "apps.mistakes",
    "apps.study_plan",
    "apps.helpcenter",
    "apps.knowledge",
    "apps.notepad",
    "apps.study_groups",
    "apps.todo",
    "apps.notes",
    "apps.calls",
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Serves static files directly from the Daphne process. Needed because,
    # unlike `manage.py runserver`, Daphne does not auto-serve static files
    # in DEBUG mode — without this middleware nothing under STATIC_URL would
    # be reachable at all, in dev or prod.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Base Redis connection string, no trailing DB index — CHANNEL_LAYERS and
# CACHES below each pick their own DB index off of this so they don't share
# keyspace with each other.
REDIS_URL = env("REDIS_URL", default="redis://redis:6379")

# Redis-backed so group broadcasts (chat, notifications, games) reach every
# worker process/machine, not just the one that sent them — required the
# moment more than one Daphne process is running.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [f"{REDIS_URL}/0"],
        },
    },
}

# Declared explicitly (this is Django's default) because it is
# security-relevant, not just a performance knob: DRF's rate limiting stores
# its counters here, so the auth throttles in REST_FRAMEWORK below are only as
# shared as this cache is. Redis-backed so every worker process/machine
# shares the same counters — with a per-process cache (e.g. LocMemCache),
# each worker keeps a private counter and an attacker can effectively
# multiply every rate limit by the worker count.
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    },
}


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        # Reuse connections across requests instead of opening/closing a new
        # Postgres connection every time — without this every request pays a
        # fresh TCP+auth handshake, which adds up fast under concurrent load.
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }
}

AUTH_USER_MODEL = "users.User"

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / "static"]
# Where `collectstatic` writes the deployable, hashed static bundle. Distinct
# from STATICFILES_DIRS above (your source static/ folder) on purpose — one
# is input, the other is generated output, and generated output should never
# be committed to git or edited by hand.
STATIC_ROOT = BASE_DIR / "staticfiles"

# In dev (DEBUG=True), Whitenoise serves files directly from STATICFILES_DIRS
# via Django's normal static-file finders — no collectstatic needed, and
# edits to files under static/ are picked up on the next request. In prod
# (DEBUG=False) this is False, so Whitenoise instead serves the collected,
# hashed, gzip-compressed bundle from STATIC_ROOT — see STORAGES below.
WHITENOISE_USE_FINDERS = DEBUG

# CompressedManifestStaticFilesStorage appends a content hash to each
# filename (e.g. app-3f2a1c.css) and pre-gzips them at collectstatic time.
# This is only exercised in prod, once `collectstatic` actually runs — see
# DJANGO_COLLECTSTATIC in docker/entrypoint.sh.
# "default" must be listed explicitly once STORAGES is customized at all —
# Django does NOT fall back to its implicit default for the keys you don't
# mention. Without this, every FileField/ImageField save in the project
# (avatars, AI assistant attachments, chat attachments, ...) raises
# InvalidStorageError the moment something is actually uploaded.
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Media files (user uploads — avatars, AI assistant attachments, chat attachments).
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.users.authentication.SessionAwareJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    # Rate limits for the auth endpoints (brute force / credential stuffing /
    # email bombing). Assigned per-view via throttle_scope in
    # apps/users/views.py.
    #
    # Two kinds of scope here, and the split matters:
    #
    #   * IP-keyed (ScopedRateThrottle) — deliberately LOOSE. Students on this
    #     platform sit behind a school's single NAT gateway, so a whole class
    #     shares one source IP; a tight per-IP cap would lock out the class at
    #     the start of a lesson rather than stop an attacker.
    #   * Identity-keyed (apps/users/throttling.py) — TIGHT, because the key
    #     is the account/mailbox being attacked, not the network it's attacked
    #     from. This is what actually bounds password guessing, and it holds
    #     even against an attacker rotating IPs.
    #
    # Scopes on endpoints that require authentication (verify-email,
    # resend-verification) are keyed per-user by DRF automatically, so they
    # are unaffected by the NAT concern above.
    "DEFAULT_THROTTLE_RATES": {
        "login": "30/min",                  # per IP (NAT-tolerant)
        "login-account": "10/min",          # per username — the real brute-force bound
        "oauth-login": "30/min",            # per IP; token is signature-verified anyway
        "register": "10/min",               # per IP
        # Per IP, and loose on purpose: the signup form calls this while the
        # user types. The client debounces and caches, and taken verdicts are
        # cached server-side, so real usage sits far below this — but a whole
        # class signing up behind one school NAT must not trip it.
        "username-availability": "120/min",
        "verify-email": "10/min",           # per user — 150 tries per 15min code lifetime, of 1e6
        "resend-verification": "3/min",     # per user
        "password-reset": "10/min",         # per IP
        "password-reset-email": "3/hour",   # per mailbox — anti email-bomb
        "password-reset-confirm": "10/min",  # per IP; tokens are cryptographically strong
        # Per authenticated user (ScopedRateThrottle keys on request.user.pk
        # once authenticated). Every one of these views makes a billed
        # OpenAI call per request — without a limit here, one compromised or
        # malicious account can run up unbounded API spend by looping the
        # endpoint. Rates are generous enough for real chat/voice use (a
        # human sending messages or recording voice notes stays far below
        # them) but bound a scripted loop.
        "ai-assistant": "30/min",   # chat send/regenerate/ask-ai/classify/report generation
        "ai-voice": "20/min",       # STT/TTS proxy calls (voice_benchmark sidecar, itself billed)
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": env("JWT_SECRET"),
}

# Max simultaneously active devices/sessions per account (subscription-sharing
# protection — see apps/users/sessions.py:get_device_limit, the one seam
# where this becomes subscription-tier-dependent later without touching the
# session model or any call site).
MAX_ACTIVE_DEVICES_PER_USER = env.int("MAX_ACTIVE_DEVICES_PER_USER", default=2)


CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)
# Left at their defaults (both False) on purpose: an explicit origin list
# above plus credentials-off is the safe combination. Never set
# CORS_ALLOW_ALL_ORIGINS together with CORS_ALLOW_CREDENTIALS.

# ---------------------------------------------------------------------------
# Transport security
# ---------------------------------------------------------------------------
#
# nginx sets X-Forwarded-Proto on every proxied request (see nginx/nginx.conf)
# and always overwrites whatever the client sent, so trusting it here is safe
# — that last part is the precondition for this setting not being a spoofable
# way to make Django believe a plaintext request was secure.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ⚠️ These default to OFF, and that is deliberate — NOT an oversight.
#
# The deployment currently terminates at nginx on port 80 with no certificate
# (nginx/nginx.conf has no 443 listener). Enabling SECURE_SSL_REDIRECT before
# TLS exists would redirect every request to an https:// URL that nothing is
# listening on: a total outage rather than a hardening. Likewise the *_SECURE
# cookie flags would tell browsers to withhold the admin session/CSRF cookies
# over the only scheme currently available, locking admin out.
#
# Once a certificate and a 443 listener are in place, ALL of these should be
# turned on in the production .env — until then the login credentials and JWTs
# this app issues are travelling in plaintext, which no amount of hashing,
# throttling or token rotation compensates for.
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)

# Origins allowed to submit cookie-authenticated POSTs (Django admin). The API
# itself is JWT-in-header, so it isn't CSRF-exposed, but the admin is.
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

# Where the Django admin is mounted (see config/urls.py). Keep the trailing
# slash. Default matches the historical path so nothing breaks; production
# should override it — the admin login is the one credential form on this
# deployment that no rate limit currently covers.
ADMIN_URL_PATH = env("ADMIN_URL_PATH", default="admin/")

# Hardening that costs nothing to keep explicit. Both are already Django's
# defaults; pinned here so a future settings edit can't silently drop them.
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Deliberately NOT set: SECURE_BROWSER_XSS_FILTER. It emits the legacy
# X-XSS-Protection header, which every current browser ignores and which
# introduced its own vulnerabilities before being removed. A Content-Security
# -Policy is the real control — see nginx/nginx.conf.
# Cookies are not used to carry credentials for the API, but the admin's are,
# and SameSite=Lax blocks them being sent on cross-site requests.
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_HTTPONLY = True

# ---------------------------------------------------------------------------
# OAuth (social login)
# ---------------------------------------------------------------------------

# OAuth client ID from Google Cloud Console (Credentials > OAuth client ID >
# Web application). Used as the `aud` claim checked when verifying Google ID
# tokens submitted by the frontend.
GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")

# Sign in with Apple. All blank by default — Apple's flow requires a real
# HTTPS domain registered with Apple (won't work against localhost at all),
# so these stay unset until that domain exists. See backend/.env.example
# for where to get each value.
APPLE_OAUTH_CLIENT_ID = env("APPLE_OAUTH_CLIENT_ID", default="")  # Services ID, used as the `aud` claim
APPLE_OAUTH_TEAM_ID = env("APPLE_OAUTH_TEAM_ID", default="")
APPLE_OAUTH_KEY_ID = env("APPLE_OAUTH_KEY_ID", default="")
APPLE_OAUTH_PRIVATE_KEY = env("APPLE_OAUTH_PRIVATE_KEY", default="")
APPLE_OAUTH_REDIRECT_URI = env("APPLE_OAUTH_REDIRECT_URI", default="")

SPECTACULAR_SETTINGS = {
    "TITLE": "University Entrance Exam Platform API",
    "DESCRIPTION": (
        "Backend API for an interactive learning platform "
        "helping Armenian students prepare for unified entrance examinations."
    ),
    "VERSION": "0.1.0",
}

# ---------------------------------------------------------------------------
# AI Assistant
# ---------------------------------------------------------------------------

# Which provider AIService dispatches to: mock | ollama | openai | anthropic.
AI_PROVIDER = env("AI_PROVIDER", default="mock")

# How many recent messages PromptBuilder includes as conversation history.
AI_ASSISTANT_HISTORY_WINDOW = env.int("AI_ASSISTANT_HISTORY_WINDOW", default=20)

# Attachment upload limits.
AI_ASSISTANT_MAX_ATTACHMENT_SIZE_MB = env.int("AI_ASSISTANT_MAX_ATTACHMENT_SIZE_MB", default=15)

# Flashcard image/audio upload limits.
FLASHCARDS_MAX_IMAGE_SIZE_MB = env.int("FLASHCARDS_MAX_IMAGE_SIZE_MB", default=5)
FLASHCARDS_MAX_AUDIO_SIZE_MB = env.int("FLASHCARDS_MAX_AUDIO_SIZE_MB", default=15)

OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
OPENAI_MODEL = env("OPENAI_MODEL", default="gpt-5.4-mini")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
OLLAMA_BASE_URL = env("OLLAMA_BASE_URL", default="http://localhost:11434")
OLLAMA_MODEL = env("OLLAMA_MODEL", default="qwen3:8b")
OLLAMA_TIMEOUT_SECONDS = env.int("OLLAMA_TIMEOUT_SECONDS", default=120)
# Bounded because AI calls happen inside page requests (the daily study plan
# narrates itself during the first GET of the day). The SDK default is 600s.
OPENAI_TIMEOUT_SECONDS = env.int("OPENAI_TIMEOUT_SECONDS", default=45)
OLLAMA_THINK = env.bool("OLLAMA_THINK", default=False)

# Armenian voice (STT/TTS) sidecar service — see voice_benchmark/ at the repo
# root. Kept as a separate lightweight HTTP service (same pattern as Ollama
# above) so torch/ctranslate2/faster-whisper never get installed into the
# Django image; Django just proxies audio to/from it.
VOICE_SERVICE_URL = env("VOICE_SERVICE_URL", default="http://localhost:8100")
VOICE_SERVICE_TIMEOUT_SECONDS = env.int("VOICE_SERVICE_TIMEOUT_SECONDS", default=120)

# ---------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")
BACKEND_URL = env("BACKEND_URL", default="http://localhost:8000")

EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Gitus <noreply@gitus.local>")

# ---------------------------------------------------------------------------
# Teacher-student system
# ---------------------------------------------------------------------------

# Default max number of accepted students per teacher, used when a
# TeacherProfile doesn't set its own override. Will become plan-dependent
# once subscriptions exist — kept here (not hardcoded in the model/view) so
# that day can come without a schema change.
TEACHER_DEFAULT_STUDENT_LIMIT = env.int("TEACHER_DEFAULT_STUDENT_LIMIT", default=20)

# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

CHAT_MAX_ATTACHMENT_SIZE_MB = env.int("CHAT_MAX_ATTACHMENT_SIZE_MB", default=20)

# ---------------------------------------------------------------------------
# Help center
# ---------------------------------------------------------------------------

# Support-ticket attachment limit (see apps/helpcenter/validators.py).
HELPCENTER_MAX_ATTACHMENT_SIZE_MB = env.int("HELPCENTER_MAX_ATTACHMENT_SIZE_MB", default=20)

