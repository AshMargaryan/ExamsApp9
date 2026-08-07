import { useEffect, useState } from "react";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";

/** Unseen assignment events for the current user — new/reviewed for a student, submitted for a teacher. */
export function useAssignmentNotifications(pollMs = 30000) {
  const [notifications, setNotifications] = useState<Assignment[] | null>(null);

  useEffect(() => {
    function load() {
      teachingApi.fetchAssignmentNotifications().then(setNotifications);
    }
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return notifications;
}
