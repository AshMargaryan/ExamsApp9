# AI Assistant — Audit (Prompt 0)

**Date:** 2026-08-19 · **Branch:** `agent/redesign` · **Scope:** read-only. No application code was modified this session.

Every claim below carries a `file:line` reference. Where source could not settle a question, the row reads
`UNKNOWN — needs runtime check` and names the check that would resolve it.

---

## BLOCK A — project context, filled from the repo

Fields the brief asked for. Items marked **FINDING** could not be filled because the thing does not exist.

```
REPO: /Users/daniel/Haygit-redesign  ·  origin https://github.com/AshMargaryan/ExamsApp9.git
BRANCH: agent/redesign (main branch of record: master)

BACKEND
  Django app: backend/apps/ai_assistant  (3,398 LOC incl. tests)
  Models: Conversation → Message(role, status, educational_context) → Attachment, ToolCall
          — all four exist as described: models.py:24, :86, :149, :196
  Tools (read-only, user-scoped): get_profile, get_progress, get_mistakes, get_study_plan
          — tools/definitions.py:10-88, dispatch tools/registry.py:11
  Max tool-loop iterations: 3 — services/message_service.py:24 (MAX_TOOL_ITERATIONS)
  Streaming transport: SSE over a POST fetch body (not EventSource).
          Server: views.py:25-80 (_sse_stream / _sse_response)
          Client: hooks/useConversationChat.ts:39-84 (streamRequest)
          Event schema: services/message_service.py:207, :294, :306, :317, :328, :336, :389
          TS mirror: api/assistant.ts:112-118
  Voice sidecar: voice_benchmark/ (FastAPI). STT gpt-4o-mini-transcribe, TTS gpt-4o-mini-tts,
          voice `nova` — voice_benchmark/server/openai_voice.py:20-25.
          Django proxies it: views.py:298 (transcribe), views.py:334 (synthesize).
          Django never holds the OpenAI key for voice; the sidecar does (views.py:334-338).

FRONTEND
  Stack: React 19 + TypeScript + Vite 8, react-router-dom v7 — frontend/package.json
  Styling: Tailwind CSS v4 (@tailwindcss/vite) over a CSS-variable token file, frontend/src/theme.css (609 lines)
  State: Context + hooks only. No Redux/Zustand/React Query. Assistant state lives in
          hooks/useConversationChat.ts:90 and in each page's local useState.
  Component library: none. Radix is present but only @radix-ui/react-dialog, and the
          assistant does not use it. lucide-react for icons + hand-rolled SVGs
          (components/assistant/icons.tsx, 104 lines).
  Markdown renderer: react-markdown v10 + remark-gfm — components/assistant/MarkdownMessage.tsx:68-70
  Math renderer: KaTeX via remark-math + rehype-katex, `$…$` / `$$…$$` — MarkdownMessage.tsx:69-70
  i18n: FINDING — none. Every student-facing string is a hardcoded Armenian literal inside a
          component (e.g. AssistantPage.tsx:276, MessageInput.tsx:302, MessageBubble.tsx:130).
          There is no message catalogue, no i18n library, no string module. Appendix C
          ("single source of truth; no ad-hoc strings in components") has nothing to build on.
  Theming: CSS vars + `data-theme` attribute + prefers-color-scheme fallback — theme.css:20, :452, :507
  Assistant entry files:
          pages/AssistantPage.tsx (367)          components/assistant/* (11 files, 1,480)
          components/mobile/assistant/* (4 files, 755)
          hooks/useConversationChat.ts (349)     contexts/AssistantLaunchContext.tsx (44)
          api/assistant.ts (177)

TOOLING
  Dev server: `npm run dev` (vite, port 3000) — frontend/vite.config.ts:8
              backend via docker; Daphne does NOT autoreload, `docker restart haygit-backend-1` after
              every backend edit (CLAUDE.md, "Dev workflow gotchas")
  Build:      `npm run build` (= `tsc -b && vite build`)
  Lint:       `npm run lint` (oxlint)   Typecheck: folded into build (`tsc -b`)
  Tests:      frontend `npm run test` (vitest, 8 test files, none touching the assistant)
              backend `manage.py test` (ai_assistant: 36 tests, tests.py)
  E2E: FINDING — none. No Playwright, no Cypress, no e2e directory anywhere in the repo.
       Every "Playwright specs added … all green" DoD line in Prompts 2–5 is currently unsatisfiable.
  Browser + screenshots: yes — this environment has an MCP browser with screenshot/resize.
       Requires a running dev stack and a logged-in student account (see §7, R7).

USERS
  Audience: Armenian students preparing for the միասնական քննություններ (CLAUDE.md).
  Device mix: FINDING — not recorded anywhere in the repo. No analytics config, no RUM,
       no documented device/network baseline. The 360–412px / 4G assumption in the brief is
       an assertion, not a measured fact, and §7 R4 explains why it matters more than usual here.
  Primary language: Armenian, with Latin/math inline. Confirmed throughout.

FEATURE FLAG `assistant_v2`: FINDING — does not exist. Repo-wide grep for `assistant_v2`
  returns nothing, and there is no feature-flag mechanism of any kind (no flags module, no
  settings-driven gate, no per-user flag model). Building "all new UI behind it, old path
  untouched" means first inventing a flag system. See §7 R1.
```

Also missing: **`docs/assistant-brief.md` does not exist.** `docs/` contains `DESIGN.md`,
`chat-calls-architecture.md`, and `ai-learning-system/`. Prompt 1 instructs the next agent to
reconcile against a brief that is not in the repo — it exists only inside the prompt-suite document.

---

## 1. Route & component map

One route. One floating widget. Seven cross-app entry points, all funnelling through one context.

| Path | File:line | Responsibility | LOC |
|---|---|---|---|
| `/assistant` | [App.tsx:112](frontend/src/App.tsx:112), lazy-imported at [App.tsx:30](frontend/src/App.tsx:30) | The route | — |
| — | [pages/AssistantPage.tsx:22](frontend/src/pages/AssistantPage.tsx:22) | Platform fork: Capacitor → `MobileAssistant`, else `WebAssistantPage` | 367 |
| — | [AssistantPage.tsx:29](frontend/src/pages/AssistantPage.tsx:29) | `WebAssistantPage` — sidebar + transcript + composer, owns conversation list, search, archive filter, undo-delete toast, scroll-follow | (of 367) |
| — | [components/assistant/ConversationSidebar.tsx:169](frontend/src/components/assistant/ConversationSidebar.tsx:169) | Conversation rail: search box, archived toggle, pinned/rest split, per-row portalled action menu ([:110](frontend/src/components/assistant/ConversationSidebar.tsx:110)) | 284 |
| — | [components/assistant/MessageBubble.tsx:12](frontend/src/components/assistant/MessageBubble.tsx:12) | One message: attachments, edit-in-place, hover action row, TTS, copy, regenerate, delete | 188 |
| — | [components/assistant/MarkdownMessage.tsx:59](frontend/src/components/assistant/MarkdownMessage.tsx:59) | The entire content renderer: markdown + GFM + KaTeX + code copy + image handling | 95 |
| — | [components/assistant/MessageInput.tsx:35](frontend/src/components/assistant/MessageInput.tsx:35) | Composer: text, mode chips, attachments (click + drag-drop), voice record→transcribe, code-fence insert, send/stop | 383 |
| — | [components/assistant/AssistantSuggestions.tsx:89](frontend/src/components/assistant/AssistantSuggestions.tsx:89) | Starter chips + follow-up action row; the two hardcoded action sets at [:34](frontend/src/components/assistant/AssistantSuggestions.tsx:34) and [:62](frontend/src/components/assistant/AssistantSuggestions.tsx:62) | 133 |
| — | [components/assistant/WelcomeMessage.tsx:5](frontend/src/components/assistant/WelcomeMessage.tsx:5) | Empty-conversation hero: greeting + hero composer + starter chips | 46 |
| — | [components/assistant/AttachmentChip.tsx:11](frontend/src/components/assistant/AttachmentChip.tsx:11) | Attachment thumbnail / file chip | 50 |
| — | [components/assistant/TypingIndicator.tsx:1](frontend/src/components/assistant/TypingIndicator.tsx:1) | Three bouncing dots + optional label | 16 |
| — | [components/assistant/icons.tsx](frontend/src/components/assistant/icons.tsx) | Hand-rolled SVG icon set | 104 |
| floating widget | [components/assistant/FloatingAssistantWidget.tsx:13](frontend/src/components/assistant/FloatingAssistantWidget.tsx:13) | Draggable/resizable panel on every non-`/assistant` authenticated page; own conversation, own transcript, no sidebar | 181 |
| mounted at | [components/ProtectedRoute.tsx:42](frontend/src/components/ProtectedRoute.tsx:42) | Rendered inside `AppChrome`, web only, hidden for `role === "parent"` ([:26](frontend/src/components/ProtectedRoute.tsx:26)) | — |
| native `/assistant` | [components/mobile/assistant/MobileAssistant.tsx:30](frontend/src/components/mobile/assistant/MobileAssistant.tsx:30) | Full-screen chat app: header, transcript, welded composer, bottom-sheet switcher | 244 |
| — | [components/mobile/assistant/MobileMessageBubble.tsx:29](frontend/src/components/mobile/assistant/MobileMessageBubble.tsx:29) | Long-press (450ms) → action sheet instead of hover row | 207 |
| — | [components/mobile/assistant/ConversationSheet.tsx](frontend/src/components/mobile/assistant/ConversationSheet.tsx) | Bottom-sheet conversation list | 237 |
| — | [components/mobile/assistant/MessageActionSheet.tsx:16](frontend/src/components/mobile/assistant/MessageActionSheet.tsx:16) | iOS-convention action sheet | 67 |
| shared logic | [hooks/useConversationChat.ts:90](frontend/src/hooks/useConversationChat.ts:90) | Message list + send/edit/delete/regenerate/stop + SSE consumption + reveal pacing. Used by all three surfaces | 349 |
| launch bus | [contexts/AssistantLaunchContext.tsx:23](frontend/src/contexts/AssistantLaunchContext.tsx:23) | `askAboutQuestion(request)` + `assistantSuppressed`; provider at [ProtectedRoute.tsx:29](frontend/src/components/ProtectedRoute.tsx:29) | 44 |
| api client | [api/assistant.ts](frontend/src/api/assistant.ts) | All 13 endpoints + SSE event union | 177 |

### Entry points

Seven, of two different kinds. **Only four actually open the assistant with a question.**

| Entry point | File:line | Mechanism | Lands where |
|---|---|---|---|
| Nav rail / mobile tab / home quick action | [navItems.tsx:99](frontend/src/components/nav/navItems.tsx:99), [MobileTabBar.tsx:18](frontend/src/components/mobile/MobileTabBar.tsx:18), [HomePage.tsx:109](frontend/src/pages/HomePage.tsx:109) | plain `<Link to="/assistant">` | full page, no context |
| Help Center | [HelpCenterPage.tsx:148](frontend/src/pages/HelpCenterPage.tsx:148) | plain `<Link to="/assistant">` | full page, **no context, no question carried** |
| Daily Problem | [DailyProblemCard.tsx:89](frontend/src/components/DailyProblemCard.tsx:89) | `askAboutQuestion` + `conversation_mode: "solving_question"` | **floating widget** |
| Practice tier | [TierPage.tsx:160](frontend/src/pages/TierPage.tsx:160) | `askAboutQuestion` + `solving_question` | **floating widget** |
| Mock exam attempt | [MockExamAttemptPage.tsx:330](frontend/src/pages/MockExamAttemptPage.tsx:330) | `askAboutQuestion`; also suppresses the widget entirely when the student chose "no AI" ([:141](frontend/src/pages/MockExamAttemptPage.tsx:141), cleared on unmount [:147](frontend/src/pages/MockExamAttemptPage.tsx:147)) | **floating widget** |
| Mistake notebook | [MistakeNotebookPage.tsx:213](frontend/src/pages/MistakeNotebookPage.tsx:213) | `askAboutQuestion(askAiAboutMistake(entry))`, `conversation_mode: "why_am_i_wrong"` | **floating widget** |
| Mistake review session | [MistakeReviewSessionPage.tsx:249](frontend/src/pages/MistakeReviewSessionPage.tsx:249) | same builder, [askAiAboutMistake.ts:30](frontend/src/components/mistakes/askAiAboutMistake.ts:30) | **floating widget** |

Two structural facts the redesign has to absorb:

1. **Every contextual entry point lands in the floating widget, never in the full page**, and the
   widget always creates a *brand-new* conversation on first open ([FloatingAssistantWidget.tsx:56-63](frontend/src/components/assistant/FloatingAssistantWidget.tsx:56)).
   Expanding the widget to the full page ([:120-127](frontend/src/components/assistant/FloatingAssistantWidget.tsx:120)) is a plain
   `<Link to="/assistant">`; the page then selects `data[0]` from its own list
   ([AssistantPage.tsx:62](frontend/src/pages/AssistantPage.tsx:62)) with no id handoff. Continuity works only by
   accident of ordering — a pinned conversation sorts first ([models.py:42](backend/apps/ai_assistant/models.py:42)),
   so expanding a widget chat while any conversation is pinned lands the student somewhere else.
2. **`MobileAssistant` is Capacitor-only**, not mobile-web — the fork is `useIsNativeApp()`
   ([AssistantPage.tsx:25](frontend/src/pages/AssistantPage.tsx:25)), which reads `Capacitor.isNativePlatform()`
   ([lib/platform.ts:9](frontend/src/lib/platform.ts:9)). A student on Android Chrome at 360px gets
   `WebAssistantPage` with a 288px overlay drawer. See §7 R4.

---

## 2. Data & API contract

Base: `/api/assistant/` — [urls.py:10-27](backend/apps/ai_assistant/urls.py:10). All endpoints
`IsAuthenticated`. No public/anonymous surface.

| Method | Path | Request | Response | Errors | Throttle |
|---|---|---|---|---|---|
| GET | `conversations/?q=&archived=` | query params | **paginated** `{count, next, previous, results: Conversation[]}` | 401 | — |
| POST | `conversations/` | `{}` | `Conversation` 201 | 401 | — |
| GET | `conversations/<id>/` | — | `Conversation` | 404 | — |
| PATCH | `conversations/<id>/` | `{title}` | `Conversation` | 400/404 | — |
| DELETE | `conversations/<id>/` | — | 204 | 404 | — |
| POST | `conversations/<id>/<action>/` | — | `Conversation` | 404 unknown action | — |
| GET | `conversations/<id>/messages/` | — | **bare array** `Message[]`, unpaginated | 404 | `ai-assistant` 30/min |
| POST | `conversations/<id>/messages/` | `{content, attachment_ids[], educational_context{}}` | **`text/event-stream`** | 400/404/429 | `ai-assistant` |
| PATCH | `messages/<id>/` | `{content}` | `Message` | 400 non-user, 404 | — |
| DELETE | `messages/<id>/` | — | 204 | 404 | — |
| POST | `messages/<id>/regenerate/` | `{}` | **`text/event-stream`**, or 400 JSON | 400/404/429 | `ai-assistant` |
| POST | `attachments/` | multipart `conversation`, `file` | `Attachment` 201 | 400 validation, 404 wrong owner | — |
| DELETE | `attachments/<id>/` | — | 204 | 400 if already sent, 404 | — |
| POST | `voice/transcribe/` | multipart `audio` | `{text}` | 400 missing, 502 sidecar | `ai-voice` 20/min |
| POST | `voice/synthesize/` | `{text ≤4000, voice: nova\|onyx}` | `audio/wav` bytes | 400, 502 | `ai-voice` 20/min |

Actual serializer shapes, verbatim:

```python
# backend/apps/ai_assistant/serializers.py:11
class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = [
            "id", "title", "is_archived", "is_pinned",
            "created_at", "updated_at", "last_message_at",
        ]
        read_only_fields = fields
```

```python
# backend/apps/ai_assistant/serializers.py:89
class MessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    tool_calls = ToolCallSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "conversation", "role", "content", "status", "error_message",
            "created_at", "edited_at", "model_used", "provider",
            "response_time_ms", "token_usage", "educational_context",
            "is_active_response", "attachments", "tool_calls",
        ]
        read_only_fields = fields
```

`educational_context` is validated (not free-form JSON) on the way in —
[serializers.py:29-42](backend/apps/ai_assistant/serializers.py:29); `conversation_mode` is a
closed `ChoiceField` of eight values, and an unknown mode is a hard 400
([tests.py:148](backend/apps/ai_assistant/tests.py:148)).

### Contract mismatches, found by reading both sides

- **`GET conversations/` is paginated; the client throws the envelope away.**
  DRF global `PageNumberPagination`, `PAGE_SIZE: 20` ([settings.py:239-240](backend/config/settings.py:239)).
  Client: `return data.results;` ([api/assistant.ts:73](frontend/src/api/assistant.ts:73)) — `count`
  and `next` are discarded and there is no "load more" anywhere. **A student's 21st conversation
  becomes unreachable except by title search.**
- **`GET .../messages/` is not paginated at all** — `Response(MessageSerializer(messages, many=True…))`
  ([views.py:179](backend/apps/ai_assistant/views.py:179)), and the client types it as a bare array
  ([api/assistant.ts:101](frontend/src/api/assistant.ts:101)). A 300-message conversation ships and
  renders in full on open. Appendix E's "render last 40 + Ավելի հին loader" has **no backend
  affordance today** — it needs a paginated or `?before=` message endpoint. That is a backend ask.
- **`SendMessageResponseSerializer`** ([serializers.py:116](backend/apps/ai_assistant/serializers.py:116))
  is dead code — the send path streams; nothing constructs this envelope.
- **`MessageSerializer` exposes `tool_calls`, the TS `Message` interface omits it**
  ([api/assistant.ts:50-66](frontend/src/api/assistant.ts:50)). The data to render "I looked at your
  mistakes" after the fact is already on the wire and silently dropped by the type.
- **`AttachmentUploadSerializer` queries `Conversation.objects.all()`** ([serializers.py:68](backend/apps/ai_assistant/serializers.py:68)),
  i.e. not owner-scoped at the serializer layer. The view re-checks ownership and 404s
  ([views.py:258](backend/apps/ai_assistant/views.py:258)), so this is not exploitable — but validation
  order means a cross-user conversation id gets past field validation before the view rejects it.
  Defence-in-depth gap, not a live hole. There is **no test** for the cross-user attachment case
  (tests cover cross-user conversation and message only — [tests.py:296](backend/apps/ai_assistant/tests.py:296), [:300](backend/apps/ai_assistant/tests.py:300)).

---

## 3. Streaming contract

**Transport.** SSE framing over a `POST` response body, consumed with `fetch` + `ReadableStream` —
*not* `EventSource` (which cannot POST). Server: [views.py:72-80](backend/apps/ai_assistant/views.py:72).
Client: [useConversationChat.ts:39-84](frontend/src/hooks/useConversationChat.ts:39).

Wire format, verbatim ([views.py:66-69](backend/apps/ai_assistant/views.py:66)):

```python
        if event.get("type") == "heartbeat":
            yield b": keep-alive\n\n"
            continue
        yield f"data: {json.dumps(event, default=str)}\n\n".encode("utf-8")
```

No `event:` field, no `id:`, no `retry:` — **every event is a `data:` line whose JSON `type` key is
the discriminator.** There is no resume/replay: a dropped connection loses the stream (the partial
answer is still persisted server-side, see below, but the client cannot reattach).

`_sse_stream` is an **async** generator bridging a sync one via `sync_to_async` per `next()`
([views.py:25-69](backend/apps/ai_assistant/views.py:25)) — the docstring explains that a sync
iterator would make Django drain the whole generator before the first byte. `X-Accel-Buffering: no`
is set per-response for nginx ([views.py:79](backend/apps/ai_assistant/views.py:79)).

### Every event type

Emitted from [message_service.py](backend/apps/ai_assistant/services/message_service.py); TS union at
[api/assistant.ts:112-118](frontend/src/api/assistant.ts:112).

| `type` | Fields | Emitted at | Meaning | Client handling |
|---|---|---|---|---|
| `heartbeat` | *(none — sent as an SSE comment)* | [:294](backend/apps/ai_assistant/services/message_service.py:294) | One-shot, right after the provider is constructed, before the first provider call. Flushes headers so the browser opens the stream. **Not** periodic. | ignored (line doesn't start with `data: ` — [useConversationChat.ts:79](frontend/src/hooks/useConversationChat.ts:79)) |
| `user_message` | `message: Message` | [:207](backend/apps/ai_assistant/services/message_service.py:207) | The persisted user turn, with real id + linked attachments. Send path only, never on regenerate. | swaps the optimistic `id: -1` row ([:190](frontend/src/hooks/useConversationChat.ts:190)) |
| `tool_call` | `tool_name: string` | [:336](backend/apps/ai_assistant/services/message_service.py:336) | **Emitted immediately before `tool_registry.execute(...)` runs.** | `setActivityLabel(event.tool_name)` ([:193](frontend/src/hooks/useConversationChat.ts:193)) |
| `tool_call_reset` | *(none)* | [:328](backend/apps/ai_assistant/services/message_service.py:328) | Retraction: content already streamed during an iteration that turned out to end in a tool call must be cleared. | clears buffer + rendered text ([:195-203](frontend/src/hooks/useConversationChat.ts:195)) |
| `delta` | `content: string` | [:306](backend/apps/ai_assistant/services/message_service.py:306), [:359](backend/apps/ai_assistant/services/message_service.py:359) | A provider content chunk, forwarded verbatim. | appended to `fullContentRef`, reveal pacer started ([:205-208](frontend/src/hooks/useConversationChat.ts:205)) |
| `message` | `message: Message` | [:389](backend/apps/ai_assistant/services/message_service.py:389) | Terminal success. The persisted assistant row incl. `tool_calls`, `model_used`, `token_usage`. | queued until the pacer catches up ([:210-217](frontend/src/hooks/useConversationChat.ts:210)) |
| `error` | `message: Message` | [:317](backend/apps/ai_assistant/services/message_service.py:317), [:369](backend/apps/ai_assistant/services/message_service.py:369) | Terminal failure. `status: "failed"`, `error_message` populated; whatever streamed so far is **kept**, not erased. | same queued path as `message` |

### Answering Appendix B's honesty question directly

> *"State explicitly whether any event corresponds to a tool call starting or finishing, and what identifying data it carries."*

- **Tool call starting: YES.** `{"type": "tool_call", "tool_name": "get_mistakes"}` is emitted before
  execution ([:336](backend/apps/ai_assistant/services/message_service.py:336)). The identifying data
  is the tool name only — no arguments, no call id, no sequence number.
- **Tool call finishing: NO.** There is no completion event. The client infers "done" from the next
  `delta` arriving, which clears the label ([useConversationChat.ts:207](frontend/src/hooks/useConversationChat.ts:207)).
  With N tools in one iteration, the label just overwrites per call and the student sees only the last.
- **Therefore, per Appendix B, exactly one honest status label is derivable today**, and it must be
  keyed off the real `tool_name`. Every other stage ("Understanding…", "Thinking…") would be fabricated.
  Note the current UI already fails this rule in the opposite direction — see §8, D1.

There is **no** event for: iteration/tool-loop boundaries, the `MAX_TOOL_ITERATIONS` forced-final
retry ([:350-353](backend/apps/ai_assistant/services/message_service.py:350)), model identity before
the terminal event, or token usage before the terminal event.

### Abort semantics

`finally` at [message_service.py:391-409](backend/apps/ai_assistant/services/message_service.py:391)
guarantees exactly one assistant `Message` row on every exit path — clean finish, provider error, or
`GeneratorExit` from a client disconnect. The disconnect case persists `status="stopped"` with the
accumulated content ([:395-400](backend/apps/ai_assistant/services/message_service.py:395)) and still
runs `last_message_at` + learning-event bookkeeping ([:407-409](backend/apps/ai_assistant/services/message_service.py:407)).
This is genuinely well-built. Its limits are in §4.

---

## 4. Capability ledger

| Capability | Verdict | Evidence |
|---|---|---|
| **Message edit-in-place + downstream regeneration** | **PARTIAL** | Edit itself is real and server-persisted: `PATCH messages/<id>/`, user messages only ([views.py:206-216](backend/apps/ai_assistant/views.py:206)), sets `edited_at` ([message_service.py:441](backend/apps/ai_assistant/services/message_service.py:441)). Downstream regeneration is **client-side and shallow**: [useConversationChat.ts:327-338](frontend/src/hooks/useConversationChat.ts:327) finds the *first following assistant message* and regenerates only that. Everything after it — later user turns and their answers — stays on screen, unchanged, still built on the pre-edit text. The backend has no notion of "invalidate downstream". |
| **Multiple assistant versions per turn (regenerate history)** | **PARTIAL — stored, unreachable** | The data model is right: regeneration creates a new row with `regenerated_from` FK and flips the old one's `is_active_response` ([models.py:116-119](backend/apps/ai_assistant/models.py:116), [message_service.py:239-245](backend/apps/ai_assistant/services/message_service.py:239)). But `GET messages/` filters `is_active_response=True` ([views.py:176](backend/apps/ai_assistant/views.py:176)) and **no endpoint exposes siblings**. There is no "2/3" pager in any of the three UIs. History accrues and is invisible. |
| **Stop generation — does the backend actually abort?** | **PARTIAL** | The client aborts the fetch ([useConversationChat.ts:312](frontend/src/hooks/useConversationChat.ts:312)), which closes the response body; on the next `yield` the generator raises `GeneratorExit`, the `finally` persists a `stopped` message. So *state* is correct and content is never lost. **But the upstream provider call is not cancelled at the API level** — nothing calls `response_stream.close()` or the SDK's cancel; the OpenAI stream is abandoned mid-iteration ([openai_provider.py:113](backend/apps/ai_assistant/providers/openai_provider.py:113)). Completion tokens already generated are still billed, and the abort is only observed when the next chunk is written. Also note the client sets `streamingRef.current = false` **before** aborting ([:311-312](frontend/src/hooks/useConversationChat.ts:311)), so any in-flight events are dropped by the guard at [:187](frontend/src/hooks/useConversationChat.ts:187) — the local "stopped" state is authoritative and the server's `stopped` row is never reconciled into the UI until reload. |
| **TTS caching — persisted server-side, keyed how?** | **NOT SUPPORTED** | `VoiceSynthesizeView` proxies to the sidecar and returns bytes with no storage, no cache key, no `Cache-Control` ([views.py:334-364](backend/apps/ai_assistant/views.py:334)). The only cache is a per-component-instance `audioRef` ([MessageBubble.tsx:34](frontend/src/components/assistant/MessageBubble.tsx:34), reused at [:45-51](frontend/src/components/assistant/MessageBubble.tsx:45)). Unmount, navigate, or reload → full re-synthesis, re-billed. Appendix E's "TTS cached replay" row **cannot pass** without a backend change. |
| **Attachment upload — sync/async, limits, validation** | **SUPPORTED (sync)** | Synchronous single-request upload ([views.py:248-274](backend/apps/ai_assistant/views.py:248)); the client uploads files serially in a `for` loop, awaiting each ([MessageInput.tsx:167-170](frontend/src/components/assistant/MessageInput.tsx:167)). Size cap 15MB default ([validators.py:28](backend/apps/ai_assistant/validators.py:28)). Extension allowlist of 9 types **and** real byte-sniffed MIME via `libmagic`, rejecting spoofed extensions ([validators.py:40-47](backend/apps/ai_assistant/validators.py:40)) — tested at [tests.py:325](backend/apps/ai_assistant/tests.py:325). **No AV scanning.** Vision images are base64-embedded per-turn, capped at 10MB, newest turn only ([prompt_builder.py:210-221](backend/apps/ai_assistant/services/prompt_builder.py:210)). Only images reach the model as pixels; **PDF/docx/txt/csv are sent as filename + mime only** ([prompt_builder.py:197-208](backend/apps/ai_assistant/services/prompt_builder.py:197)) — `extracted_text` exists on the model ([models.py:173](backend/apps/ai_assistant/models.py:173)) and is never populated. Uploading a PDF today does nothing but show a chip. |
| **`educational_context` — what's written, by whom, read back?** | **PARTIAL** | Written on **both** the user and the assistant message ([message_service.py:202](backend/apps/ai_assistant/services/message_service.py:202), [:378](backend/apps/ai_assistant/services/message_service.py:378)), only when non-empty. Producers: the four `askAboutQuestion` call sites (full context), and the composer, which writes **only** `{conversation_mode}` ([MessageInput.tsx:194](frontend/src/components/assistant/MessageInput.tsx:194)). Read back server-side: regenerate re-reads it from the preceding user message ([message_service.py:221](backend/apps/ai_assistant/services/message_service.py:221)), and it drives RAG retrieval ([rag_service.py:90-98](backend/apps/ai_assistant/services/rag_service.py:90)) and mode framing ([prompt_builder.py:80-82](backend/apps/ai_assistant/services/prompt_builder.py:80)). Read back **client-side: never** — repo-wide grep for `educational_context` in `.tsx` returns zero hits. It is serialized to every message and rendered nowhere. Appendix-style "origin chips" have their data already; nothing displays it. |
| **Conversation search — server-side? indexed?** | **PARTIAL, title-only** | Server-side: `Q(title__icontains=search)` ([conversation_service.py:13](backend/apps/ai_assistant/services/conversation_service.py:13)). **Message bodies are not searched.** Titles are auto-derived from the first 60 chars of the first message ([conversation_service.py:27-35](backend/apps/ai_assistant/services/conversation_service.py:27)), so search covers openers only. An index exists on `(owner, title)` ([models.py:45](backend/apps/ai_assistant/models.py:45)) but a leading-wildcard `ILIKE '%x%'` **cannot use a plain B-tree** — it degrades to a scan of the user's rows. Fine at current volume, not a real search. Client fires a request per keystroke, undebounced ([AssistantPage.tsx:59-69](frontend/src/pages/AssistantPage.tsx:59)). |
| **Undo-delete — soft delete with TTL, or client buffer?** | **SUPPORTED (soft), but no TTL and no purge** | Real soft delete: `deleted_at` + a default manager that filters it out globally, plus `all_objects` for restore ([models.py:12-39](backend/apps/ai_assistant/models.py:12), [:55-61](backend/apps/ai_assistant/models.py:55)). `POST conversations/<id>/restore/` uses `all_objects` ([views.py:146](backend/apps/ai_assistant/views.py:146)). The 6-second window is **purely the client toast's timer** ([AssistantPage.tsx:186](frontend/src/pages/AssistantPage.tsx:186)) — server-side the row is restorable forever. There is **no purge job and no retention policy** (no management command references `Conversation`). Two gaps: deleted conversations accumulate indefinitely, and undo exists **only on the web page** — [ConversationSheet.tsx:196](frontend/src/components/mobile/assistant/ConversationSheet.tsx:196) deletes with no undo affordance at all. |

---

## 5. Model output shape

### The system prompt, as assembled

`PromptBuilder._build_system_prompt` ([prompt_builder.py:75-93](backend/apps/ai_assistant/services/prompt_builder.py:75))
concatenates, in order:

1. `BASE_SYSTEM_PROMPT` — [prompts.py:1-96](backend/apps/ai_assistant/prompts.py:1) (~1,100 words)
2. `TOOLS_SYSTEM_ADDENDUM` — [prompts.py:98-106](backend/apps/ai_assistant/prompts.py:98)
3. Mode framing, if `conversation_mode` matched — [prompts.py:108-163](backend/apps/ai_assistant/prompts.py:108), 8 modes
4. Preference directives from `LearningPreferences` — [prompt_builder.py:95-126](backend/apps/ai_assistant/services/prompt_builder.py:95)
5. A `--- Student profile ---` briefing (goals, active subjects, upcoming exams, availability, last 5 events) — [prompt_builder.py:128-172](backend/apps/ai_assistant/services/prompt_builder.py:128)

RAG chunks are deliberately **not** in the system prompt — they ride on the newest user message to
preserve OpenAI prefix caching; the reasoning is documented at [prompt_builder.py:56-65](backend/apps/ai_assistant/services/prompt_builder.py:56).
History window: 20 messages, `is_active_response=True` and `status=SENT` only ([prompt_builder.py:175-182](backend/apps/ai_assistant/services/prompt_builder.py:175)).

### What the model is instructed to emit today — exactly

Two formatting instructions exist, both in `BASE_SYSTEM_PROMPT`:

```
"VOICE\n"
… "Use Markdown: numbered "
"lists for steps, **bold** for the term or result that matters, "
"`code`/fenced blocks for formulas and anything meant to be copied "
"exactly.\n\n"
```
— [prompts.py:72-81](backend/apps/ai_assistant/prompts.py:72)

```
"MATH NOTATION — STRICT\n"
"The app's renderer only recognizes LaTeX wrapped in dollar signs: "
"`$...$` for inline math, `$$...$$` on its own line for display "
"equations. Never use `\\(...\\)`, `\\[...\\]`, or bare LaTeX commands "
"outside dollar delimiters — those render as literal, unreadable text "
"to the student instead of typeset math."
```
— [prompts.py:82-90](backend/apps/ai_assistant/prompts.py:82)

**So: plain GitHub-flavoured Markdown plus `$`/`$$` LaTeX. Nothing structured. No directives, no
blocks, no machine-readable envelope of any kind.** The renderer matches exactly that surface —
`remarkGfm`, `remarkMath`, `rehypeKatex` ([MarkdownMessage.tsx:69-70](frontend/src/components/assistant/MarkdownMessage.tsx:69)).

**This is a head-on collision with Appendix B**, which specifies `\(…\)` / `\[…\]` and forbids
nothing about `$`. Adopting Appendix B's math delimiters verbatim would contradict a prompt rule
that is currently stated three times with emphasis, and would require swapping remark-math's
configuration. See §7 R2 — this is a decision the next agent must make deliberately, not silently.

Also relevant: the mode framings already encode much of the pedagogy Appendix B wants to express
structurally — `why_am_i_wrong` ([prompts.py:140-150](backend/apps/ai_assistant/prompts.py:140)) is
almost exactly the "mistake diagnosis" signature element, expressed as prose instructions with **no
structural output contract**. The model is asked to diagnose; it is not asked to *mark up* the
diagnosis. That gap is the single highest-leverage change available.

---

## 6. State & rendering

**Where state lives.** No store. Three independent copies of assistant state:

- `WebAssistantPage` — conversations, selectedId, search, showArchived, sidebarOpen, undo ([AssistantPage.tsx:33-43](frontend/src/pages/AssistantPage.tsx:33))
- `MobileAssistant` — its own near-identical set ([MobileAssistant.tsx:34-43](frontend/src/components/mobile/assistant/MobileAssistant.tsx:34)); the file's own comment ([:23-27](frontend/src/components/mobile/assistant/MobileAssistant.tsx:23)) explains the deliberate duplication
- `FloatingAssistantWidget` — one conversationId, no list ([FloatingAssistantWidget.tsx:16-18](frontend/src/components/assistant/FloatingAssistantWidget.tsx:16))

Messages themselves are owned by `useConversationChat` ([useConversationChat.ts:91](frontend/src/hooks/useConversationChat.ts:91)),
which every surface mounts separately. Nothing is shared or cached across navigations — consistent
with the repo-wide "no React Query" decision (CLAUDE.md).

**What re-renders per chunk.** Not per chunk — **per animation frame**, by design. Network deltas go
into a ref, and a rAF pacer reveals them at ~45 chars/sec with backlog-proportional catch-up
([useConversationChat.ts:16-17](frontend/src/hooks/useConversationChat.ts:16), [:141-179](frontend/src/hooks/useConversationChat.ts:141)).
Each tick that advances by ≥1 char calls:

```ts
// frontend/src/hooks/useConversationChat.ts:162
setMessages((prev) => (prev ?? []).map((m) => (m.id === PENDING_ASSISTANT_ID ? { ...m, content: shown } : m)));
```

### Measured/derived O(n) work per frame

Three separate O(n) costs, one of which is severe:

1. **O(messages) per frame** — the `.map()` above allocates a new array over the entire conversation
   ~60×/sec. `MessageBubble` is `memo`'d ([MessageBubble.tsx:188](frontend/src/components/assistant/MessageBubble.tsx:188))
   so siblings don't re-render, but the array walk and the parent's reconciliation still scale with
   conversation length. At 200 messages that is ~12,000 identity comparisons/sec plus 200 element
   diffs — noticeable, not fatal.
2. **O(answer length) markdown + KaTeX re-parse per frame — this is the real cost.**
   `MarkdownMessage` is not memoized and receives a new `content` string every frame
   ([MessageBubble.tsx:143](frontend/src/components/assistant/MessageBubble.tsx:143) → [MarkdownMessage.tsx:68](frontend/src/components/assistant/MarkdownMessage.tsx:68)).
   `ReactMarkdown` re-runs remark parse → mdast → remark-math → rehype → **rehype-katex re-typesets
   every formula in the message** and rebuilds the whole element tree, from scratch, ~60×/sec, on a
   string that grows monotonically. Cost per frame is O(current length), so total work across a
   response is **O(length²)**. A 4,000-character physics answer with a dozen `$$` blocks re-typesets
   all twelve, ~60 times a second, on a mid-range Android. Note the repo already recognised this
   exact hazard elsewhere and fixed it for `MathText` (CLAUDE.md, 2026-08-18 pass: "memoized
   per-segment KaTeX rendering in MathText") — the assistant's own renderer never received the
   equivalent treatment.
3. **`:has(.katex) { line-height: 2.2 }`** ([index.css:93](frontend/src/index.css:93)) applies
   globally to `p, li, td, div, span, h1, h2, h3, label`. A `:has()` selector over a growing subtree
   re-evaluated during streaming is a style-recalc cost that scales with the DOM, on top of the above.

**UNKNOWN — needs runtime check:** actual frame times and long-task counts. Resolve with a Chrome
DevTools Performance trace (4× CPU throttle, "Slow 4G") over one long math-heavy answer, reading
long-task count >200ms and total scripting time. Nothing in-repo measures this today.

**Scroll follow** is implemented carefully on both surfaces — `isNearBottomRef` + instant (not
smooth) auto-scroll during streaming, with the reasoning documented at
[AssistantPage.tsx:93-104](frontend/src/pages/AssistantPage.tsx:93). Reuse it; don't rewrite it.

---

## 7. Constraints & risks

This is the section that changes the plan. Blunt.

**R1 — `assistant_v2` does not exist, and neither does any flag mechanism.**
Appendix F ("Old assistant stays reachable behind the flag until the new one passes all five slice
DoDs") presupposes infrastructure that isn't here. There is no flags module, no settings gate, no
per-user flag field. Someone must either build one (backend + serializer change → *not* allowed
inside a UI slice per the same appendix) or accept that slices ship unflagged. **This contradiction
must be resolved before Slice 2 starts**, not discovered during it.

**R2 — Appendix B's math delimiters contradict the shipped prompt and renderer.**
`$…$`/`$$…$$` is instructed three times, emphatically ([prompts.py:82-90](backend/apps/ai_assistant/prompts.py:82)),
and the renderer is configured for it. Appendix B mandates `\(…\)`/`\[…\]`. Whichever wins, note
that changing math delimiters **retroactively breaks every stored message** — historical assistant
content is stored as raw text ([models.py:91](backend/apps/ai_assistant/models.py:91)) and re-rendered
on every load, so a renderer that no longer understands `$` turns every past answer into literal
LaTeX noise. Any change here needs the renderer to accept **both** dialects indefinitely, or a
content migration. My recommendation: keep `$`, and treat Appendix B's delimiters as a non-normative
detail. That is a decision for the human, and I am flagging rather than assuming it.

**R3 — The streaming-tolerant directive parser has to be built for a language the model does not speak yet, and both halves ship in the same slice.**
Prompt 1 puts the parser in Foundations and the surfaces in Slice 2. Between them, the system prompt
must start emitting `:::concept` etc. Every message written *before* that prompt change is plain
markdown, and every message written *after* a rollback is too. So the parser must treat the directive
dialect as strictly optional and degrade to plain markdown — Appendix B already says this, and it is
the correct call; I'm flagging that it applies to **stored history**, not just to malformed output.

Additional hazard the brief understates: `:::` is not currently reserved. Nothing prevents a student
from pasting `:::` in a message, and nothing prevents today's model from emitting it inside a code
fence. Fence-awareness must come **before** directive scanning in the parse order, or a `:::` inside
a ```` ```python ```` block will open a phantom callout.

**R4 — Mobile web is the majority device and gets the desktop layout.**
`MobileAssistant` is gated on Capacitor ([AssistantPage.tsx:25](frontend/src/pages/AssistantPage.tsx:25) →
[lib/platform.ts:9](frontend/src/lib/platform.ts:9)). If the brief's "70% mid-range Android, Chrome,
360–412px" figure is even directionally right, then **the best assistant UI in this repo is invisible
to most students**, and the redesign's mobile screenshots at 360×740 will be exercising
`WebAssistantPage`. This is either the largest single win available (make the mobile layout
breakpoint-driven, not platform-driven) or a mis-stated audience assumption. It cannot be both, and
the brief does not say which. **This needs a human answer before Slice 2 scopes its layout work.**

**R5 — Appendix E's perf and history budgets need backend changes that Appendix F forbids in UI slices.**
- "conversations > 60 messages render last 40 + «Ավելի հին» loader" — `GET .../messages/` returns
  everything, unpaginated ([views.py:172-179](backend/apps/ai_assistant/views.py:172)). Client-side
  windowing of an already-downloaded 300-message payload fixes render cost but not transfer or parse.
- "TTS cached replay" — no server-side cache exists (§4). Not achievable frontend-only beyond an
  in-memory Map that dies on reload.
- ">20 conversations" — the list endpoint is paginated and the client drops the envelope
  ([api/assistant.ts:73](frontend/src/api/assistant.ts:73)). This one *is* frontend-only fixable.
Route the first two to `docs/assistant-backend-asks.md` as the slice skeleton instructs.

**R6 — Appendix C presumes a string layer that does not exist.**
No i18n, no catalogue; a rough grep counts ~109 Armenian string literals across the assistant files
(`components/assistant/`, `components/mobile/assistant/`, `AssistantPage.tsx`, `useConversationChat.ts`). "No ad-hoc
strings in components" is a genuine refactor with its own risk of regressing copy, not a formatting
convention. Scope it explicitly or drop it; do not let it ride along invisibly inside Slice 2.

**R7 — No E2E harness, and the DoD demands Playwright specs in every slice.**
Zero e2e infrastructure in the repo. Standing one up means: a dependency (~`@playwright/test`,
outside the +40KB budget since it's dev-only, but still a decision), a seeded test account, a running
Django+Postgres+Daphne stack, and `AI_PROVIDER=mock` (the default — [settings.py:397](backend/config/settings.py:397))
so runs are deterministic and unbilled. `MockAIProvider` is genuinely well-suited to this: it streams
in word-groups with real delays ([mock_provider.py:54-66](backend/apps/ai_assistant/providers/mock_provider.py:54))
and triggers tool calls off keywords ([mock_provider.py:13-22](backend/apps/ai_assistant/providers/mock_provider.py:13)),
so the whole SSE + tool + reset path is exercisable offline. Budget this as its own task before
Slice 2, or downgrade the DoD honestly.

**R8 — The floating widget and the full page are two different products sharing a hook.**
Different empty states, different composers, no sidebar, no follow-up chips, no undo, no
jump-to-latest in the widget, and an "expand" that discards which conversation you were in (§1).
Slice 5's "floating widget ↔ full assistant continuity" is therefore not a polish item — it needs a
conversation-id handoff (route param or context) and is the one place the two surfaces genuinely must
converge.

**R9 — Stop does not stop the bill.** §4. If cost control is part of why Stop exists, the current
implementation only stops the *display*. Fixing it is a backend change.

**R10 — `AnthropicProvider` is a stub that raises.**
[anthropic_provider.py:16-17](backend/apps/ai_assistant/providers/anthropic_provider.py:16) —
`generate()` raises `NotImplementedError` and `stream()` is not overridden, so it inherits the base
raise ([base.py:73](backend/apps/ai_assistant/providers/base.py:73)). Setting `AI_PROVIDER=anthropic`
produces a `failed` message on every turn. Not a redesign blocker; worth knowing before anyone
"switches providers to test".

---

## 8. Top 10 defects today

Ranked by student impact.

**D1 — The thinking indicator shows a raw English function name to an Armenian student.**
[useConversationChat.ts:193](frontend/src/hooks/useConversationChat.ts:193) sets `activityLabel` to
the literal `event.tool_name`; it is passed through [MessageBubble.tsx:124](frontend/src/components/assistant/MessageBubble.tsx:124)
and rendered verbatim at [TypingIndicator.tsx:13](frontend/src/components/assistant/TypingIndicator.tsx:13).
A student asking «ի՞նչ սխալներ եմ արել» sees **`get_mistakes`**.
*Fix:* map tool name → Armenian label at the display boundary. This is exactly Appendix B's honesty
rule satisfied with a real event — the data is right, the presentation is raw.

**D2 — Only the first 20 conversations are ever reachable.**
[api/assistant.ts:73](frontend/src/api/assistant.ts:73) discards `count`/`next` from a page-size-20
response ([settings.py:240](backend/config/settings.py:240)); no surface paginates. Older
conversations exist, are billed for, and cannot be opened — only found by a title substring.
*Fix:* consume `next` and add an intersection-observer "load more" in the rail; frontend-only.

**D3 — Editing a message silently invalidates everything after it, and shows the stale answers anyway.**
[useConversationChat.ts:331-337](frontend/src/hooks/useConversationChat.ts:331) regenerates only the
first following assistant message. Later turns remain on screen built on pre-edit reasoning, with no
indication they're stale.
*Fix:* either truncate the branch on edit (destructive, needs a confirm) or mark downstream messages
visually stale. Needs a product decision; the current silent middle is the worst of both.

**D4 — Markdown + KaTeX re-parse the entire growing answer ~60×/sec.**
§6, item 2. On mid-range Android this is the dominant cost of the whole feature and directly
threatens Appendix E's "no main-thread task > 200ms during stream".
*Fix:* memoize `MarkdownMessage` on `content`, and pace reveal on token/block boundaries rather than
characters so re-parses are far rarer — mirroring the `MathText` fix already made in this repo.

**D5 — Regenerate history is stored and unreachable.**
[views.py:176](backend/apps/ai_assistant/views.py:176) filters to `is_active_response=True`; nothing
exposes siblings. A student who regenerates loses the previous answer with no way back, despite the
row existing.
*Fix (frontend-only, partial):* keep the outgoing message client-side during regeneration so "back to
previous" works within the session. Full fix is a backend ask.

**D6 — Undo-delete exists on web and not on native.**
[AssistantPage.tsx:184-195](frontend/src/pages/AssistantPage.tsx:184) has the toast + restore call;
[ConversationSheet.tsx:196](frontend/src/components/mobile/assistant/ConversationSheet.tsx:196)
deletes with no undo. The `restore` endpoint is right there ([views.py:136](backend/apps/ai_assistant/views.py:136)).
*Fix:* lift the undo affordance into shared logic; both surfaces already call the same API module.

**D7 — TTS re-bills OpenAI for every replay after any unmount.**
§4. The cache is a component ref ([MessageBubble.tsx:34](frontend/src/components/assistant/MessageBubble.tsx:34));
navigating away and back re-synthesizes the identical text.
*Fix (frontend, partial):* a module-level `Map<messageId, objectURL>` survives navigation within a
session. Durable caching is a backend ask.

**D8 — Search fires one request per keystroke.**
[AssistantPage.tsx:59-69](frontend/src/pages/AssistantPage.tsx:59) — the effect depends on `search`
with no debounce, and each run does an unindexable `ILIKE '%…%'`
([conversation_service.py:13](backend/apps/ai_assistant/services/conversation_service.py:13)).
Note the repo already has `hooks/useDebouncedCallback.ts`.
*Fix:* debounce ~250ms; frontend-only, one line of intent.

**D9 — Nothing in the assistant is announced to a screen reader.**
No `aria-live` anywhere in the assistant tree. A grep for `aria-` across `components/assistant/`,
`components/mobile/assistant/` and `AssistantPage.tsx` returns only `aria-label` (×7), `aria-hidden`
(×2), one `aria-pressed`, and one `role="dialog"` — no live region, no `role="log"`.
Streaming answers, errors, and the stopped state are all silent. The web message action row is also
`opacity-0` until `group-hover` ([MessageBubble.tsx:148](frontend/src/components/assistant/MessageBubble.tsx:148))
— focusable but invisible to a keyboard user, and unreachable on touch, which is precisely why the
native surface needed long-press.
*Fix:* `aria-live="polite"` announcing the **completed** message (per Appendix E, not per token);
make the action row `focus-within:opacity-100`.

**D10 — Assistant images float right, inside a chat message.**
[MarkdownMessage.tsx:86](frontend/src/components/assistant/MarkdownMessage.tsx:86) —
`float-right ml-5 mb-4 … md:w-[55%]`. That rule makes sense for the lesson pages that reuse this
component ([SubtopicPage.tsx:11](frontend/src/pages/SubtopicPage.tsx:11), [HelpArticlePage.tsx:5](frontend/src/pages/HelpArticlePage.tsx:5)),
and is wrong in a chat transcript, where a floated image pulls following text around it mid-answer
and interacts badly with content arriving live.
*Fix:* split the renderer's image treatment by context (a `variant` prop), or give the assistant its
own block-image rule. Watch the shared consumers — this component has three call sites, not one.

---

## Notes for whoever runs Prompt 1

Three things in this audit change Prompt 1's scope, per its own "the audit wins" clause:

1. **Tokens (deliverable A) largely exist.** [theme.css](frontend/src/theme.css) (609 lines) already
   defines semantic colour roles for light + dark + `data-theme`, a `--space-1..10` scale, seven
   radii aliased so `--radius` stays `lg`, a type scale with `--leading-*`, and four shadow steps.
   Appendix A's numbers **conflict** with it in several places (3 radii vs 7; `4 8 12 16 24 32 48 64`
   vs the existing 10-step scale; three elevation levels vs four). Rewriting theme.css to Appendix A
   would touch ~300 existing `rounded-[var(--radius)]` call sites the file explicitly documents
   ([theme.css:137-149](frontend/src/theme.css:137)) and every page in the app — far beyond an
   assistant redesign. The honest move is an **assistant-scoped token subset layered on the existing
   file**, plus a written note of where Appendix A and the shipped system disagree. Do not silently
   re-scale the whole app from inside an assistant slice.
2. **Deliverable B is the whole risk, and it is bigger than stated** — see R2 and R3. Fence-awareness
   before directive scanning; both math dialects accepted; stored history must keep rendering.
3. **Deliverable C's state machines should be written against `useConversationChat`'s actual states**,
   which are richer than they look: `sending`, `streaming` (a ref, not state), paced-reveal backlog,
   `pendingFinal` queued behind the pacer, `stopped` vs `failed` vs `sent`, and `tool_call_reset`
   retraction. Specifying a cleaner machine than the code has is easy and useless; specify the one
   that must survive.
