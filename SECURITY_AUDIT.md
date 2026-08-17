# Security hardening pass — 2026-08-16

Full-stack audit of the Django REST Framework backend and React/Vite frontend.
Scope: authentication, settings, every DRF view, WebSocket auth, file uploads,
frontend XSS, dependencies, and secret hygiene.

**Verification:** 401 backend tests pass (10 new security regression tests
added), frontend builds clean with TypeScript, 6 frontend tests pass, nginx
config validated with `nginx -t`, and the login throttle was confirmed firing
against the live running app.

---

## Answer to the original question: SQL injection

**Your own code is clean.** There is no raw SQL anywhere in the backend — no
`.raw()`, no `cursor.execute()`, no `.extra()`, no `RawSQL`. Every query goes
through the Django ORM, which parameterises values automatically.

**But your Django version has four known SQL injection CVEs.** Django 5.0.6
(released May 2024) is long past end-of-life. `pip-audit` reports **81 known
vulnerabilities across 8 packages**. The SQLi ones are:

| Advisory | Issue | Fixed in |
|---|---|---|
| PYSEC-2024-70 | `QuerySet.values()`/`values_list()` on JSONField, via crafted JSON key | 5.0.8 |
| PYSEC-2024-157 | `HasKey` lookup on **Oracle** | 5.0.10 |
| PYSEC-2025-105 | `FilteredRelation` column aliases via `**kwargs` | 5.2.6 |
| PYSEC-2025-108 | `filter()`/`exclude()`/`get()`/`Q()` via `**kwargs` dict expansion | 5.2.8 |

I checked whether each is reachable in your code. **None currently are:**

- `FilteredRelation` is never used.
- The only `**{...}` expansions (`apps/users/serializers.py:173`,
  `apps/users/views.py:118`) take keys from the hardcoded two-entry
  `PROVIDER_ID_FIELDS` map — user input selects *which* literal key, it never
  supplies a key.
- Every `values_list()` argument is a string literal.
- You run PostgreSQL, so the Oracle-only one does not apply.

So you are not exploitable today — but you are one refactor away from it, and
this is only 4 of 81 known issues. **Upgrading Django is the single highest-value
action on this list.**

---

## CRITICAL — needs your decision

### 1. No TLS anywhere in production

`nginx/nginx.conf` listens on port **80 only**. There is no 443 listener, no
certificate, no redirect. Every password, JWT, and chat message crosses the
network in cleartext. Anyone on the same Wi-Fi as a student can read
credentials directly.

This defeats essentially every other control in this report — password hashing,
token rotation, and rate limiting are all bypassed by simply reading the wire.

I wired up all the Django-side HTTPS settings but **deliberately left them
OFF**, because enabling `SECURE_SSL_REDIRECT` before a certificate exists would
redirect every request to an `https://` URL nothing is listening on — a total
outage, not a hardening.

**Your action:** obtain a certificate, add a 443 listener, then set these in the
production `.env` (documented in `backend/.env.example`):

```
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
```

Verify with `python manage.py check --deploy` — I confirmed these four env vars
clear all four remaining warnings.

### 2. Dependencies: 81 known vulnerabilities

| Package | Installed | Latest | Notes |
|---|---|---|---|
| Django | 5.0.6 | 6.1 | EOL; 4 SQLi CVEs (unreachable today) |
| Pillow | 10.2.0 | 12.3.0 | ~20 CVEs; **processes user-uploaded images** |
| cryptography | 43.0.0 | 50.0.0 | 8 advisories |
| PyJWT | 2.9.0 | 2.13.0 | 11 advisories; **signs your auth tokens** |
| djangorestframework | 3.15.1 | 3.18.0 | |
| djangorestframework-simplejwt | 5.3.1 | 5.5.1 | |

Pillow and PyJWT are the most exposed: Pillow parses attacker-supplied image
bytes (avatars, flashcards), and PyJWT validates every auth token.

Frontend `npm audit`: 4 vulnerabilities (3 high, 1 moderate). The react-router
one is RSC-mode CSRF — you use client-side routing, so it does not apply.
`npm audit fix` resolves all four.

**Your action:** upgrade in a branch and run the suite. I did not do this
because a major Django upgrade (5.0 → 6.1) needs its own testing cycle and
would have obscured the security changes in this pass.

---

## HIGH — fixed

### 3. No rate limiting on any authentication endpoint
**Fixed.** Login, register, email verification, resend, password reset, OAuth,
and the ticket-based session endpoints were all unthrottled — unlimited password
guessing and unlimited email-bombing.

The design matters here. A naive per-IP limit would be wrong for this app:
students sit behind a school's single NAT gateway, so a tight per-IP cap locks
out a whole classroom at 9am. So there are two complementary limits:

- **Per-IP** (loose, NAT-tolerant) — bounds one client spraying many accounts.
- **Per-account / per-mailbox** (tight, `apps/users/throttling.py`) — bounds
  guessing against one account, and *survives IP rotation*, which is what
  actually stops a distributed brute force.

Live-verified against the running app: the 11th attempt on one account returns
429, while a different account from the same IP still authenticates normally.

### 4. Revoked devices kept live WebSocket access
**Fixed.** `apps/games/auth_middleware.py` validated the JWT's signature and
expiry but never checked the `session_id` claim — unlike the REST path's
`SessionAwareJWTAuthentication`. Its docstring even claimed parity ("a token
rejected by the REST API is rejected here too"), which was false.

Impact: logging out or revoking a device did **not** cut off its WebSocket
connections. A device you kicked off kept receiving chat messages,
notifications, and game state in realtime for up to 30 minutes. This also
partially bypassed the subscription-sharing device limit.

### 5. Support-ticket uploads had no validation at all
**Fixed.** `apps/helpcenter/services/tickets.py` accepted any file, of any
size, and recorded the client-supplied `content_type` verbatim. Every other
upload path (chat, notes, flashcards, AI assistant) validates properly.

Uploads land in `MEDIA_ROOT`, which nginx serves at `/media/` **on the app's own
origin** — so an uploaded `.html` or `.svg` was stored XSS running with your
origin, able to read the JWTs in `localStorage`. That is account takeover.

Added `apps/helpcenter/validators.py` matching the existing pattern: extension
allowlist, size cap, and real MIME sniffed from the bytes with libmagic (so
renaming `evil.html` to `evil.png` does not get it in). Five regression tests.

### 6. Django admin is unthrottled and at a guessable path
**Partially fixed — needs your action.** The admin login is plain Django auth,
so none of the DRF throttles above cover it. Password guessing against
superuser accounts is unbounded, and it is publicly proxied at the default
`/admin/`.

I made the path configurable via `ADMIN_URL_PATH` (default unchanged, so
nothing breaks) and decoupled the Docker healthcheck from it — it previously
probed `/admin/login/`, so moving the admin would have silently broken the
healthcheck and caused a restart loop.

**Your action:** set `ADMIN_URL_PATH` to something non-obvious in production,
and ideally restrict the `/admin/` location in nginx to known IPs. For real
protection add `django-axes` (lockout after N failures).

---

## MEDIUM

### 7. `/media/` is served with no authentication
**Flagged — architectural, not fixed.** nginx serves `MEDIA_ROOT` directly,
bypassing Django entirely. Chat's own `AttachmentSerializer` comment states the
intent — download URLs point at an authenticated view so it can *"enforce
'participants only' on every download instead of relying on an unguessable
path"* — but the same bytes are simultaneously readable at `/media/<path>` by
anyone, with no login.

In practice the paths contain `uuid4()`, so they are unguessable rather than
enumerable — the protection is a capability URL, not access control. Once such
a URL leaks (forwarded, logged, in a Referer header) it is public forever.

Exception: avatars are `avatars/user_{id}.{ext}` — **directly enumerable**.
Low impact, since avatars are shown to other users anyway.

**Recommended fix:** serve media through Django using nginx `X-Accel-Redirect`,
so the permission check runs on every request. This is a real architectural
change, so I did not make it unilaterally.

**Mitigated meanwhile:** I added `X-Content-Type-Options: nosniff` and
`Content-Security-Policy: default-src 'none'; sandbox` to the `/media/`
location. The `sandbox` directive only applies to responses loaded *as
documents*, so inline images, avatars, and voice messages are unaffected, but
any HTML/SVG that slips past validation is rendered inert and origin-less.

### 8. Call rooms were readable by non-members
**Fixed.** `apps/calls/views.py` let any authenticated user read any call room
by id, and list any group's calls via `?study_group=`. A room's participant
list is exactly who is on a video call right now.

The service layer already required study-group membership to *create* or *join*
a call — only the read path was missing it, so this was an inconsistency rather
than a deliberate design. Now scoped via an `EXISTS` subquery (deliberately not
a join, which would have multiplied the rows `Count("participants")` aggregates
over and inflated the count — there is a regression test for exactly that).

Joining a call was **never** vulnerable — `register_for_call` always enforced
membership. Five regression tests added.

### 9. WebSocket requests lost their client IP and Host at the proxy
**Fixed.** In `nginx/nginx.conf`, the `/ws/` location defined its own
`proxy_set_header` directives. nginx inherits those from the parent level *only
when the current level defines none* — so the two Upgrade/Connection headers
silently discarded all four server-level headers. WebSocket requests reached
Django with no `Host`, no `X-Forwarded-For`, and no `X-Forwarded-Proto`,
breaking `ALLOWED_HOSTS` matching and making every socket appear to originate
from the nginx container.

### 10. Verification codes used a non-cryptographic RNG
**Fixed.** `apps/users/emails.py` used `random.randint`, whose output is
predictable from observed values. Now `secrets.randbelow`. Combined with the new
per-user throttle, a 6-digit code allows ~150 guesses out of 1,000,000 within
its 15-minute lifetime.

### 11. HTML injection on KaTeX error paths
**Fixed.** `MathInline.tsx` and `OrbitField.tsx` fell back to injecting the raw
input via `dangerouslySetInnerHTML` when KaTeX threw. Now the fallback renders
escaped text. Not currently exploitable (notes have no sharing model, so it was
self-XSS only), but an error path must never be an injection point.

---

## LOW / accepted

### 12. Signup reveals whether a username or email is taken
**Not changed — your call.** `apps/users/serializers.py` returns "this username
is taken" plus suggestions. This is an account-enumeration oracle, but it is
also a genuinely better signup experience, and the suggestions feature depends
on it. Given students choose usernames, I judged the UX worth more than the
marginal privacy gain. Say the word and I will soften it.

Note the password-reset endpoint is correctly designed — it returns the same
generic message whether or not the account exists, and I made sure the new
throttle keys on the *submitted* address so a 429 does not become an
enumeration oracle either (there is a test for this).

### 13. JWTs in `localStorage`
**Reviewed — recommend keeping, with eyes open.** Tokens live in
`localStorage` (`frontend/src/api/client.ts`), so any XSS anywhere in the app
hands over live credentials.

I audited the whole XSS surface: no `eval`, no `innerHTML`, markdown renders
without `rehype-raw`, all four `dangerouslySetInnerHTML` uses are either KaTeX
output (safe — `trust` defaults to false, so `\href` cannot emit `javascript:`)
or admin-authored dataset content, redirects are hardcoded literals, and
`video_url` is a Django `URLField` that rejects `javascript:` at validation.
The surface is genuinely small, and I closed the two error-path gaps (#11).

Moving to httpOnly cookies would be a significant change (CSRF protection
becomes necessary, and the WebSocket `?token=` handshake and SSE streaming
paths both read the token from JS). My recommendation is to keep
`localStorage` and instead add a **Content-Security-Policy** to the SPA — that
is the control that actually reduces this risk. It needs care to not break
Google/Apple OAuth and KaTeX, so it deserves its own focused pass.

---

## Verified clean

- **No raw SQL anywhere** — every query is ORM/parameterised.
- **No SSRF** — all outbound URLs are hardcoded or from settings; user input
  only reaches query params, never the host.
- **No mass assignment** — no serializer exposes `is_staff`/`is_superuser`;
  every `user`/`owner` field is explicitly `read_only=True`.
- **No `AllowAny` endpoints outside the auth app**; global default is
  `IsAuthenticated`.
- **No unscoped user-owned querysets** — the four unscoped ones are shared
  catalog content (exams, learning material, achievements) and leaderboards.
- **No secrets ever committed** — the one historical `frontend/.env` contained
  only `VITE_API_URL=http://localhost:8000/api`. `.env` files are gitignored,
  and all four `VITE_` vars are public config (OAuth *client* IDs).
- **No seeded superusers or hardcoded credentials** in fixtures or commands.
- **Password hashing** is Django's default PBKDF2 with all four validators.
- **Upload validation** in chat/notes/flashcards/AI assistant correctly sniffs
  real MIME types rather than trusting the client.

---

## Files changed

**Backend**
- `config/settings.py` — throttle rates, explicit CACHES, transport-security
  settings, `CSRF_TRUSTED_ORIGINS`, `ADMIN_URL_PATH`, helpcenter upload limit
- `config/urls.py` — configurable admin path
- `apps/users/throttling.py` *(new)* — identity-keyed throttles
- `apps/users/views.py` — throttles on every auth endpoint
- `apps/users/emails.py` — `secrets` instead of `random`
- `apps/games/auth_middleware.py` — WebSocket session revocation check
- `apps/helpcenter/validators.py` *(new)* + `services/tickets.py` — upload validation
- `apps/calls/views.py`, `services.py` — membership-scoped call visibility
- `Dockerfile` — healthcheck decoupled from admin path
- `.env.example` — documented production security settings
- Tests: `users` (+5), `games` (+4), `calls` (+5), `helpcenter` (+5)

**Frontend**
- `components/notes/editor/MathInline.tsx`, `components/subjects-universe/OrbitField.tsx`
  — safe KaTeX error fallbacks

**Infrastructure**
- `nginx/nginx.conf` — `/media/` hardening headers, `/ws/` proxy header fix

---

## Recommended order

1. **TLS** — everything else is theatre without it.
2. **Upgrade dependencies** — Pillow and PyJWT first, then Django.
3. **Protect the admin** — set `ADMIN_URL_PATH`, add IP allowlist or django-axes.
4. **Add a CSP** to the SPA — the real mitigation for `localStorage` tokens.
5. **Serve `/media/` through Django** via `X-Accel-Redirect`.
