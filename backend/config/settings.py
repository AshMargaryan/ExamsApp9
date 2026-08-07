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
    "apps.parents",
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

# In-memory channel layer: correct and simple for a single-process deployment
# (which is what this app runs today). If this ever scales to multiple
# worker processes/machines, swap this for channels_redis's RedisChannelLayer
# so group broadcasts reach every process, not just the one that sent them.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
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
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Media files (user uploads — currently just AI assistant attachments).
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": env("JWT_SECRET"),
}


CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)

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

# Which provider AIService dispatches to: mock | ollama | openai | anthropic | gemini.
AI_PROVIDER = env("AI_PROVIDER", default="mock")

# How many recent messages PromptBuilder includes as conversation history.
AI_ASSISTANT_HISTORY_WINDOW = env.int("AI_ASSISTANT_HISTORY_WINDOW", default=20)

# Attachment upload limits.
AI_ASSISTANT_MAX_ATTACHMENT_SIZE_MB = env.int("AI_ASSISTANT_MAX_ATTACHMENT_SIZE_MB", default=15)

# Flashcard image/audio upload limits.
FLASHCARDS_MAX_IMAGE_SIZE_MB = env.int("FLASHCARDS_MAX_IMAGE_SIZE_MB", default=5)
FLASHCARDS_MAX_AUDIO_SIZE_MB = env.int("FLASHCARDS_MAX_AUDIO_SIZE_MB", default=15)

OPENAI_API_KEY = env("OPENAI_API_KEY", default="")
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
OLLAMA_BASE_URL = env("OLLAMA_BASE_URL", default="http://localhost:11434")
OLLAMA_MODEL = env("OLLAMA_MODEL", default="qwen3:8b")
OLLAMA_TIMEOUT_SECONDS = env.int("OLLAMA_TIMEOUT_SECONDS", default=120)
OLLAMA_THINK = env.bool("OLLAMA_THINK", default=False)

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

