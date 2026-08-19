import { Link } from "react-router-dom";
import {
  AlarmClock,
  CalendarX,
  CircleHelp,
  MoonStar,
  Repeat2,
  TrendingDown,
  Target,
} from "lucide-react";
import type { AttentionKind, AttentionSignal, StudentAttention } from "../../api/teaching";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";

/*
  The teacher's worklist. Every row states the evidence that flagged the
  student — "58% · fell 12 points · weak: quadratic equations" — because
  "needs attention" without a reason just moves the diagnosis back onto the
  teacher.

  Colour is used sparingly: the row itself stays neutral and only the signal
  chips carry tone, so a class with several flagged students doesn't turn into
  a wall of red.
*/

const SIGNAL_ICON: Record<AttentionKind, typeof TrendingDown> = {
  never_active: CircleHelp,
  inactive: MoonStar,
  accuracy_drop: TrendingDown,
  repeated_mistakes: Repeat2,
  weak_topic: Target,
  low_test_score: AlarmClock,
  overdue_assignment: CalendarX,
};

/** Only the sharpest signals read as urgent; the rest stay informational. */
const URGENT: AttentionKind[] = ["accuracy_drop", "low_test_score", "overdue_assignment"];

function SignalChip({ signal }: { signal: AttentionSignal }) {
  const Icon = SIGNAL_ICON[signal.kind] ?? CircleHelp;
  const urgent = URGENT.includes(signal.kind);
  return (
    <span
      title={signal.detail}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
        urgent
          ? "border-incorrect/40 bg-incorrect/10 text-incorrect"
          : "border-border bg-surface-muted text-text-muted"
      }`}
    >
      <Icon size={13} strokeWidth={1.75} className="flex-none" />
      <span className="truncate">{signal.detail}</span>
    </span>
  );
}

export function NeedsAttentionPanel({ rows }: { rows: StudentAttention[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        tone="positive"
        icon="🎉"
        title="Ոչ ոք ուշադրության կարիք չունի"
        hint="Բոլոր աշակերտներն ակտիվ են և առաջընթաց ունեն։ Այստեղ կհայտնվեն նրանք, ում մոտ խնդիր նկատվի։"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map(({ student, signals }) => {
        const name =
          [student.first_name, student.last_name].filter(Boolean).join(" ") || student.username;
        return (
          <li key={student.id}>
            <Link
              to={`/profile/${student.id}`}
              className="flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-surface p-3.5 transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary sm:flex-row sm:items-center sm:gap-4"
            >
              <div className="flex min-w-0 items-center gap-3 sm:w-56 sm:flex-none">
                <Avatar src={student.avatar} name={name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{name}</p>
                  <p className="truncate text-xs text-text-muted">@{student.username}</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {signals.map((s) => (
                  <SignalChip key={s.kind} signal={s} />
                ))}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
