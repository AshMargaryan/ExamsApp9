import { Link } from "react-router-dom";
import { Play, RotateCw } from "lucide-react";
import { buttonClasses } from "../ui/buttonStyles";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";
import { parseExamTitle } from "../../lib/examTitle";
import type { MockExamSummary } from "../../api/mockExams";
import { subjectMeta } from "../../lib/subjects";

interface Props {
  exam: MockExamSummary;
  /** Where the primary action (and the card body) navigate to — a draft
   * resumes straight into the attempt, everything else opens the detail page. */
  primaryTo: string;
  historyTo?: string;
}

/*
  The card used to be a `role="button"` div that called `navigate()`, with a
  full-width `<Button className="pointer-events-none" tabIndex={-1}>` inside
  it. So the most button-like object on the card was the one thing that could
  not be clicked or focused, and the thing that *was* interactive announced
  itself as a button whose accessible name was the card's entire text.

  It is a real link now, stretched over the card via `::after`. Beyond the
  semantics that buys the obvious thing a student wants from a list of exams
  and could not do before: open one in a new tab. `navigate()` on a div
  swallows middle-click, ⌘-click and "open in new tab" alike.
*/
export function ExamCard({ exam, primaryTo, historyTo }: Props) {
  const subject = subjectMeta(exam.subject);
  const { main } = parseExamTitle(exam.title, subject?.label ?? exam.title);

  const status: "not_started" | "in_progress" | "completed" = exam.has_draft
    ? "in_progress"
    : exam.completed_attempts_count > 0
      ? "completed"
      : "not_started";

  const primaryLabel = status === "in_progress" ? "Շարունակել" : status === "completed" ? "Կրկնել" : "Սկսել";
  const PrimaryIcon = status === "completed" ? RotateCw : Play;

  /*
    Only an unfinished attempt gets the filled button.

    The list holds fifty exams for mathematics alone, and every card carried a
    full-width `bg-primary` CTA — fifty of the loudest control the product has,
    on a screen where none of them is more urgent than any other. It is the
    defect the mistake notebook had (sixty-nine identical filled buttons, fixed
    in session 4) reappearing on a different list: a browse grid has no primary
    action, so nothing in it should look like one. An attempt the student
    abandoned genuinely is the thing to come back to — and those cards already
    sit in their own "Անավարտ թեստեր" band at the top of the page.
  */
  const emphasis = status === "in_progress" ? "primary" : "secondary";

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-[var(--radius)] border border-border bg-surface p-5",
        "transition-[transform,box-shadow,border-color] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:border-primary hover:shadow-md active:translate-y-0",
        "focus-within:border-primary",
      )}
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-text">{main}</h3>
          <StatusBadge status={status} />
        </div>
        {/* `secondary` is "Հայաստանի Հանրապետության Միասնական քննություն" —
            the same sentence on all fifty cards, above a subject tab bar that
            has already said which exam family this is. It stays on the detail
            page, where it is stated once. */}
        <p className="mb-3 text-sm text-text-muted">{exam.question_count} հարց</p>
        {exam.best_scaled_score !== null && (
          <p className="mb-3 text-sm font-medium text-primary">
            Լավագույն արդյունք՝ {exam.best_scaled_score} / 20
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Link
          to={primaryTo}
          className={cn(
            buttonClasses(emphasis, "md", "w-full justify-center gap-[var(--space-2)]"),
            // Stretched over the whole card, so the card stays one target.
            "after:absolute after:inset-0 after:content-['']",
          )}
        >
          <PrimaryIcon size={15} strokeWidth={2} aria-hidden />
          {primaryLabel}
        </Link>
        {historyTo && (
          <Link
            to={historyTo}
            className="relative z-10 rounded-[var(--radius)] border border-border px-4 py-2 text-center text-sm font-medium text-text transition-colors hover:border-primary"
          >
            Տեսնել արդյունքը ({exam.completed_attempts_count})
          </Link>
        )}
      </div>
    </div>
  );
}

/* No badge for "not started". It was the state of forty-eight of fifty cards,
   so it distinguished nothing while adding a bordered object to every one of
   them; the absence of a badge already says it. A badge is for the cards that
   differ. */
function StatusBadge({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  if (status === "in_progress") return <Badge tone="primary">Ընթացքի մեջ</Badge>;
  if (status === "completed") return <Badge tone="correct">Ավարտված</Badge>;
  return null;
}
