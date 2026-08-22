# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage: base
# Shared foundation for both the builder and the final runtime images.
# Keeping this separate means the *runtime* system packages (what stays in
# the final image) are declared once, distinct from *build-time* packages
# (compilers, headers) which never leave the builder stage.
# ---------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS base

# PYTHONDONTWRITEBYTECODE: skip .pyc files — irrelevant in a container that's
#   rebuilt from source every time, and avoids write-noise in mounted volumes.
# PYTHONUNBUFFERED: flush stdout/stderr immediately, so `docker compose logs`
#   shows Django/Daphne output as it happens instead of buffered in chunks.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Runtime-only system dependencies:
#  - libmagic1: required by the `python-magic` package (apps.ai_assistant
#    attachment type sniffing) at import time, not just build time.
#  - libpq5: the PostgreSQL client library psycopg2 links against at runtime.
#  - curl: used by the container HEALTHCHECK to hit Daphne's HTTP port.
#  - ffmpeg: remuxes chat voice-message WebM blobs on upload (see
#    apps.chat.validators.finalize_webm_container) — Firefox's MediaRecorder
#    leaves the Matroska Segment size unknown/unfinalized (a live-stream
#    marker), which Chrome's own <audio> element can't reliably play back
#    even though the audio bytes are valid; `ffmpeg -c copy` losslessly
#    rewrites the container with a known size, matching what Chrome's own
#    recorder already produces.
# --no-install-recommends keeps this layer small; we don't need suggested
# extras (docs, man pages) inside a container.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libpq5 \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Stage: builder
# Compiles Python dependencies into wheels. This stage is discarded after
# the build — none of its build-essential/gcc/headers weight ends up in the
# final image. This is the single biggest lever for image size here, and it
# also matters for Raspberry Pi: psycopg2-binary/Pillow ship prebuilt wheels
# for manylinux_aarch64, but if a future dependency doesn't, this stage has
# the compiler toolchain to build it from source instead of failing.
# ---------------------------------------------------------------------------
FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt first — Docker caches this layer by file hash.
# As long as requirements.txt is unchanged, `pip wheel` is skipped on
# rebuilds even if application code changed. This is the layer-caching
# pattern requirement #10 asks for.
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---------------------------------------------------------------------------
# Stage: dev
# Used by docker-compose.yml for local development. Source code is NOT
# copied here — it's bind-mounted at `docker run` time (see compose file),
# so editing a .py file on the host is reflected instantly without a
# rebuild. Only dependencies are baked in, since those change rarely.
# ---------------------------------------------------------------------------
FROM base AS dev

COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

# /api/auth/schools/ is AllowAny and always returns 200, so it works as a
# liveness probe without needing a dedicated /health/ endpoint. This tells
# Docker (and `depends_on: condition: service_healthy` in other services,
# should we add any that depend on backend) whether Daphne is actually
# answering HTTP requests, not just whether the process exists.
#
# Deliberately NOT /admin/login/: the admin is mounted at a configurable path
# now (settings.ADMIN_URL_PATH), so probing it would turn moving the admin —
# a hardening step — into a silently failing healthcheck and an endlessly
# restarting container.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/auth/schools/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]

# ---------------------------------------------------------------------------
# Stage: prod
# Self-contained image: no bind mounts expected, code is baked in, runs as
# a non-root user. This is what you'd actually deploy to a server/Pi that
# isn't your dev machine.
# ---------------------------------------------------------------------------
FROM base AS prod

COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY . .
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Run as a non-root user — a container escaping to root inside is still
# worse than one running as an unprivileged UID. Django/Daphne never need
# root; the only thing that did (apt-get) already ran as root above.
#
# mkdir media explicitly: MEDIA_ROOT (config/settings.py) has no
# corresponding directory in source control (user uploads aren't
# committed), so nothing would create it before this chown. That matters
# because docker-compose.prod.yml mounts a named volume at /app/media —
# if the mount point doesn't already exist with app:app ownership at
# image-build time, Docker creates it owned by root on first mount, and
# every upload (avatars, chat/AI-assistant/flashcard attachments) would
# fail with a permission error under the unprivileged USER app below.
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p /app/media \
    && chown -R app:app /app
USER app

EXPOSE 8000

# start-period is generous (not 15s like the dev stage) because the prod
# entrypoint runs migrate + all seed_*_if_empty commands + collectstatic
# before Daphne ever binds the port — on an empty database that's several
# minutes (verified: ~4 min on a dev machine importing the full mock-exam
# bank), and slower still on a Raspberry Pi. Subsequent restarts are fast
# (seed commands are no-ops once the tables aren't empty), but Compose's
# `depends_on: condition: service_healthy` (see docker-compose.prod.yml)
# needs to survive that one-time first-boot cost without the container
# ever hitting a false "unhealthy".
HEALTHCHECK --interval=30s --timeout=5s --start-period=10m --retries=3 \
    CMD curl -f http://localhost:8000/api/auth/schools/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]