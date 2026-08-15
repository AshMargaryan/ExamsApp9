import { useEffect, useRef, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import * as teachingApi from "../../api/teaching";
import type { Assignment } from "../../api/teaching";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";
import { AssignmentCard } from "./AssignmentCard";

// assigned/in_progress are the same "still open" group — clicking "Կատարել"
// only flips assigned -> in_progress, it shouldn't reshuffle position for
// that alone. An assignment holds its spot (newest-first) until either a
// newer one is sent or the student submits it.
const ORDER: Record<Assignment["status"], number> = {
  assigned: 0,
  in_progress: 0,
  submitted: 1,
  completed: 2,
};

/**
 * Header dropdown (button + panel) listing the student's open assignments —
 * in-progress ones first, then upcoming, then a completed one stays visible
 * only until the student has opened the drawer and seen it (mirrors a
 * notification, not a permanent history).
 */
export function AssignmentDrawer() {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setOpen(false), open);

  function refresh() {
    teachingApi.fetchAssignments().then(setAssignments);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleToggle() {
    setOpen((wasOpen) => {
      const opening = !wasOpen;
      if (opening) {
        (assignments ?? [])
          .filter((a) => a.status === "completed" && !a.seen_by_student)
          .forEach((a) => teachingApi.markAssignmentSeen(a.id));
      }
      return !wasOpen;
    });
  }

  async function handleStart(id: number) {
    await teachingApi.startAssignment(id);
    refresh();
  }

  const visible = (assignments ?? []).filter((a) => a.status !== "completed" || !a.seen_by_student);
  const sorted = [...visible].sort((a, b) => {
    const statusDiff = ORDER[a.status] - ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  const openCount = sorted.filter((a) => a.status === "assigned" || a.status === "in_progress").length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Առաջադրանքներ"
        title="Առաջադրանքներ"
        className="flex h-[34px] items-center gap-1.5 rounded-full border border-border bg-surface px-2 text-sm font-medium text-text transition-colors hover:border-primary sm:px-3"
      >
        <span aria-hidden="true"><ClipboardCheck size={16} strokeWidth={1.75} /></span>
        <span className="hidden sm:inline">Առաջադրանքներ</span>
        {openCount > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-contrast">
            {openCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[65vh] w-[min(92vw,24rem)] overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-3 shadow-xl">
          {assignments === null && <p className="p-3 text-sm text-text-muted">Բեռնվում է...</p>}
          {assignments !== null && sorted.length === 0 && (
            <p className="p-3 text-sm text-text-muted">Ընթացիկ առաջադրանքներ չկան։</p>
          )}
          <div className="flex flex-col gap-2">
            {sorted.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refresh} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
