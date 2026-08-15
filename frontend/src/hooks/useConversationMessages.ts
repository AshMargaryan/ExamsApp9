import { useEffect, useState } from "react";
import * as chatApi from "../api/chat";
import type { Message } from "../api/chat";
import { useChatSocket } from "./useChatSocket";

/**
 * Combines the REST message history (initial newest page + "load older"
 * for infinite scroll) with the live WebSocket feed for a single open
 * conversation. WS is the primary send path; if the socket isn't open yet
 * (e.g. still reconnecting), sendText falls back to the REST endpoint —
 * both ultimately call the same backend service, so nothing is lost.
 */
export function useConversationMessages(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const {
    event, status, sendMessage: wsSendMessage, markRead, react: wsReact,
    editMessage: wsEditMessage, deleteMessage: wsDeleteMessage, sendTyping,
  } = useChatSocket(conversationId);

  useEffect(() => {
    setMessages([]);
    setHasMore(false);
    if (conversationId === null) return;
    setLoadingInitial(true);
    chatApi.listMessages(conversationId).then((page) => {
      setMessages(page.results);
      setHasMore(page.has_more);
      setLoadingInitial(false);
    });
  }, [conversationId]);

  useEffect(() => {
    if (!event || event.type !== "message") return;
    if (event.message.conversation !== conversationId) return;
    setMessages((prev) => {
      const index = prev.findIndex((m) => m.id === event.message.id);
      // Same broadcast event covers both "new message" and "existing
      // message changed" (e.g. a reaction) — an unknown id gets appended,
      // a known one gets replaced in place instead of duplicated.
      if (index === -1) return [...prev, event.message];
      const next = [...prev];
      next[index] = event.message;
      return next;
    });
    // The conversation is open in this tab right now, so any message that
    // arrives live counts as read immediately — connect() only covers what
    // already existed when the socket opened.
    markRead(event.message.id);
  }, [event, conversationId, markRead]);

  async function loadOlder() {
    if (conversationId === null || messages.length === 0 || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const page = await chatApi.listMessages(conversationId, messages[0].id);
      setMessages((prev) => [...page.results, ...prev]);
      setHasMore(page.has_more);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendText(text: string, attachmentIds: number[] = [], replyToId: number | null = null) {
    if (conversationId === null) return;
    const sentLive = wsSendMessage(text, attachmentIds, replyToId);
    if (!sentLive) {
      const message = await chatApi.sendMessage(conversationId, text, attachmentIds, replyToId);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
  }

  async function react(messageId: number, emoji: string) {
    const sentLive = wsReact(messageId, emoji);
    if (!sentLive) {
      const message = await chatApi.setReaction(messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    }
  }

  async function editText(messageId: number, text: string) {
    const sentLive = wsEditMessage(messageId, text);
    if (!sentLive) {
      const message = await chatApi.editMessage(messageId, text);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    }
  }

  async function deleteForEveryone(messageId: number) {
    const sentLive = wsDeleteMessage(messageId);
    if (!sentLive) {
      const message = await chatApi.deleteMessageForEveryone(messageId);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    }
  }

  async function hideForMe(messageId: number) {
    await chatApi.hideMessageForMe(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  async function askAI(messageId: number) {
    if (conversationId === null) return;
    // No WS path for this one — it's a slower, one-off request (calls out
    // to the AI provider), unlike the fire-and-forget actions above. The
    // reply still arrives live for every participant via the normal
    // chat.message broadcast; appending it here too just covers the case
    // where this tab's own socket isn't connected.
    const message = await chatApi.askAI(conversationId, messageId);
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
  }

  async function togglePin(messageId: number, pin: boolean) {
    const message = pin ? await chatApi.pinMessage(messageId) : await chatApi.unpinMessage(messageId);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
  }

  return {
    messages, hasMore, loadingInitial, loadingOlder, loadOlder, sendText, react, status, markRead,
    editText, deleteForEveryone, hideForMe, sendTyping, askAI, togglePin,
    typingEvent: event?.type === "typing" ? event : null,
    readEvent: event?.type === "read" ? event : null,
  };
}
