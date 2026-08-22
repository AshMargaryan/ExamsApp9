# AI Assistant — Interaction Spec

**Prompt 1, deliverable C** · Date 2026-08-20 · Branch `agent/redesign` · Read-only session (docs only).

Companion to [docs/assistant-audit.md](assistant-audit.md) (Prompt 0) and to the two shipped halves of
Prompt 1: the token layer ([styles/assistant.css](../frontend/src/styles/assistant.css), guarded by
[assistantDesignTokens.test.ts](../frontend/src/test/assistantDesignTokens.test.ts)) and the content
rendering contract ([lib/assistantContent/](../frontend/src/lib/assistantContent/),
[components/assistant/content/](../frontend/src/components/assistant/content/)).

---

## 0. How to read this document

**Precedence.** The audit is authoritative on what exists. This spec is authoritative on what Slices
2–5 build. Where this spec and the prompt-suite appendices disagree, §6 records the disagreement and
the reason — silently diverging from the brief is not allowed, and neither is silently rewriting the
app to match it.

**Every state machine below is written against the code that exists**, not against a cleaner machine
someone would rather have. The audit's closing note is the instruction being followed here:

> Specifying a cleaner machine than the code has is easy and useless; specify the one that must survive.

So every transition table carries a **Status** column:

| Status | Meaning |
|---|---|
| `TODAY` | Implemented, at the cited `file:line`. Slices must preserve the behaviour or explicitly justify changing it. |
| `CHANGE` | Exists but behaves differently. The row states the target; the note states what it does now. |
| `NEW` | Does not exist. A slice must add it. |
| `DEFECT` | Exists and is wrong. Fixing it is a named slice requirement, not optional polish. |

A slice is not done when its screens look right. It is done when every `TODAY` row in its machines
still holds and every `NEW`/`CHANGE`/`DEFECT` row it owns has a unit test naming the transition.

---

## 1. Component tree

### 1.1 The target tree

`*` = new in this redesign. `†` = exists, rewritten. Everything else keeps its current contract.

```
AssistantRoute                                   /assistant  (App.tsx:111, React.lazy at :27)
│  role guard: parent → <Navigate to="/family">  (AssistantPage.tsx:197)
│
├─ <AssistantSurfaceProvider> *                  owns: conversation list, selection, search,
│  │                                             archived filter, undo buffer, drawer/sheet state.
│  │                                             ONE provider for web + native (see §1.3).
│  │                                             value must be useMemo'd (CLAUDE.md, frontend rules).
│  │
│  ├─ <ConversationRail> †                       desktop ≥768px: persistent column
│  │   ├─ <RailHeader>                           new-conversation, collapse
│  │   ├─ <ConversationSearch> †                 debounced 250ms (DEFECT D8), Cmd/Ctrl+K target
│  │   ├─ <ArchivedToggle>
│  │   ├─ <ConversationGroup kind="pinned">
│  │   ├─ <ConversationGroup kind="recent">
│  │   │   └─ <ConversationRow> †                inline rename, portalled action menu
│  │   └─ <RailLoadMore> *                       consumes `next` (DEFECT D2)
│  │
│  ├─ <ConversationDrawer> †                     <768px web: overlay drawer, focus trap + restore
│  ├─ <ConversationSheet> †                      Capacitor: bottom sheet (same data, sheet chrome)
│  │
│  └─ <ConversationPane>
│      ├─ <ConversationHeader>                   title, rename, origin chip *, overflow menu
│      ├─ <TranscriptRegion> †                   scroll container; aria-live host (§4)
│      │   ├─ <TranscriptEmpty> †                greeting + hero composer + STARTER_ACTIONS
│      │   ├─ <TranscriptOlderLoader> *          «Ավելի հին» above message 41 (Appendix E)
│      │   ├─ <MessageGroup>
│      │   │   ├─ <UserMessage> †                bubble, attachments, edit-in-place, origin chip *
│      │   │   └─ <AssistantMessage> †
│      │   │       ├─ <AssistantContent>         SHIPPED — content/AssistantContent.tsx
│      │   │       │   └─ <AssistantBlockView>   SHIPPED — callout / checkpoint / diagnosis / markdown
│      │   │       ├─ <ActivityIndicator> †      TypingIndicator + activityLabelFor() (DEFECT D1)
│      │   │       ├─ <MessageStatusNote>        stopped / failed line
│      │   │       └─ <MessageActions> †         copy · listen · regenerate · delete
│      │   │           └─ <RegenerationPager> *  «2/3» — blocked, see §6 B-2
│      │   ├─ <NextActionRow> *                  ONLY from `:::next`. No default set. (§6 D-3)
│      │   └─ <StaleTurnMarker> *                downstream-of-edit marking (§6 D-1)
│      ├─ <JumpToLatest> †                       microcopy change, see §5
│      └─ <Composer> †
│          ├─ <AttachmentTray>                   AttachmentChip list + remove
│          ├─ <ModeChips>                        explain_mode / teach_it_to_me
│          ├─ <ComposerTextarea>                 Enter=send, Shift+Enter=newline, IME-guarded *
│          ├─ <ComposerTools>                    attach · code-fence · mic
│          └─ <SendOrStopButton>
│
└─ <UndoToast> †                                 6s window; must exist on native too (DEFECT D6)

<FloatingAssistantWidget> †                      mounted in AppChrome (ProtectedRoute.tsx:51)
│  hidden on /assistant, hidden for parents, hidden when assistantSuppressed
├─ <WidgetHeader>                                drag handle · expand ⤢ · close
├─ <TranscriptRegion>                            same component, `density="compact"`
└─ <Composer>                                    same component, `density="compact"`
```

### 1.2 Where the `assistant_v2` flag sits

The flag does not exist (audit BLOCK A). It must be introduced before Slice 2 and it must wrap
**exactly two mount points**, so the old path stays byte-identical:

| Mount point | Old | New |
|---|---|---|
| [App.tsx:111](../frontend/src/App.tsx:111) | `AssistantPage` | `AssistantV2Page` |
| [ProtectedRoute.tsx:51](../frontend/src/components/ProtectedRoute.tsx:51) | `FloatingAssistantWidget` | `FloatingAssistantWidgetV2` |

`useConversationChat` is shared by both. It therefore **may not be forked**: changes to it are
changes to the live product, and every `DEFECT` row in SM-1 must be fixed in a way the old surfaces
tolerate. This is the single most important scoping fact in this document.

Flag source: a boolean off the authenticated user, defaulting false, read through one
`useAssistantV2()` hook. No per-component flag reads.

### 1.3 What is shared and what is forked

Today three surfaces each own a near-identical copy of list/selection state
([AssistantPage.tsx:33-43](../frontend/src/pages/AssistantPage.tsx:33),
[MobileAssistant.tsx:34-39](../frontend/src/components/mobile/assistant/MobileAssistant.tsx:34),
[FloatingAssistantWidget.tsx:17-19](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:17)).
The duplication is deliberate and documented, and it is why undo-delete exists on web and not on
native (DEFECT D6).

**Target split:**

| Layer | Shared? | Rationale |
|---|---|---|
| `useConversationChat` (messages + turn) | **shared, already is** | One turn machine. Three would diverge again. |
| `AssistantSurfaceProvider` (list, selection, search, undo) | **shared, new** | Removes the D6 class of bug at the source. |
| Rail vs Drawer vs Sheet chrome | **forked** | Genuinely different interaction models. Data identical. |
| `MessageActions` presentation | **forked** | Hover row (pointer) vs long-press sheet (touch). Same action set — that is the invariant. |
| Composer | **shared, `density` prop** | Three composers is how the widget lost the mode chips. |

**The web/native fork stays `useIsNativeApp()`** ([platform.ts:9](../frontend/src/lib/platform.ts:9)),
which is Capacitor-only. Mobile *web* (audit R4: the 360px Android Chrome majority) gets the web
surface with the drawer, so **the web surface's small-viewport layout is a first-class target, not a
fallback**. Any slice that tests "mobile" only in the Capacitor shell has not tested the majority
device.

---

## 2. State machines

**Conventions.** `S:` state · `E:` event · guards in `[...]`. Effects list observable consequences
only. States are named after what the student can see, not after variable names, except where a
variable name *is* the contract (`sending`, `streamingRef`).

---

### SM-1 · TURN — one send or regenerate, from click to settled

Owner: [useConversationChat.ts](../frontend/src/hooks/useConversationChat.ts). The most important
machine in the product and the one most easily specified wrongly, because its "streaming" flag is a
**ref**, not state (`streamingRef`, [:96](../frontend/src/hooks/useConversationChat.ts:96)), while
`sending` is state ([:93](../frontend/src/hooks/useConversationChat.ts:93)) — and the two do **not**
turn off at the same moment.

#### States

| S | Meaning | Observable |
|---|---|---|
| `idle` | No turn in flight | Composer enabled, Send button |
| `opening` | Request dispatched, no bytes yet | Optimistic user bubble + empty assistant slot; Stop button |
| `waiting` | Stream open, no `delta` yet | `TypingIndicator` with `NEUTRAL_ACTIVITY_LABEL` |
| `tool` | A `tool_call` event is the most recent thing seen | `TypingIndicator` with the mapped tool label |
| `revealing` | Text arriving and/or being paced onto screen | Content grows at ~45 ch/s; pacer self-suspends when caught up and resumes on the next `delta` |
| `draining` | Network finished; pacer still behind | Content still growing; **`sending` is already false** |
| `settled` | Terminal message applied | Real ids, actions available, `:::next` row may appear |
| `stopped` | Student pressed Stop | Frozen content + «Գեներացումը կանգնեցվեց։» |
| `failed` | Provider or transport error | Partial content kept + error line |
| `signed_out` | Refresh token rejected at stream open | Redirect to `/login` |

Optimistic ids: user `-1` (`PENDING_USER_ID`), assistant `-2` (`PENDING_ASSISTANT_ID`)
([:6-7](../frontend/src/hooks/useConversationChat.ts:6)). Any action guarded on `id > 0` is guarded
on "this row is persisted".

#### Transitions

| # | From | Event | Guard | To | Effects | Status |
|---|---|---|---|---|---|---|
| T1 | `idle` | `sendMessage(text, attachmentIds, ctx)` | `conversationId != null` && `!streamingRef` | `opening` | `streamingRef=true`; `sending=true`; reset `fullContent`/`revealedLen`/`pendingFinal`; append rows `-1` and `-2` | TODAY [:239-254](../frontend/src/hooks/useConversationChat.ts:239) |
| T2 | `idle` | `regenerate(messageId)` | `!streamingRef` | `opening` | Replace target row with pending row `-2` — **the previous answer is destroyed client-side** | TODAY [:275-288](../frontend/src/hooks/useConversationChat.ts:275) |
| T3 | `opening` | HTTP 401 | — | `opening` | One shared refresh, one retry, via `refreshAccessTokenShared()` | TODAY [:53-62](../frontend/src/hooks/useConversationChat.ts:53) |
| T4 | `opening` | refresh rejected | — | `signed_out` | `tokenStorage.clear()`; `location.href="/login"` | TODAY [:222-225](../frontend/src/hooks/useConversationChat.ts:222) |
| T5 | `opening` | `!response.ok` | — | `failed` | Generic transport error | TODAY [:63-65](../frontend/src/hooks/useConversationChat.ts:63) |
| T6 | `opening` | `user_message` | send path only | `waiting` | Swap row `-1` for the persisted message (real id + attachments) | TODAY [:189-191](../frontend/src/hooks/useConversationChat.ts:189) |
| T7 | `waiting`\|`revealing` | `tool_call` | — | `tool` | Label = `activityLabelFor(tool_name)` | **CHANGE** — today sets the raw `tool_name` [:193](../frontend/src/hooks/useConversationChat.ts:193); mapping shipped at [toolLabels.ts:81](../frontend/src/lib/assistantContent/toolLabels.ts:81), unwired (DEFECT D1) |
| T8 | `tool`\|`revealing` | `tool_call_reset` | — | `waiting` | `stopReveal()`; `fullContent=""`; `revealedLen=0`; label cleared; row `-2` content cleared | TODAY [:195-204](../frontend/src/hooks/useConversationChat.ts:195) |
| T9 | `waiting`\|`tool` | `delta` | — | `revealing` | `fullContent += content`; label cleared; `ensureRevealing()` | TODAY [:205-209](../frontend/src/hooks/useConversationChat.ts:205) |
| T10 | `revealing` | rAF tick | `backlog > 0` | `revealing` | Reveal ⌊budget⌋ chars. Base 45 ch/s; above 140 chars backlog the rate scales with backlog | TODAY [:141-168](../frontend/src/hooks/useConversationChat.ts:141) |
| T11 | `revealing` | rAF tick | `backlog == 0` && no `pendingFinal` | `revealing` | Pacer suspends; resumes on next `delta` | TODAY [:166-173](../frontend/src/hooks/useConversationChat.ts:166) |
| T12 | `waiting`\|`tool`\|`revealing` | `message` | — | `draining` | `pendingFinal = message`; `ensureRevealing()` — **never snap** | TODAY [:210-217](../frontend/src/hooks/useConversationChat.ts:210) |
| T13 | `waiting`\|`tool`\|`revealing` | `error` | — | `draining` | Same queued path; `status="failed"`; streamed content **kept**, not erased | TODAY [:210-217](../frontend/src/hooks/useConversationChat.ts:210) |
| T14 | `draining` | rAF tick | `backlog == 0` | `settled` | Replace row `-2` with the terminal message | TODAY [:174-178](../frontend/src/hooks/useConversationChat.ts:174) |
| T15 | `revealing`\|`draining` | fetch settles (`finally`) | — | *(unchanged)* | `streamingRef=false`; `sending=false`; label cleared | TODAY [:267-272](../frontend/src/hooks/useConversationChat.ts:267) |
| T16 | any active | `stopGeneration()` | `streamingRef` | `stopped` | `streamingRef=false` **then** `abort()`; freeze at `revealedLen` (not `fullContent`); `pendingFinal=null` | TODAY [:309-325](../frontend/src/hooks/useConversationChat.ts:309) |
| T17 | any active | network throw | `!signal.aborted` | `failed` | Freeze at `revealedLen`; `error_message = "Կապի խնդիր առաջացավ։"` | TODAY [:228-236](../frontend/src/hooks/useConversationChat.ts:228) |
| T18 | any active | network throw | `signal.aborted` | *(no-op)* | T16 already applied the state | TODAY [:227](../frontend/src/hooks/useConversationChat.ts:227) |
| T19 | any active | `conversationId` changes | — | `idle` | **Abort the turn and release `sending`.** The server's `finally` persists the partial answer with `status="stopped"`, so nothing is lost and it appears on return | **DEFECT** — see below |
| T20 | any active | unmount | — | — | `stopReveal()` + `abort()` | TODAY [:124-130](../frontend/src/hooks/useConversationChat.ts:124) |

#### T19 — the defect this machine must fix

The abort effect's dependency array is `[]`
([:129](../frontend/src/hooks/useConversationChat.ts:129)), so its cleanup runs **only on unmount**.
Selecting a different conversation while a reply streams therefore does not abort anything:

1. The message-list effect resets `messages` and refetches for the new conversation ([:105-122](../frontend/src/hooks/useConversationChat.ts:105)).
2. The old stream keeps running. `streamingRef` stays `true`, so `sending` stays `true`.
3. Every `setMessages` from the pacer now maps over the **new** conversation's array looking for id `-2`, finds nothing, and silently discards the answer.
4. The composer in the newly opened conversation stays disabled until the abandoned stream ends.

Observable result: switch conversations mid-answer and the new conversation is frozen for as long as
the old answer takes, with no indication why. The answer itself survives server-side
([message_service.py:391-409](../backend/apps/ai_assistant/services/message_service.py:391)), so
aborting is lossless and is the correct fix.

**Slice 2 requirement:** bind the turn to the conversation it started in; abort on change; assert with
a unit test that `sending` returns to `false` on conversation switch.

#### Two consequences to design around (not defects — invariants)

1. **`sending` false ≠ finished.** T15 fires when the *network* completes, which is before the pacer
   drains (T14). Between them: the composer re-enables, and the Stop control has already reverted to
   Send while text is still visibly arriving. Any UI that asks "is a turn in progress?" must ask the
   machine, not `sending`. Surfaces already avoid showing the `:::next` row too early only because
   they additionally test `status !== "sending" && id > 0`
   ([AssistantPage.tsx:134-138](../frontend/src/pages/AssistantPage.tsx:134)) — keep that guard.
2. **Local `stopped` is authoritative; the server's is never reconciled.** T16 clears `streamingRef`
   *before* aborting, so the guard at
   [:187](../frontend/src/hooks/useConversationChat.ts:187) drops any events already in flight. The
   server may persist more content than the student saw. On reload the message grows. This is
   acceptable and must be *documented in the UI's* stopped state, not silently reconciled mid-turn.

---

### SM-2 · MESSAGE — one row in the transcript

Owner: `MessageBubble` / `MobileMessageBubble`, with server calls through `useConversationChat`.

#### States

| S | Applies to | Observable |
|---|---|---|
| `streaming` | assistant | Content growing, or `TypingIndicator` when empty |
| `settled` | both | Full action set |
| `stopped` | assistant | Partial content + «Գեներացումը կանգնեցվեց։»; **regenerate available** |
| `failed` | assistant | Partial content + error line; **regenerate available** |
| `editing` | user only | Textarea + Պահպանել / Չեղարկել |
| `stale` * | both | Downstream of an edited turn — see §6 D-1 |
| `removing` | both | Optimistically removed from the list |

#### Transitions

| # | From | Event | Guard | To | Effects | Status |
|---|---|---|---|---|---|---|
| M1 | `settled` | `Խմբագրել` | `role=="user"` && `id>0` | `editing` | Draft seeded from content; autofocus | TODAY [MessageBubble.tsx:174-178](../frontend/src/components/assistant/MessageBubble.tsx:174) |
| M2 | `editing` | `Պահպանել` | draft non-empty && changed | `settled` | `PATCH messages/<id>/`, then regenerate the following assistant message | TODAY [:66-71](../frontend/src/components/assistant/MessageBubble.tsx:66), [useConversationChat.ts:327-338](../frontend/src/hooks/useConversationChat.ts:327) |
| M3 | `editing` | `Չեղարկել` **or `Esc`** | — | `settled` | Restore draft from content | **CHANGE** — Esc is not handled today; only the sidebar rename field handles it ([ConversationSidebar.tsx:75](../frontend/src/components/assistant/ConversationSidebar.tsx:75)) |
| M4 | `editing` | save rejected | — | `editing` | **Keep the draft**, show the error inline | **NEW** — today `editMessage` is unguarded ([:327-329](../frontend/src/hooks/useConversationChat.ts:327)); a rejected PATCH throws into the click handler and the draft is lost. Appendix C makes losing typed input a P0. |
| M5 | `settled`\|`stopped`\|`failed` | `Կրկին փորձել` | `role=="assistant"` && `id>0` && `!streamingRef` | → SM-1 `opening` | Row is replaced by pending row `-2` | TODAY [:191-195](../frontend/src/components/assistant/MessageBubble.tsx:191) |
| M6 | any | `Ջնջել` | `id>0` | `removing` → gone | `DELETE messages/<id>/`; optimistic filter | TODAY [useConversationChat.ts:340-343](../frontend/src/hooks/useConversationChat.ts:340) |
| M7 | any with content | `Պատճենել` | not editing, not pending | *(same)* | Clipboard write; label flips to «Պատճենվեց» for 1500ms | TODAY [:38-42](../frontend/src/components/assistant/MessageBubble.tsx:38) |
| M8 | `settled` | edit of an earlier user turn | this row is after the edited turn and after the first regenerated answer | `stale` | Mark, do not delete | **NEW** — §6 D-1 |
| M9 | — | regeneration sibling paging | — | — | — | **BLOCKED** — §6 B-2 |

#### TTS sub-machine (`Լսել`)

| S | Observable |
|---|---|
| `tts_idle` | «Լսել» |
| `tts_synthesizing` | «…», control disabled |
| `tts_ready` | Audio loaded; click replays from 0 |
| `tts_error` | Warning icon + «Կրկին» |

| # | From | Event | To | Effects | Status |
|---|---|---|---|---|---|
| V1 | `tts_idle` | click | `tts_synthesizing` | `POST voice/synthesize/` with voice `nova` | TODAY [:52-58](../frontend/src/components/assistant/MessageBubble.tsx:52) |
| V2 | `tts_synthesizing` | blob | `tts_ready` | Object URL → `new Audio(...)`, play | TODAY [:55-58](../frontend/src/components/assistant/MessageBubble.tsx:55) |
| V3 | `tts_ready` | click | `tts_ready` | `currentTime=0`; replay, **no re-synthesis** | TODAY [:45-51](../frontend/src/components/assistant/MessageBubble.tsx:45) |
| V4 | any | request throws | `tts_error` | Warning + «Կրկին» | TODAY [:59-61](../frontend/src/components/assistant/MessageBubble.tsx:59) |
| V5 | `tts_ready` | unmount / navigate | `tts_idle` | **Cache lost, next play re-bills OpenAI** | **DEFECT D7** — cache is a component ref ([:34](../frontend/src/components/assistant/MessageBubble.tsx:34)). Slice 3 lifts it to a module-level `Map<messageId, objectURL>`; durable caching is a backend ask. |
| V6 | `tts_ready` | a second message starts playing | `tts_ready` | **Stop the first** | **NEW** — nothing coordinates two `<audio>` elements today; two answers can speak over each other. |

---

### SM-3 · COMPOSER

Owner: [MessageInput.tsx](../frontend/src/components/assistant/MessageInput.tsx).

#### States

| S | Observable |
|---|---|
| `empty` | Placeholder; Send disabled |
| `draft` | Text and/or attachments present; Send enabled |
| `uploading` | Attach/Send disabled while a file is in flight |
| `drag_over` | Drop target highlighted |
| `locked` | Textarea disabled — **today: whenever a turn is streaming** |
| `recording` / `transcribing` | Composer body replaced — see SM-4 |

#### Transitions

| # | From | Event | Guard | To | Effects | Status |
|---|---|---|---|---|---|---|
| C1 | `empty` | typing | — | `draft` | — | TODAY |
| C2 | `draft` | `Enter` | no Shift, **no IME composition** | `empty` | Send; clear text, attachments, mode | **CHANGE** — Enter is handled ([:202-207](../frontend/src/components/assistant/MessageInput.tsx:202)); the IME guard does not exist anywhere in the repo (`isComposing` has zero hits) |
| C3 | `draft` | `Shift+Enter` | — | `draft` | Newline | TODAY [:203](../frontend/src/components/assistant/MessageInput.tsx:203) |
| C4 | any | file chosen / dropped | — | `uploading` → `draft` | Files uploaded **serially**, each awaited | TODAY [:163-176](../frontend/src/components/assistant/MessageInput.tsx:163) |
| C5 | `uploading` | upload rejected | — | `draft` | Inline error; **typed text preserved** | TODAY [:171-172](../frontend/src/components/assistant/MessageInput.tsx:171) |
| C6 | `draft` | send with an image and empty text | `hasImage` | `empty` | Content becomes the homework auto-prompt; mode `homework_solver` | TODAY [:190-193](../frontend/src/components/assistant/MessageInput.tsx:190) |
| C7 | `draft` | mode chip | — | `draft` | Toggle; an explicit pick **beats** the inferred `homework_solver` | TODAY [:193](../frontend/src/components/assistant/MessageInput.tsx:193), [:249](../frontend/src/components/assistant/MessageInput.tsx:249) |
| C8 | `draft` | send | — | `empty` | Mode is **cleared after every send** | TODAY [:199](../frontend/src/components/assistant/MessageInput.tsx:199) — note Appendix E's regression row "mode selection persists" contradicts this; see §6 D-4 |
| C9 | `draft` | code-fence button | — | `draft` | Wrap selection in ``` fences, caret inside | TODAY [:209-223](../frontend/src/components/assistant/MessageInput.tsx:209) |
| C10 | any | turn starts | — | `locked` | **Target: text stays editable; only Send is replaced by Stop** | **CHANGE** — today `disabled={sending}` disables the textarea itself ([:310](../frontend/src/components/assistant/MessageInput.tsx:310), fed from [AssistantPage.tsx:346](../frontend/src/pages/AssistantPage.tsx:346)), so a student cannot draft the next question while the answer arrives |
| C11 | `locked` | Stop | — | `draft` | → SM-1 T16 | TODAY [:355-363](../frontend/src/components/assistant/MessageInput.tsx:355) |
| C12 | `draft` | attachments uploaded, never sent | — | — | Orphan `Attachment` rows with `message=null` persist | **NEW** — on unmount, delete unsent attachments ([`deleteAttachment`](../frontend/src/api/assistant.ts:155) exists and 400s once sent) |
| C13 | `empty` | `↑` | composer empty, a user message exists | `empty` | Put the last user message into `editing` (SM-2 M1) | **NEW** — Appendix D. Requires a callback from the surface; the composer has no access to the message list today. |

---

### SM-4 · VOICE INPUT

Owner: [MessageInput.tsx:79-161](../frontend/src/components/assistant/MessageInput.tsx:79).
The invariant Appendix E tests for — **transcription never auto-sends** — is already true and is
documented in the source ([:120-123](../frontend/src/components/assistant/MessageInput.tsx:120)).

| S | Observable |
|---|---|
| `voice_idle` | Mic button |
| `voice_denied` | «Խնդրում ենք թույլատրել մուտք դեպի խոսափողը։» |
| `recording` | Pulsing dot, `m:ss` timer, ✕ cancel and ✓ finish |
| `transcribing` | «…» in the mic slot |
| `voice_error` | Inline error, composer restored, **draft intact** |

| # | From | Event | Guard | To | Effects | Status |
|---|---|---|---|---|---|---|
| R1 | `voice_idle` | mic | `getUserMedia` exists | `recording` | Mime picked from `MediaRecorder.isTypeSupported` (webm → mp4 → ogg) | TODAY [:79-109](../frontend/src/components/assistant/MessageInput.tsx:79) |
| R2 | `voice_idle` | mic | no `mediaDevices` | `voice_denied` | «Ձայնագրումն այս սարքում հասանելի չէ։» | TODAY [:81-84](../frontend/src/components/assistant/MessageInput.tsx:81) |
| R3 | `voice_idle` | permission rejected | — | `voice_denied` | — | TODAY [:106-108](../frontend/src/components/assistant/MessageInput.tsx:106) |
| R4 | `recording` | ✕ | — | `voice_idle` | `cancelledRef=true`; audio discarded, never uploaded | TODAY [:111-118](../frontend/src/components/assistant/MessageInput.tsx:111) |
| R5 | `recording` | ✓ | duration ≥ 1s | `transcribing` | `POST voice/transcribe/` | TODAY [:124-161](../frontend/src/components/assistant/MessageInput.tsx:124) |
| R6 | `recording` | ✓ | duration < 1s | `voice_error` | «Ձայնագրությունը չափազանց կարճ է։» | TODAY [:136-139](../frontend/src/components/assistant/MessageInput.tsx:136) |
| R7 | `transcribing` | text returned | — | `draft` | **Appended** to existing text, never replacing it. No send. | TODAY [:150](../frontend/src/components/assistant/MessageInput.tsx:150) |
| R8 | `transcribing` | request fails | — | `voice_error` | «Ձայնը չհաջողվեց ճանաչել։» | TODAY [:151-152](../frontend/src/components/assistant/MessageInput.tsx:151) |
| R9 | `recording` | unmount | — | `voice_idle` | Tracks stopped, timer cleared | TODAY [:72-77](../frontend/src/components/assistant/MessageInput.tsx:72) |
| R10 | `recording` | `Esc` | — | `voice_idle` | Same as R4 | **NEW** — Appendix D's Esc order must include cancelling a recording, before closing panels |
| R11 | `recording` | 5 min elapsed | — | `transcribing` | Auto-finish | **NEW** — no cap today; a forgotten recording uploads unbounded audio to a 20/min-throttled endpoint |

---

### SM-5 · CONVERSATION LIFECYCLE

Server truth: soft delete via `deleted_at` with a default manager that hides it
([models.py:12-39](../backend/apps/ai_assistant/models.py:12)); restore uses `all_objects`
([views.py:146](../backend/apps/ai_assistant/views.py:146)). **The 6-second undo window is purely a
client toast timer** ([AssistantPage.tsx:186](../frontend/src/pages/AssistantPage.tsx:186)) — the row
stays restorable indefinitely and there is no purge job.

| S | Observable |
|---|---|
| `active` | In the recent group |
| `pinned` | In the pinned group; sorts first (`Meta.ordering`, [models.py:42](../backend/apps/ai_assistant/models.py:42)) |
| `archived` | Visible only with the archived filter on |
| `renaming` | Inline text field in the row |
| `deleted` | Gone from the list; undo toast for 6s |

| # | From | Event | To | Effects | Status |
|---|---|---|---|---|---|
| K1 | — | `Նոր զրույց` | `active`, selected | `POST conversations/`; prepend; close drawer/sheet | TODAY [AssistantPage.tsx:140-145](../frontend/src/pages/AssistantPage.tsx:140) |
| K2 | list empty, no search, no archived filter | first load | `active`, selected | Auto-create once, guarded by a ref so a zero-result search cannot spawn conversations | TODAY [:77-85](../frontend/src/pages/AssistantPage.tsx:77) |
| K3 | `active` | pin / unpin | `pinned` / `active` | Row replaced from the response; no full refetch | TODAY [:159-166](../frontend/src/pages/AssistantPage.tsx:159) |
| K4 | `active` | archive / unarchive | `archived` / `active` | **Full refetch** (the row leaves the current filter) | TODAY [:168-177](../frontend/src/pages/AssistantPage.tsx:168) |
| K5 | `active` | rename | `renaming` → `active` | `PATCH`; empty or unchanged title is a no-op | TODAY [ConversationSidebar.tsx:55-60](../frontend/src/components/assistant/ConversationSidebar.tsx:55) |
| K6 | `renaming` | `Esc` | `active` | Discard draft | TODAY [:75](../frontend/src/components/assistant/ConversationSidebar.tsx:75) |
| K7 | any | delete | `deleted` | `DELETE`; drop from list; clear selection if it was selected; toast for 6s | TODAY [AssistantPage.tsx:179-188](../frontend/src/pages/AssistantPage.tsx:179) |
| K8 | `deleted` | `Հետարկել` | `active` | `POST restore/`; refetch | TODAY [:190-195](../frontend/src/pages/AssistantPage.tsx:190) |
| K9 | `deleted` | delete on native | `deleted` | **Undo must exist here too** | **DEFECT D6** — [ConversationSheet.tsx:194](../frontend/src/components/mobile/assistant/ConversationSheet.tsx:194) has no undo; the endpoint is already there |
| K10 | — | search input | — | Debounced 250ms via the existing [`useDebouncedCallback`](../frontend/src/hooks/useDebouncedCallback.ts) | **DEFECT D8** — one request per keystroke today ([AssistantPage.tsx:59-69](../frontend/src/pages/AssistantPage.tsx:59)) |
| K11 | — | scroll to end of list | — | Fetch `next` and append | **DEFECT D2** — `count`/`next` are discarded ([api/assistant.ts:73](../frontend/src/api/assistant.ts:73)); only the first 20 conversations are reachable |
| K12 | any | delete while its turn streams | `deleted` | Abort the turn first (SM-1 T19) | **NEW** |

**Search scope, stated so no slice over-promises:** the server matches `title__icontains` only
([conversation_service.py:13](../backend/apps/ai_assistant/services/conversation_service.py:13)), and
titles are the first 60 characters of the opening message. Message bodies are not searched. The
placeholder must therefore not imply full-text search — see §5.

---

### SM-6 · SURFACE — list + selection

| S | Observable |
|---|---|
| `list_loading` | Rail skeleton |
| `list_error` | `ErrorState` with retry |
| `no_selection` | `EmptyState` (reachable only when every conversation was just deleted) |
| `messages_loading` | Transcript skeleton |
| `messages_error` | `messagesFailed` — the widget drops the id and starts fresh ([FloatingAssistantWidget.tsx:49-53](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:49)); the page has no equivalent |
| `conversation_empty` | Greeting + hero composer + `STARTER_ACTIONS` |
| `conversation` | Transcript |

| # | Event | Effect | Status |
|---|---|---|---|
| U1 | Load with no selection | Select `data[0]` | TODAY [AssistantPage.tsx:62](../frontend/src/pages/AssistantPage.tsx:62) |
| U2 | Widget → `⤢` expand | **Carry the conversation id** to the page | **DEFECT R8** — today a bare `<Link to="/assistant">` ([FloatingAssistantWidget.tsx:124](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:124)); the page then picks `data[0]`, so with any conversation pinned the student lands somewhere else. Target: `/assistant?c=<id>`, Slice 5. |
| U3 | Widget first open | Create a conversation eagerly | TODAY [:55-65](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:55) — note this mints a conversation per widget session, and every contextual entry point lands here |
| U4 | `askAboutQuestion(request)` | Open widget, ensure a conversation, send once the list has loaded; `dispatchedLaunchRequestRef` prevents StrictMode double-send | TODAY [:73-89](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:73) |
| U5 | `assistantSuppressed` | Widget unmounts entirely (mock exam taken without AI) | TODAY [:95](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:95) |
| U6 | Help Center → assistant | Carry the article context | **NEW** — plain `<Link>` today ([HelpCenterPage.tsx:199](../frontend/src/pages/HelpCenterPage.tsx:199)), no question, no context |
| U7 | Transcript > 60 messages | Render the last 40 + «Ավելի հին» | **NEW** — Appendix E |
| U8 | New content while scrolled up | Show jump-to-latest, never auto-scroll | TODAY [AssistantPage.tsx:93-119](../frontend/src/pages/AssistantPage.tsx:93) — the `isNearBottomRef` + instant-scroll approach is correct; do not replace it with smooth scrolling |

---

## 3. Keyboard map

**Scope rule, and it is load-bearing:** the floating widget mounts on *every* authenticated page
([ProtectedRoute.tsx:51](../frontend/src/components/ProtectedRoute.tsx:51)). A document-level
`Cmd/Ctrl+K` would hijack the shortcut on every screen in the product. Therefore:

- `Cmd/Ctrl+K` and `Cmd/Ctrl+Shift+O` bind on the **assistant surface root**, and only when it has
  focus within it, or when the widget is open and focused.
- `Enter`, `Shift+Enter`, `↑`, `Cmd/Ctrl+Enter` bind on the **composer**.
- `Esc` binds on the surface root, with the ordered fallthrough below.
- No handler may fire while `event.isComposing` (or `keyCode === 229`) is true. No IME guard exists
  anywhere in the repo today — this is new code, not a review note.

| Key | Action | Bound to | Status |
|---|---|---|---|
| `Enter` | Send | Composer textarea, no modifier | TODAY [MessageInput.tsx:202-207](../frontend/src/components/assistant/MessageInput.tsx:202) — **needs the IME guard** |
| `Shift+Enter` | Newline | Composer textarea | TODAY |
| `Cmd/Ctrl+Enter` | Stop generation | Surface root, while a turn is active | **NEW** |
| `Cmd/Ctrl+K` | Focus search | Surface root | **NEW** — on <768px must open the drawer/sheet first, then focus |
| `Cmd/Ctrl+Shift+O` | New conversation | Surface root | **NEW** |
| `↑` | Edit last user message | Composer, only when empty | **NEW** — SM-3 C13 |
| `Esc` | Ordered fallthrough (below) | Surface root | **NEW** |

**`Esc` order — first match wins, and it never closes the conversation:**

1. Cancel an in-progress voice recording (SM-4 R10)
2. Cancel message edit-in-place (SM-2 M3)
3. Cancel conversation rename (SM-5 K6 — already works)
4. Close the row action menu
5. Close the widget / drawer / sheet
6. *(nothing)*

**Focus restoration is a requirement, not a nicety.** Closing any overlay returns focus to the
element that opened it: drawer → hamburger ([AssistantPage.tsx:244-251](../frontend/src/pages/AssistantPage.tsx:244)),
row menu → its `MoreIcon` trigger ([ConversationSidebar.tsx](../frontend/src/components/assistant/ConversationSidebar.tsx:110)),
widget → the launcher button ([FloatingAssistantWidget.tsx:186](../frontend/src/components/assistant/FloatingAssistantWidget.tsx:186)),
edit → the `Խմբագրել` button. The drawer and the sheet need focus traps; neither has one today.

---

## 4. Announcement contract (accessibility)

The audit found **no live region anywhere in the assistant** (D9): streaming answers, errors and the
stopped state are all silent to a screen reader. Appendix E's rule is that the *completed* message is
announced, never each token — per-token announcement makes a screen reader unusable.

| Region | Attributes | Announces | Status |
|---|---|---|---|
| Transcript | `role="log"` `aria-live="polite"` `aria-relevant="additions"` | On `settled` only: the assistant's completed text | **NEW** |
| Activity indicator | `aria-live="polite"` | The tool label, once per `tool_call` | **NEW** (mapping shipped; wiring is Slice 2) |
| In-progress block | `aria-busy` | Already correct — see [blocks.tsx:46-48](../frontend/src/components/assistant/content/blocks.tsx:46) | TODAY |
| Errors / stopped | `role="status"` | The error line verbatim | **NEW** |
| Undo toast | `role="status"` | «…ջնջվեց», with a reachable undo control | **CHANGE** |
| Message actions | — | Must be reachable without hover: `sm:group-focus-within:opacity-100` | TODAY [MessageBubble.tsx:157](../frontend/src/components/assistant/MessageBubble.tsx:157) — keep it |

Mechanism: keep the streaming text **out** of the live region (render it `aria-hidden` while
`streaming`), and write the finished text into a visually-hidden live node on the T14 transition.
Announcing the visible node directly cannot work — it mutates ~60×/sec.

---

## 5. Microcopy

**Decision:** one module, `frontend/src/components/assistant/copy.ts`, exporting a flat frozen object.
**Not** an i18n library — the app has none and adopting one is a repo-wide decision (CLAUDE.md), not
an assistant slice's call. The audit counts ~109 hardcoded Armenian literals across the assistant
files; migrating them is real work with real regression risk, so it is scoped **per slice**: a slice
migrates the strings in the files it already touches, and nothing else.

Deltas between Appendix C and the shipped strings — Appendix C wins except where noted:

| Key | Appendix C | In code today | Resolution |
|---|---|---|---|
| new conversation | Նոր զրույց | Նոր զրույց | ✓ [AssistantPage.tsx:277](../frontend/src/pages/AssistantPage.tsx:277) |
| search | Փնտրել զրույցներում | «Փնտրել» (web, [ConversationSidebar.tsx:234](../frontend/src/components/assistant/ConversationSidebar.tsx:234)) / «Փնտրել զրույց» (native, [ConversationSheet.tsx:103](../frontend/src/components/mobile/assistant/ConversationSheet.tsx:103)) | **Use «Փնտրել զրույցի վերնագրերում»** — search is title-only (SM-5); «զրույցներում» promises full-text search the backend does not do |
| attach | Կցել ֆայլ | Կցել նկար կամ ֆայլ | Keep the longer form — the picker accepts 9 types and the image case is the common one |
| new answer pill | ↓ Նոր պատասխան | ↓ Ցույց տալ վերջինը | Adopt Appendix C's on the page; the native control is icon-only with an `aria-label` ([MobileAssistant.tsx:203](../frontend/src/components/mobile/assistant/MobileAssistant.tsx:203)) — keep it icon-only, change the label |
| greeting | Ողջու՛յն, {username} 👋 … | Two lines, no emoji ([WelcomeMessage.tsx:22-24](../frontend/src/components/assistant/WelcomeMessage.tsx:22)) | **Keep the code's — drop the emoji.** Commit `edcb970` ("take the emoji out of the shared chrome") is a standing repo decision; Appendix C predates it |
| homework auto-prompt | Կցեցի տնային… | identical | ✓ [MessageInput.tsx:190](../frontend/src/components/assistant/MessageInput.tsx:190) |
| listen / retry / modes | Լսել · Կրկին փորձել · Բացատրիր · Սովորեցրու ինձ | identical | ✓ |

Error copy rules: name what happened and what to do; no codes, no apologies. **Never lose typed
input** on any failure path (SM-2 M4, SM-3 C5).

---

## 6. Spec decisions that need confirmation before Slice 2

These change behaviour students can see. Each states a default so work is not blocked; each should be
confirmed rather than assumed.

**D-1 · Editing a message leaves downstream turns stale.** Today `editMessage` regenerates only the
*first* following assistant message; every later turn stays on screen, silently built on the pre-edit
text ([useConversationChat.ts:331-337](../frontend/src/hooks/useConversationChat.ts:331), audit D3).
The two clean options are truncate-the-branch (destructive, needs a confirm) and mark-downstream-stale
(non-destructive).
**Default: mark stale.** A student editing a question is usually correcting a typo, and deleting a
long tutoring thread as a side effect of a typo fix is unrecoverable — the API has no undo for
messages. Stale marking is honest, reversible, and frontend-only. SM-2 M8.

**D-2 · Regeneration history stays invisible this cycle.** Rows exist with `regenerated_from` and
`is_active_response`, but `GET messages/` filters to the active response and **no endpoint exposes
siblings** ([views.py:176](../backend/apps/ai_assistant/views.py:176), audit D5). A «2/3» pager cannot
be built frontend-only. **Default: keep the previous answer in memory for the session only**, so
"back to previous" works until reload, and file the endpoint in `docs/assistant-backend-asks.md`.
Nothing in the UI may imply durable version history.

**D-3 · The post-answer action row must stop being hardcoded.** Appendix B rule 5 and the shipped
parser both say `:::next` is the only source of the action row, and that no default set may exist —
"a generic suggestion under a specific answer tells the student the assistant was not listening".
[AssistantPage.tsx:320-328](../frontend/src/pages/AssistantPage.tsx:320) currently renders the
hardcoded `FOLLOW_UP_ACTIONS` after *every* completed answer.
**Default: delete the post-answer default set** and render the row only from `parsed.next`. Keep
`STARTER_ACTIONS` on the empty state — those are openers, not follow-ups, and Appendix C explicitly
allows starter chips provided they send real prompts through the real pipeline, which they do
([WelcomeMessage.tsx:36-41](../frontend/src/components/assistant/WelcomeMessage.tsx:36)). This has a
prerequisite: the system prompt must reliably emit `:::next`, so ship D-3 only after checking real
model output, or the tutoring moves disappear.

**D-4 · Mode persistence.** Appendix E's regression checklist has a row "mode selection persists",
but the composer clears the mode after every send
([MessageInput.tsx:199](../frontend/src/components/assistant/MessageInput.tsx:199)).
**Default: persist the mode for the conversation**, since «Սովորեցրու ինձ» describes how the student
wants to be taught, not one message — with a visible, one-tap way to turn it off.

**D-5 · Typing while an answer streams.** SM-3 C10. **Default: allow it.**

**Blocked on backend (→ `docs/assistant-backend-asks.md`, to be created by the first slice that hits
one):** durable TTS caching (D7/V5 — Appendix E's "TTS cached replay" row *cannot* pass without it);
regeneration siblings (D-2); true cancellation of the upstream provider call (audit R9 — Stop stops
the display and the bill keeps running); message-body search; `extracted_text` for PDFs, which today
reach the model as a filename and nothing else.

**Unsatisfiable DoD lines, stated now rather than discovered per slice:** there is no E2E harness in
the repo (audit BLOCK A), so every "Playwright specs … all green" line requires standing one up first
— a dev dependency, a seeded account, a running stack, and `AI_PROVIDER=mock`
([settings.py:397](../backend/config/settings.py:397)), which streams deterministically and triggers
tool calls off keywords, making it genuinely suitable. Budget it as its own task before Slice 2 or
downgrade the DoD honestly. There is also no recorded device/network baseline, so Appendix E's "p75
on throttled 4G" is a target to measure against a chosen profile, not a fact anyone can verify here.

---

## 7. Slice ownership

| Slice | Machines it owns | Must-fix rows |
|---|---|---|
| 2 · Conversation surface | SM-1, SM-2 | T7 (D1 labels), **T19 (conversation-switch abort)**, M3/M4 (Esc + draft preservation), M8 (D-1), §4 live regions, D-3 |
| 3 · Composer & multimodal | SM-3, SM-4 | C2 (IME), C10 (D-5), C12 (orphan attachments), V5/V6 (TTS), R10/R11 |
| 4 · Conversation lifecycle | SM-5, SM-6 | K9 (D6 native undo), K10 (D8 debounce), K11 (D2 pagination), K12, focus traps |
| 5 · Intelligence layer | SM-6 | U2 (widget↔page continuity), U6 (Help Center), origin chips from `educational_context` — stored on every message ([message_service.py:202](../backend/apps/ai_assistant/services/message_service.py:202)) and read by nothing on the client |

Cross-cutting, every slice: token-guard coverage grows by the files that slice migrates
([assistantDesignTokens.test.ts](../frontend/src/test/assistantDesignTokens.test.ts) names the
remaining set), microcopy moves to `copy.ts` for touched files only, and the keyboard map's
surface-scoped bindings land with Slice 2 since that is where the surface root is built.
