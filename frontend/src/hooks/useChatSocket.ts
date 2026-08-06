import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStorage } from "../api/client";
import type { Message } from "../api/chat";

export type ChatSocketEvent =
  | { type: "message"; message: Message }
  | { type: "read"; conversation_id: number; user_id: number; last_read_message_id: number }
  | { type: "error"; detail: string };

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const MAX_BACKOFF_MS = 8000;

function wsUrl(conversationId: number): string {
  const token = tokenStorage.getAccess();
  const httpBase = API_BASE_URL.replace(/\/api\/?$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/ws/chat/${conversationId}/?token=${encodeURIComponent(token ?? "")}`;
}

/**
 * Manages a single conversation's WebSocket: connects, auto-reconnects
 * with backoff on drop, and exposes the latest server event + a way to
 * send a message. Mirrors useGameSocket's shape/reconnect behavior —
 * same connection lifecycle problem, same solution.
 */
export function useChatSocket(conversationId: number | null) {
  const [event, setEvent] = useState<ChatSocketEvent | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (conversationId === null) return;
    setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");

    const ws = new WebSocket(wsUrl(conversationId));
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus("open");
    };

    ws.onmessage = (e) => {
      try {
        setEvent(JSON.parse(e.data));
      } catch {
        // ignore malformed frame
      }
    };

    ws.onclose = () => {
      if (!shouldReconnectRef.current) {
        setStatus("closed");
        return;
      }
      setStatus("reconnecting");
      const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF_MS);
      attemptRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (conversationId === null) return;
    shouldReconnectRef.current = true;
    attemptRef.current = 0;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [conversationId, connect]);

  const sendMessage = useCallback(
    (text: string, attachmentIds: number[] = [], replyToId: number | null = null): boolean => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ action: "message", text, attachment_ids: attachmentIds, reply_to_id: replyToId }));
      return true;
    },
    [],
  );

  const markRead = useCallback((messageId?: number): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ action: "read", message_id: messageId }));
    return true;
  }, []);

  const react = useCallback((messageId: number, emoji: string): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ action: "react", message_id: messageId, emoji }));
    return true;
  }, []);

  return { event, status, sendMessage, markRead, react };
}
