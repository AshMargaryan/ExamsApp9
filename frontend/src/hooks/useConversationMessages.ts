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

  const { event, status, sendMessage: wsSendMessage, markRead } = useChatSocket(conversationId);

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
    setMessages((prev) => (prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]));
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

  async function sendText(text: string, attachmentIds: number[] = []) {
    if (conversationId === null) return;
    const sentLive = wsSendMessage(text, attachmentIds);
    if (!sentLive) {
      const message = await chatApi.sendMessage(conversationId, text, attachmentIds);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    }
  }

  return { messages, hasMore, loadingInitial, loadingOlder, loadOlder, sendText, status, markRead };
}
