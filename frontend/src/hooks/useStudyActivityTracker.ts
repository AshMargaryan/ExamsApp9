import { useEffect, useRef } from "react";
import { sendHeartbeat } from "../api/activity";

const HEARTBEAT_INTERVAL_MS = 60_000;
const ACTIVITY_EVENTS = ["click", "keydown", "scroll", "mousemove", "touchstart"] as const;

/**
 * Marks the current learning page (practice/mock exam/AI tutor/...) as an
 * active study session. A heartbeat is sent immediately on mount, then at
 * most once per minute, and only if real user activity (click/key/scroll/
 * touch) was observed since the previous one — an idle tab stops sending.
 * The backend (apps.activity.services.record_heartbeat) closes the session
 * server-side if more than 5 minutes pass without a heartbeat.
 */
export function useStudyActivityTracker(active: boolean = true) {
  const hasActivitySinceLastBeat = useRef(true);

  useEffect(() => {
    if (!active) return;

    function markActive() {
      hasActivitySinceLastBeat.current = true;
    }
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

    sendHeartbeat().catch(() => {});
    hasActivitySinceLastBeat.current = false;

    const interval = setInterval(() => {
      if (hasActivitySinceLastBeat.current) {
        hasActivitySinceLastBeat.current = false;
        sendHeartbeat().catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActive));
      clearInterval(interval);
    };
  }, [active]);
}