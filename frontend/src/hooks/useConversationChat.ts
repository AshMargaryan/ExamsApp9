import { useEffect, useRef, useState } from "react";
import * as assistantApi from "../api/assistant";
import type { EducationalContext, Message, SSEEvent } from "../api/assistant";
import { refreshAccessTokenShared, tokenStorage } from "../api/client";

const PENDING_USER_ID = -1;
const PENDING_ASSISTANT_ID = -2;

// Real provider chunks arrive in irregular bursts (a handful of tokens at
// once, then a gap) — rendering each burst the instant it lands still looks
// jerky even batched per animation frame. These pace the *display* of
// already-arrived text into a steady trickle instead: frame-driven (not a
// fixed per-character setTimeout), and self-adjusting — a big backlog
// reveals faster so the UI never lags noticeably behind what's actually
// arrived, small ones reveal at the calmer base pace.
const BASE_REVEAL_CHARS_PER_SEC = 45;
const REVEAL_CATCHUP_BACKLOG_CHARS = 140;

class StreamAuthError extends Error {}

function pendingMessage(
  conversationId: number, role: "user" | "assistant", id: number, content = "",
): Message {
  return {
    id, conversation: conversationId, role, content, status: "sending",
    error_message: "", created_at: new Date().toISOString(), edited_at: null,
    model_used: "", provider: "", response_time_ms: null, token_usage: null,
    educational_context: null, is_active_response: true, attachments: [],
  };
}

/** Consumes an SSE POST response chunk-by-chunk, calling onEvent for every
 * parsed event as soon as its "\n\n"-terminated block is complete — chunks
 * from fetch/ReadableStream don't align to event boundaries, so a partial
 * trailing block is always carried over to the next read. One refresh-and-
 * retry on a 401 at stream-open, reusing the same in-flight refresh axios's
 * interceptor uses (see client.ts) so the two never race the same
 * rotate-on-use refresh token. */
async function streamRequest(
  url: string, body: unknown, signal: AbortSignal, onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const doFetch = (token: string | null) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
      signal,
    });

  let response = await doFetch(tokenStorage.getAccess());
  if (response.status === 401) {
    let newAccess: string;
    try {
      newAccess = await refreshAccessTokenShared();
    } catch {
      throw new StreamAuthError("Session expired");
    }
    response = await doFetch(newAccess);
  }
  if (!response.ok || !response.body) {
    throw new Error(`Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (!line.startsWith("data: ")) continue; // skip ": keep-alive" comments / blank lines
        onEvent(JSON.parse(line.slice("data: ".length)) as SSEEvent);
      }
    }
  }
}

/** Shared message-list + send/edit/delete/regenerate logic for a single
 * conversation, used by both the full assistant page and the floating
 * widget so they behave identically. Sending/regenerating stream the
 * answer in over SSE instead of awaiting one full response. */
export function useConversationChat(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [messagesFailed, setMessagesFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [activityLabel, setActivityLabel] = useState<string | null>(null);

  const streamingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef(""); // everything received from the network so far
  const revealedLenRef = useRef(0); // how much of it is currently shown
  const pendingFinalRef = useRef<Message | null>(null); // terminal message, applied once reveal catches up
  const revealRafRef = useRef<number | null>(null);
  const revealLastTsRef = useRef<number | null>(null);
  const revealBudgetRef = useRef(0); // fractional characters carried between frames

  useEffect(() => {
    if (!conversationId) {
      setMessages(null);
      setMessagesFailed(false);
      return;
    }
    setMessages(null);
    setMessagesFailed(false);
    assistantApi
      .listMessages(conversationId)
      .then(setMessages)
      .catch(() => {
        // Conversation deleted, or belongs to a different account that left
        // its ID cached on this browser — don't hang on "Loading..." forever.
        setMessages([]);
        setMessagesFailed(true);
      });
  }, [conversationId]);

  // Aborts on unmount *and* whenever the conversation changes. The second
  // case matters: with an empty dep array, selecting another conversation
  // mid-answer left the old stream running against the newly-loaded message
  // list — every paced update looked for the pending id in an array that no
  // longer contained it, so the answer went nowhere, and `sending` stayed
  // true until the abandoned stream ended, silently freezing the composer in
  // the conversation the student had just opened. Aborting is lossless: the
  // server's finally block persists whatever streamed as a `stopped` message
  // (apps/ai_assistant/services/message_service.py), so it is there on return.
  useEffect(
    () => () => {
      stopReveal();
      abortControllerRef.current?.abort();
    },
    [conversationId],
  );

  function stopReveal() {
    if (revealRafRef.current !== null) {
      cancelAnimationFrame(revealRafRef.current);
      revealRafRef.current = null;
    }
    revealLastTsRef.current = null;
    revealBudgetRef.current = 0;
  }

  function revealTick(ts: number) {
    revealRafRef.current = null;
    const last = revealLastTsRef.current ?? ts;
    const dtSeconds = Math.max(0, ts - last) / 1000;
    revealLastTsRef.current = ts;

    const backlog = fullContentRef.current.length - revealedLenRef.current;
    if (backlog > 0) {
      // Catch-up: once behind by more than the threshold, speed up
      // proportionally to the backlog instead of the flat base rate, so a
      // big burst (or a very fast model) can't leave the display seconds
      // behind what's actually arrived.
      const rate = backlog > REVEAL_CATCHUP_BACKLOG_CHARS
        ? BASE_REVEAL_CHARS_PER_SEC * (backlog / REVEAL_CATCHUP_BACKLOG_CHARS)
        : BASE_REVEAL_CHARS_PER_SEC;
      revealBudgetRef.current += rate * dtSeconds;
      const step = Math.min(backlog, Math.floor(revealBudgetRef.current));
      if (step > 0) {
        revealBudgetRef.current -= step;
        revealedLenRef.current += step;
        const shown = fullContentRef.current.slice(0, revealedLenRef.current);
        setMessages((prev) => (prev ?? []).map((m) => (m.id === PENDING_ASSISTANT_ID ? { ...m, content: shown } : m)));
      }
    }

    if (revealedLenRef.current < fullContentRef.current.length) {
      revealRafRef.current = requestAnimationFrame(revealTick);
      return;
    }

    // Caught up to everything that has arrived so far.
    revealLastTsRef.current = null;
    revealBudgetRef.current = 0;
    if (pendingFinalRef.current) {
      const finalMessage = pendingFinalRef.current;
      pendingFinalRef.current = null;
      setMessages((prev) => (prev ?? []).map((m) => (m.id === PENDING_ASSISTANT_ID ? finalMessage : m)));
    }
  }

  function ensureRevealing() {
    if (revealRafRef.current !== null) return;
    revealRafRef.current = requestAnimationFrame(revealTick);
  }

  function handleEvent(event: SSEEvent) {
    if (!streamingRef.current) return; // Stop was pressed; ignore anything already in flight.
    switch (event.type) {
      case "user_message":
        setMessages((prev) => (prev ?? []).map((m) => (m.id === PENDING_USER_ID ? event.message : m)));
        break;
      case "tool_call":
        setActivityLabel(event.tool_name);
        break;
      case "tool_call_reset":
        // A turn that resolved to a tool call may have streamed a bit of
        // now-irrelevant commentary first — the server already retracted
        // it from what it'll persist; mirror that locally.
        stopReveal();
        fullContentRef.current = "";
        revealedLenRef.current = 0;
        setActivityLabel(null);
        setMessages((prev) => (prev ?? []).map((m) => (m.id === PENDING_ASSISTANT_ID ? { ...m, content: "" } : m)));
        break;
      case "delta":
        fullContentRef.current += event.content;
        setActivityLabel(null);
        ensureRevealing();
        break;
      case "message":
      case "error":
        // Don't snap to the final message immediately — queue it and let
        // the reveal pacer above catch up to it first, so the tail end of
        // a response doesn't visibly jump ahead of what's mid-reveal.
        pendingFinalRef.current = event.message;
        ensureRevealing();
        break;
    }
  }

  function handleStreamError(err: unknown, signal: AbortSignal) {
    if (err instanceof StreamAuthError) {
      tokenStorage.clear();
      window.location.href = "/login";
      return;
    }
    if (signal.aborted) return; // stopGeneration() already set the "stopped" state locally
    stopReveal();
    const shown = fullContentRef.current.slice(0, revealedLenRef.current);
    setMessages((prev) =>
      (prev ?? []).map((m) =>
        m.id === PENDING_ASSISTANT_ID
          ? { ...m, status: "failed" as const, content: shown, error_message: "Կապի խնդիր առաջացավ։" }
          : m,
      ),
    );
  }

  async function sendMessage(
    content: string, attachmentIds: number[] = [], educationalContext?: EducationalContext,
  ) {
    if (!conversationId || streamingRef.current) return;
    streamingRef.current = true;
    setSending(true);
    setActivityLabel(null);
    fullContentRef.current = "";
    revealedLenRef.current = 0;
    pendingFinalRef.current = null;

    setMessages((prev) => [
      ...(prev ?? []),
      pendingMessage(conversationId, "user", PENDING_USER_ID, content),
      pendingMessage(conversationId, "assistant", PENDING_ASSISTANT_ID),
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await streamRequest(
        assistantApi.sendMessageStreamUrl(conversationId),
        assistantApi.sendMessageStreamBody(content, attachmentIds, educationalContext),
        controller.signal,
        handleEvent,
      );
    } catch (err) {
      handleStreamError(err, controller.signal);
    } finally {
      abortControllerRef.current = null;
      streamingRef.current = false;
      setSending(false);
      setActivityLabel(null);
    }
  }

  async function regenerate(messageId: number) {
    if (streamingRef.current) return;
    streamingRef.current = true;
    setSending(true);
    setActivityLabel(null);
    fullContentRef.current = "";
    revealedLenRef.current = 0;
    pendingFinalRef.current = null;

    setMessages((prev) =>
      (prev ?? []).map((m) =>
        m.id === messageId ? pendingMessage(conversationId ?? m.conversation, "assistant", PENDING_ASSISTANT_ID) : m,
      ),
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await streamRequest(
        assistantApi.regenerateMessageStreamUrl(messageId),
        undefined,
        controller.signal,
        handleEvent,
      );
    } catch (err) {
      handleStreamError(err, controller.signal);
    } finally {
      abortControllerRef.current = null;
      streamingRef.current = false;
      setSending(false);
      setActivityLabel(null);
    }
  }

  function stopGeneration() {
    if (!streamingRef.current) return;
    streamingRef.current = false;
    abortControllerRef.current?.abort();
    // Freeze on exactly what's currently on screen — not the full network
    // backlog, which may be visually ahead of the paced reveal.
    const shown = fullContentRef.current.slice(0, revealedLenRef.current);
    stopReveal();
    pendingFinalRef.current = null;
    setMessages((prev) =>
      (prev ?? []).map((m) =>
        m.id === PENDING_ASSISTANT_ID ? { ...m, status: "stopped" as const, content: shown } : m,
      ),
    );
    setSending(false);
    setActivityLabel(null);
  }

  async function editMessage(messageId: number, content: string) {
    const updated = await assistantApi.editMessage(messageId, content);
    setMessages((prev) => (prev ?? []).map((m) => (m.id === messageId ? updated : m)));

    const index = (messages ?? []).findIndex((m) => m.id === messageId);
    const followingAssistant = (messages ?? [])
      .slice(index + 1)
      .find((m) => m.role === "assistant");
    if (followingAssistant) {
      await regenerate(followingAssistant.id);
    }
  }

  async function deleteMessage(messageId: number) {
    await assistantApi.deleteMessage(messageId);
    setMessages((prev) => (prev ?? []).filter((m) => m.id !== messageId));
  }

  return {
    messages, messagesFailed, sending, activityLabel,
    sendMessage, regenerate, editMessage, deleteMessage, stopGeneration,
  };
}
