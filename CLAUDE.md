# Haygit

An interactive exam-prep platform for Armenian university entrance exams (the Unified Entrance Examinations). Students prepare through subject practice, timed full-length mock exams, spaced-repetition flashcards, an AI tutor, and gamified/social study features. Teachers and parents get their own dashboards. All student-facing UI is in Armenian.

Full product framing lives in [Readme.md](Readme.md). This file is working context for any agent (human-directed or scheduled/cloud) picking up work in this repo.

## Tech stack

- **Backend**: Django 5.0 + DRF, JWT auth (SimpleJWT), Channels/Daphne (ASGI) for WebSockets, Postgres.
- **Frontend**: React + TypeScript, Vite, Tailwind CSS v4, react-router-dom v7. No Redux/Zustand — plain Context + hooks. No React Query/SWR — raw axios calls in `src/api/*.ts`.
- **Realtime**: native WebSocket (no socket.io) for chat, live multiplayer quiz games, and notification pings.
- **Native shell**: Capacitor wraps the same web app for iOS (`ios-native/` in some worktrees has a separate SwiftUI rebuild in progress).
- **Deployment**: Docker Compose, two independent stacks (dev vs. LAN prod) — see [Readme.md](Readme.md) for the full breakdown and data-safety rules around `docker compose down -v`.

## Dev workflow gotchas

- **Backend does not hot-reload.** Daphne (ASGI) needs a manual restart after every backend Python change: `docker restart haygit-backend-1`.
- **Frontend hot-reloads** via Vite — no restart needed.
- Host-installed npm packages don't reach the frontend container's `node_modules` — install inside the container too, or new deps 500 the dev server.
- Exam/flashcard question banks are JSON files under `backend/apps/*/data/`, imported via `manage.py import_mock_exams` / equivalent — JSON is the source of truth, imports are idempotent upserts by ID.

## Backend apps (`backend/apps/`)

**Core learning content**
- `practice` — question bank hierarchy (Subject → Domain → Topic → Subtopic → Question) and student attempts.
- `mock_exams` — full-length timed practice exams (questions, attempts, autosave, results).
- `flashcards` — spaced-repetition decks (library + user-owned).
- `knowledge` — recency-weighted subject/subtopic mastery scoring, consumed by `profiles`/`study_plan`/`teaching`.
- `mistakes` — cross-app wrong-answer ledger feeding review queues and coach insights.

**AI / study planning**
- `ai_assistant` — LLM tutor chat (conversations, messages, tool calls, voice), dispatches to OpenAI/Anthropic/Ollama/mock via `AIService`.
- `study_plan` — daily personalized plan, deterministic candidate-picking + optional AI narration.

**Progress, gamification & social**
- `profiles` — central student profile, analytics dashboards (mastery, Learning DNA, Academic Power, growth, coach, heatmap), goals, achievements.
- `rankings` — monthly XP leaderboards (global/school/class/subject/friends), rank history, season trophies.
- `streaks`, `activity` — daily streak tracking; study-session heartbeats feeding time-spent metrics everywhere.
- `games`, `challenges` — live multiplayer quiz rooms + matchmaking; 1v1 friend challenges on top of `games`.
- `friends`, `study_groups` — friend requests/blocking; user-created study groups.

**Communication**: `chat` (DM/group messaging, WebSocket, cursor-paginated), `calls` (voice/video rooms tied to study groups), `notifications` (in-app feed + WS refresh ping).

**Teaching & guardianship**: `teaching` (teacher↔student connections, assignments, class analytics), `parents` (parent↔child linking, parent-facing notifications, learning goals).

**Productivity**: `todo`, `notes` (rich-text, Tiptap on the frontend, folders + soft-delete), `notepad` (single scratchpad).

**Platform**: `users` (auth, OAuth, device/session limits, School/University), `helpcenter` (articles + support tickets).

`config/settings.py` — DRF global `PageNumberPagination` (page size 20), JWT auth, `LocMemCache` (single-process — flagged in settings.py as needing Redis before scaling past one worker), in-memory Channels layer (same caveat).

## Frontend structure (`frontend/src/`)

Routing is defined in [App.tsx](frontend/src/App.tsx): 6 auth pages load eagerly, everything behind `ProtectedRoute` is `React.lazy()`-split. Main areas: practice, mock exams, flashcards, mistake notebook, AI assistant, chat, notes/notepad, todo, games/matchmaking/rankings, study groups, teacher/parent dashboards, profile/account/settings, help center.

State: Context + hooks per feature (`AuthContext`, `ToastContext`, `ChatWidgetContext`, `NotepadContext`, `AssistantLaunchContext`) — no global store. Data fetching is raw axios per-domain modules in `src/api/*.ts`, called from `useEffect` — **no caching/dedup layer** (see Known follow-ups below). Real-time hooks (`useChatSocket`, `useGameSocket`, `useNotificationSocket`) use native WebSocket with exponential-backoff reconnect — this pattern is solid, copy it rather than re-inventing.

## Coding standards: keep it scalable and optimal

These are checks to actively apply — not just avoid regressions on the fixes already made (see below), but on any new code:

**Backend (Django/DRF)**
- Never loop DB writes/reads per item in a request handler — batch with `bulk_create`/`bulk_update`/`in_bulk` instead of `update_or_create`/`.create()` inside a `for`.
- Any list endpoint must be paginated (inherit DRF's global `PageNumberPagination` via `generics.ListAPIView`, or explicitly justify `pagination_class = None`).
- Add `Meta.indexes` for any field combination a view filters or orders on beyond a bare FK (composite filters like `(user, status)` or `(user, -created_at)` need their own index).
- Prefetch: if a serializer nests a reverse FK relation (`obj.foo.all()` inside `get_x` or a nested serializer), the view must `prefetch_related` it.
- Don't compute the same expensive helper (e.g. `growth()`, `_weakest_topic_mistake()`) twice in one request — compute once, thread it through as an optional param.
- Cache framework (`django.core.cache`) exists and works (`LocMemCache` today) — use it for anything expensive and shared/rarely-changing (leaderboards, cross-user dashboards), but preserve any per-request side effects (notifications, history snapshots) when adding a cache layer around a view.
- Prefer DB-side aggregation (`annotate`/`aggregate`/`ExpressionWrapper`) over fetching rows and reducing in Python.

**Frontend (React/TS)**
- Any Context `value={...}` passed to a `Provider` must be `useMemo`'d (and its handler props `useCallback`'d) — an unmemoized value re-renders every consumer on every provider re-render. `ChatWidgetContext` is the reference pattern already in the codebase.
- New top-level pages should be `React.lazy()`-imported in `App.tsx`, not statically imported, unless they're on the unauthenticated critical path (login/register/etc.).
- Anything invoking real per-render work (KaTeX rendering, heavy formatting) inside a `.map()` should be memoized per item, not re-run on every parent re-render.
- No new page-level state library without discussion — this app deliberately has no Redux/React-Query; if a page needs shared cross-navigation caching, that's a repo-wide decision, not a one-off.
- Long lists (100+ items) should consider virtualization; short/paginated lists (exam questions, chat pages) don't need it — check what's already there before adding a dependency.

## Optimization pass — 2026-08-18

A full-repo audit + safe-fix pass was done this date. Fixed in the same session:

**Backend**: deduped `growth()`/`_weakest_topic_mistake()` double-computation in `apps/profiles/analytics.py` + `views.py` (`ProfileAnalyticsView`, `HomeInsightView`); moved `personal_records()`'s longest-session calc from a Python loop to a DB query; `apps/flashcards/views.py` `DeckDuplicateView` now `bulk_create`s cards instead of one `INSERT` per card; `apps/helpcenter/views.py` `TicketDetailView` now `prefetch_related`s messages/attachments (was N+1); added missing composite indexes on `StudentNotification(user,-created_at / is_read)`, `ChallengeInvite(receiver,status / sender,status)`, `StudyGroup(subject,type)`.

**Frontend**: memoized `AuthContext`, `AssistantLaunchContext`, `NotepadContext` provider values (were causing app-wide re-renders); memoized per-segment KaTeX rendering in `MathText`; converted ~45 protected-route pages in `App.tsx` to `React.lazy()` (confirmed via build output: KaTeX ~259KB, recharts ~354KB+, and the Tiptap-based notes editor ~409KB are now separate chunks, not part of every page's initial bundle); added `loading="lazy"`/`decoding="async"` to flashcard/chat/notes content images.

Verified: 125 backend tests pass, `makemigrations --check` clean, 47 frontend tests pass, `tsc -b` clean, production build succeeds.

**Known follow-ups (deliberately not auto-applied — need a design decision or coordinated frontend+backend change):**
- `apps/practice/views.py` `SubmitTierView` and `apps/mock_exams/views.py` `SaveDraftView` do per-answer `update_or_create` in a loop on hot write paths (practice submit, exam autosave) — worth a batched-upsert rewrite, but needs care around partial-failure semantics.
- `apps/rankings/views.py` leaderboards recompute from scratch on every request with no caching, despite `LocMemCache` being available — caching is valuable here but the view has per-user side effects (rank-history snapshotting, season-ending notifications) that must survive a caching layer correctly, so this needs a deliberate design, not a mechanical wrap.
- `apps/parents/services.py` `build_child_dashboard` (shared with the friend-profile view) recomputes 8 analytics builders per call — same caching opportunity, same "needs invalidation design" caveat.
- `apps/helpcenter/views.py` `TicketListCreateView` and `apps/notes/views.py` `DocumentListCreateView` return unpaginated lists — the frontend (`listTickets()`, `listDocuments()` in `src/api/*.ts`) types these as bare arrays, so enabling pagination would break parsing until the frontend is updated in the same change.
- No React Query/SWR — every navigation re-fetches from scratch with no cross-page cache. Worth adopting for high-traffic read endpoints (profile, rankings, subjects) but it's a repo-wide dependency decision, not a one-off fix.
- Chat message list (`ConversationView`) isn't virtualized — low priority, already mitigated by real pagination/infinite-scroll.
