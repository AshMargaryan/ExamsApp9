import { ArrowRight, Check, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { CheckInFeeling, StudyTask } from "../../api/studyPlan";
import { Button } from "../ui/Button";
import { localizeSubjectName } from "../../lib/subjects";
import { TASK_META, taskHref } from "./planFormat";

/*
  Today's tasks as a journey, not a list of rows.

  The old list gave completed, current and upcoming tasks near-identical
  weight, so the one thing a student needs on opening the page — which task to
  start right now — had to be worked out by reading all of them. Here exactly
  one task is loud: the active one gets the reasoning, the expected outcome and
  the only primary button on the page. Completed tasks recede, upcoming ones
  stay legible but quiet.

  The connector rail between markers is what makes it read as a sequence rather
  than as four unrelated cards.
*/

export type TaskStatus = "completed" | "active" | "upcoming";

export function taskStatuses(tasks: StudyTask[]): TaskStatus[] {
  const firstNotDone = tasks.findIndex((t) => !t.done);
  return tasks.map((t, i) => {
    if (t.done) return "completed";
    if (i === firstNotDone) return "active";
    return "upcoming";
  });
}

const CHECK_IN_OPTIONS: { feeling: CheckInFeeling; icon: string; label: string }[] = [
  { feeling: "great", icon: "😄", label: "Հեշտ էր" },
  { feeling: "ok", icon: "🙂", label: "Նորմալ" },
  { feeling: "struggled", icon: "😓", label: "Դժվար էր" },
];

const CHECK_IN_LABEL: Record<CheckInFeeling, string> = {
  great: "😄 Նշեցիր՝ հեշտ էր",
  ok: "🙂 Նշեցիր՝ նորմալ էր",
  struggled: "😓 Նշեցիր՝ դժվար էր",
};

function Marker({ status, index }: { status: TaskStatus; index: number }) {
  if (status === "completed") {
    return (
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-correct/15 text-correct"
        aria-hidden
      >
        <Check size={15} strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden>
        <span
          className="anim-pulse-ring absolute inset-0 rounded-full text-primary"
          style={{ boxShadow: "0 0 0 2px currentColor" }}
        />
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-primary-contrast"
          style={{ background: "var(--gradient-hero)" }}
        >
          {index + 1}
        </span>
      </span>
    );
  }
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-[13px] font-semibold text-text-muted"
      aria-hidden
    >
      {index + 1}
    </span>
  );
}

function CheckIn({
  task,
  onCheckIn,
}: {
  task: StudyTask;
  onCheckIn: (taskId: number, feeling: CheckInFeeling) => void;
}) {
  if (task.check_in_feeling) {
    return (
      <p className="text-[13px] leading-relaxed text-text-muted">
        {CHECK_IN_LABEL[task.check_in_feeling]} — հաշվի ենք առնում վաղվա պլանում։
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-text">Ինչպե՞ս անցավ</p>
      <div className="flex flex-wrap gap-2">
        {CHECK_IN_OPTIONS.map((opt) => (
          <button
            key={opt.feeling}
            type="button"
            onClick={() => onCheckIn(task.id, opt.feeling)}
            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-[13px] font-medium text-text transition-[transform,border-color] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden className="text-base">
              {opt.icon}
            </span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  status,
  onCheckIn,
}: {
  task: StudyTask;
  status: TaskStatus;
  onCheckIn: (taskId: number, feeling: CheckInFeeling) => void;
}) {
  const navigate = useNavigate();
  const meta = TASK_META[task.task_type];
  // Only upcoming cards are clickable as a whole.
  //
  // The active card has its own explicit "Սկսել" button — a second, invisible
  // hit area around it would give one action two affordances. The completed
  // card holds the three check-in buttons, and a role="button" wrapping other
  // buttons is invalid ARIA: screen readers announce one control whose name is
  // every label inside it, and keyboard users land "inside" a button.
  const cardIsLink = status === "upcoming";

  const shell =
    status === "active"
      ? "border-primary/45 bg-[color-mix(in_srgb,var(--color-primary)_7%,var(--color-surface))] shadow-[var(--shadow-md)]"
      : status === "completed"
        ? "border-border bg-surface"
        : "border-border bg-surface hover:border-primary/50";

  return (
    <div
      role={cardIsLink ? "button" : undefined}
      tabIndex={cardIsLink ? 0 : undefined}
      onClick={cardIsLink ? () => navigate(taskHref(task)) : undefined}
      onKeyDown={
        cardIsLink
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(taskHref(task));
              }
            }
          : undefined
      }
      className={`rounded-[var(--radius)] border p-4 transition-[border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] sm:p-5 ${shell} ${
        cardIsLink
          ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
            <span className="flex shrink-0">{meta.icon}</span>
            <span className="truncate">
              {localizeSubjectName(task.subject_name)}
              {task.topic_label && ` · ${task.topic_label}`}
            </span>
          </p>
          <p
            className={`mt-1 text-[15px] leading-snug font-semibold ${
              status === "completed" ? "text-text-muted line-through decoration-text-muted/40" : "text-text"
            }`}
          >
            {task.title}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs whitespace-nowrap text-text-muted">~{task.estimated_minutes} ր</span>
          {cardIsLink && <ArrowRight size={15} strokeWidth={2} className="text-text-muted" aria-hidden />}
        </div>
      </div>

      {status === "active" && (
        <div className="mt-4">
          {task.blurb && (
            <div className="rounded-[var(--radius)] border border-primary/20 bg-bg p-3.5">
              <p className="text-[11px] font-semibold tracking-[0.1em] text-primary">ԻՆՉՈ՞Ւ ՀԵՆՑ ՍԱ</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-muted">{task.blurb}</p>
            </div>
          )}
          <Button
            className="mt-4 w-full sm:w-auto"
            onClick={() => navigate(taskHref(task))}
            iconLeft={<Play size={15} strokeWidth={2.5} />}
          >
            Սկսել
          </Button>
        </div>
      )}

      {status === "upcoming" && task.blurb && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-text-muted">{task.blurb}</p>
      )}

      {status === "upcoming" && task.progress && (
        <p className="mt-2 text-[12px] font-medium text-text-muted">Առաջընթաց՝ {task.progress}</p>
      )}

      {status === "completed" && (
        <div className="mt-3.5 border-t border-border pt-3.5">
          <CheckIn task={task} onCheckIn={onCheckIn} />
        </div>
      )}
    </div>
  );
}

export function TaskJourney({
  tasks,
  statuses,
  onCheckIn,
}: {
  tasks: StudyTask[];
  statuses: TaskStatus[];
  onCheckIn: (taskId: number, feeling: CheckInFeeling) => void;
}) {
  return (
    <ol className="flex flex-col">
      {tasks.map((task, i) => (
        <li key={task.id} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3.5 sm:gap-x-4">
          <div className="flex flex-col items-center">
            <Marker status={statuses[i]} index={i} />
            {i < tasks.length - 1 && (
              <span
                aria-hidden
                className="w-px flex-1 rounded-full"
                style={{
                  background:
                    statuses[i] === "completed"
                      ? "color-mix(in srgb, var(--color-correct) 40%, transparent)"
                      : "var(--color-border)",
                }}
              />
            )}
          </div>
          <div className={i < tasks.length - 1 ? "pb-3" : ""}>
            <TaskCard task={task} status={statuses[i]} onCheckIn={onCheckIn} />
          </div>
        </li>
      ))}
    </ol>
  );
}
