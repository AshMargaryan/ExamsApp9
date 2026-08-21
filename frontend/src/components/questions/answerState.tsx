import { Check, Circle, CircleDot, X } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  One vocabulary for "what is the status of this answer option", shared by
  every question type and therefore by all six surfaces that render one:
  the daily problem, tier practice, the mistake retry panel, a live mock-exam
  attempt, mock-exam results, and multiplayer gameplay.

  Why this exists
  ---------------
  Each question component decided status on its own, and every one of them
  decided it *in colour only*:

      revealed && choice.is_correct   -> border-correct bg-correct-bg text-correct
      revealed && isSelected          -> border-incorrect bg-incorrect-bg text-incorrect
      !revealed && isSelected         -> border-primary bg-primary

  So the single most important fact in the product — did I get this right —
  was green versus red and nothing else. That is the textbook red/green
  colourblindness case, it is invisible in greyscale, and it is silent to a
  screen reader, which announced four identical "button"s with no indication
  of which one the student had even picked. DESIGN.md's rule 7 ("status is
  never colour alone") was being broken by the most consequential status in
  the app.

  Every state now carries a mark and a spoken label as well as a tint, so it
  survives greyscale, colourblindness and being read aloud.
*/

export type AnswerState =
  /** Not chosen, nothing revealed yet. */
  | "idle"
  /** Chosen by the student, not yet marked. */
  | "selected"
  /** Revealed: this is the right answer. */
  | "correct"
  /** Revealed: the student chose this, and it is wrong. */
  | "incorrect"
  /** Revealed: not chosen, not the right answer. */
  | "dimmed";

export function answerStateClasses(state: AnswerState): string {
  switch (state) {
    case "selected":
      return "border-primary bg-primary text-primary-contrast";
    case "correct":
      return "border-correct bg-correct-bg text-correct";
    case "incorrect":
      return "border-incorrect bg-incorrect-bg text-incorrect";
    case "dimmed":
      return "border-border text-text-muted";
    default:
      return "border-border hover:border-primary";
  }
}

/*
  The same tick can mean two different things, so it needs two vocabularies.

  On a multiple-choice option, "correct" identifies *which option* is the
  right one — the student may or may not have picked it. On a true/false row
  the student has already given an answer, and the mark is a verdict on that
  answer. Reading the option wording onto a true/false row produced
  "Սխալ է (ճիշտ պատասխանը)" — "it is false (the correct answer)" — which is
  two claims in one breath and means neither.
*/
export type MarkMeaning = "option" | "verdict";

const LABELS: Record<MarkMeaning, Record<AnswerState, string | null>> = {
  option: {
    idle: null,
    selected: "ընտրված",
    correct: "ճիշտ պատասխանը",
    incorrect: "քո պատասխանը՝ սխալ",
    dimmed: null,
  },
  verdict: {
    idle: null,
    selected: "ընտրված",
    correct: "պատասխանդ ճիշտ է",
    incorrect: "պատասխանդ սխալ է",
    dimmed: null,
  },
};

/** The icon + spoken label that keeps a state from being carried by tint
 *  alone. Idle and selected use radio-style marks so that "which one did I
 *  pick" reads at a glance; revealed states use a tick or a cross. */
export function AnswerMark({
  state,
  meaning = "option",
  className,
}: {
  state: AnswerState;
  meaning?: MarkMeaning;
  className?: string;
}) {
  const label = LABELS[meaning][state];
  const shared = cn("shrink-0", className);

  const icon =
    state === "correct" ? (
      <Check size={18} strokeWidth={2.5} className={shared} aria-hidden />
    ) : state === "incorrect" ? (
      <X size={18} strokeWidth={2.5} className={shared} aria-hidden />
    ) : state === "selected" ? (
      <CircleDot size={18} strokeWidth={2} className={shared} aria-hidden />
    ) : state === "idle" ? (
      <Circle size={18} strokeWidth={1.75} className={cn(shared, "text-text-muted")} aria-hidden />
    ) : null;

  if (!icon) return null;

  return (
    <>
      {icon}
      {label && <span className="sr-only">{` (${label})`}</span>}
    </>
  );
}

/** The state of one multiple-choice option. */
export function choiceState(isSelected: boolean, isCorrect: boolean, revealed: boolean): AnswerState {
  if (!revealed) return isSelected ? "selected" : "idle";
  if (isCorrect) return "correct";
  if (isSelected) return "incorrect";
  return "dimmed";
}
