import { useEffect, useRef } from "react";
import { tokenStorage } from "../api/client";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const MAX_BACKOFF_MS = 8000;

function wsUrl(): string {
  const token = tokenStorage.getAccess();
  const httpBase = API_BASE_URL.replace(/\/api\/?$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/ws/notifications/?token=${encodeURIComponent(token ?? "")}`;
}

/** Opens a personal WebSocket that receives a lightweight "refresh" ping
 * whenever a friend/parent-link request is sent or responded to for this
 * user, so the caller can instantly re-fetch instead of waiting on a poll.
 * Auto-reconnects with backoff on drop, same as useGameSocket. */
export function useNotificationSocket(onRefresh: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    shouldReconnectRef.current = true;
    attemptRef.current = 0;

    function connect() {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "refresh") onRefreshRef.current();
        } catch {
          // ignore malformed frame
        }
      };

      ws.onclose = () => {
        if (!shouldReconnectRef.current) return;
        const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF_MS);
        attemptRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    }
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, []);
}
