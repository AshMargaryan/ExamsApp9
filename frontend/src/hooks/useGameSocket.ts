import { useCallback, useEffect, useRef, useState } from "react";
import { tokenStorage } from "../api/client";
import type { Question } from "../api/practice";

// The server is authoritative for all of this — these messages are the
// ONLY thing that ever changes what's on screen. The client never decides
// to advance on its own timer; it just displays what it's told and lets a
// local clock tick for visual smoothness between messages.
export type GameSocketMessage =
  | { type: "waiting" }
  | {
      type: "question";
      question: Question;
      question_number: number;
      total_questions: number;
      seconds_remaining: number;
      deadline: string | null;
      score: number;
      answered?: boolean;
    }
  | { type: "answer_result"; is_correct: boolean; score: number }
  | { type: "finished"; score: number; rank: number | null; total_questions: number }
  | { type: "error"; detail: string };

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const MAX_BACKOFF_MS = 8000;
// Nudges the server for a fresh personal state every few seconds, on top
// of the push updates that already arrive after answering / on your own
// deadline. This is what lets a player notice the creator stopped the game
// (or the room's total_game_time cap force-closed it) within a few
// seconds even if they're just sitting on a question doing nothing.
const SYNC_INTERVAL_MS = 4000;

function wsUrl(roomCode: string): string {
  const token = tokenStorage.getAccess();
  const httpBase = API_BASE_URL.replace(/\/api\/?$/, "");
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/ws/games/${roomCode}/?token=${encodeURIComponent(token ?? "")}`;
}

/** Manages a single room's game WebSocket: connects, auto-reconnects with
 * backoff on drop, and exposes the latest server message + a way to send
 * an answer. Room/question/score state all lives server-side — a fresh
 * "waiting"/"question"/"finished" message on (re)connect is all a client
 * ever needs to recover full progress. */
export function useGameSocket(roomCode: string | undefined) {
  const [message, setMessage] = useState<GameSocketMessage | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!roomCode) return;
    setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");

    const ws = new WebSocket(wsUrl(roomCode));
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setStatus("open");
      syncIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "sync" }));
      }, SYNC_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        setMessage(JSON.parse(event.data));
      } catch {
        // ignore malformed frame
      }
    };

    ws.onclose = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
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
  }, [roomCode]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    attemptRef.current = 0;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendAnswer = useCallback((payload: Record<string, unknown>): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ action: "answer", ...payload }));
    return true;
  }, []);

  return { message, status, sendAnswer };
}
