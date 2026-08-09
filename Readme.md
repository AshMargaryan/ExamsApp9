# Project

An interactive learning platform designed to help students in Armenia prepare for university entrance examinations.

## Overview

The goal of this project is to provide accessible, high-quality exam preparation resources for students preparing for the Unified Entrance Examinations. The platform focuses on structured learning, independent study, and continuous practice through interactive content and assessments.

## Planned Features

* Subject-specific learning modules
* Chapter-based practice exercises
* Detailed explanations and solutions
* Progress tracking and performance analytics
* Timed mock examinations
* Personalized recommendations based on student performance
* Question bank organized by topic and difficulty
* Review mode for previously answered questions

## Vision

Many students rely heavily on private tutors to prepare for entrance examinations. This platform aims to make effective exam preparation more accessible by providing a comprehensive self-study environment with guided learning and extensive practice opportunities.

## Target Audience

* High school students in Armenia
* Students preparing for Unified Entrance Examinations
* Independent learners seeking structured exam preparation

## Development Status

This project is currently in early development.

## Future Possibilities

While the initial focus is on Armenian entrance examinations, the platform may later expand to support additional standardized tests and educational content.

## Tech Stack

To be determined.

## Running with Docker

Two Compose files exist, for two different purposes — use the one matching what you're doing:

| File | Purpose | Frontend | Backend | Public entry point |
|---|---|---|---|---|
| `docker-compose.yml` | Local development | Vite dev server (HMR), bind-mounted source | `dev` target, bind-mounted source | `localhost:3000` / `localhost:8000` directly |
| `docker-compose.prod.yml` | Raspberry Pi / LAN deployment | `prod` target (built static bundle) | `prod` target (no bind mounts, runs as non-root) | `nginx` on port 80 |

### Local development

```bash
docker compose up --build
```

Frontend at `http://localhost:3000`, backend/API at `http://localhost:8000`. Edits to `backend/` or `frontend/` are picked up live via bind mounts.

### Production-style deployment (Raspberry Pi / LAN)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

This builds the `prod` Dockerfile targets, runs an `nginx` reverse proxy as the **only** service published to the host (port 80), and does **not** publish the backend (8000) or Postgres (5432) ports to the host — both are reachable only from other containers on the internal Docker network, by service name (`backend`, `db`).

Then visit `http://<the-Pi's-LAN-IP>/` from any device on the same network. No IP is hardcoded anywhere in the compose file or the frontend build — the frontend is built with a relative `VITE_API_URL=/api`, so it (and the WebSocket URLs derived from it) resolve against whatever host/IP the browser used to reach nginx.

**First boot takes several minutes**, not seconds: the backend's entrypoint runs migrations and seeds the full mock-exam/flashcard question bank into an empty database before Daphne starts answering requests (`docker compose -f docker-compose.prod.yml logs -f backend` to watch progress). This is a one-time cost — subsequent restarts skip seeding since the tables are no longer empty.

To stop the stack: `docker compose -f docker-compose.prod.yml down` (add `-v` to also delete the Postgres/media volumes — do **not** do this on a real deployment unless you intend to lose all data).

**Note on Compose project isolation:** `docker-compose.prod.yml` pins an explicit `name: examsapp9-prod` at the top of the file. This keeps its containers, network, and volumes (`examsapp9-prod-*`) completely separate from the dev stack's (`examsapp9-*`) even when both files live in the same directory — without it, both files resolve to the same default project name and would collide on container names and the `postgres_data` volume.

#### Required `.env` changes for a LAN deployment

`backend/.env` and `frontend/.env` are gitignored and per-machine — copy from the `.env.example` files and set real secrets on the Pi. A few values need LAN-appropriate settings that differ from the dev defaults:

* `backend/.env`: set `DEBUG=False` and `ALLOWED_HOSTS=*` (the Pi's LAN IP isn't known in advance and can change networks — see `docker-compose.prod.yml`'s VITE_API_URL comment for the same reasoning applied on the frontend side). Tighten `ALLOWED_HOSTS` to a real hostname once this moves off a raw LAN test.
* `frontend/.env` is **not** used by the prod build — `VITE_API_URL`/`VITE_GOOGLE_CLIENT_ID`/etc. are instead passed as Docker build args in `docker-compose.prod.yml`, sourced from your shell environment (`VITE_GOOGLE_CLIENT_ID`, etc.) rather than the `.env` file, since Vite bakes them into the JS bundle at build time.

### How requests flow (production compose)

* **HTTP** `http://<pi-ip>/` → `nginx` → `/api/`, `/admin/`, `/static/` go to `backend:8000`; `/media/` is served directly by nginx from a volume shared with the backend; everything else goes to `frontend:80` (the frontend container's own nginx, serving the built React SPA with client-side routing fallback).
* **WebSocket** `ws://<pi-ip>/ws/...` (chat, game rooms, notifications — see `backend/config/asgi.py`) → `nginx` (`/ws/` location, upgrades the connection with generous read/send timeouts for long-lived sockets) → `backend:8000` (Daphne/Channels).

## License

To be determined.
