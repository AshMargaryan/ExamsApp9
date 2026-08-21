import type { Statement } from "../../api/practice";
import { cn } from "../../lib/cn";
import { MathText } from "../MathText";
import { HintButton } from "../HintButton";
import { AnswerMark, answerStateClasses } from "./answerState";

interface Props {
  statements: Statement[];
  selectedIds: Set<number>;
  onToggle: (statementId: number) => void;
  revealed: boolean;
  size?: "normal" | "large";
  showHint?: boolean;
  onHintOpen?: () => void;
}

/*
  A list of statements the student marks true or false.

  The marking screen said two different things at once. The row's colour
  answered "were you right" (green or red), while the chip inside it answered
  "is the statement true" ("Ճիշտ է" / "Սխալ է") — a different question. So a
  student looking at a red row reading "Ճիշտ է" had to remember what they had
  themselves answered in order to interpret it, and the verdict itself was
  carried by nothing but the tint. Both facts are now stated: the chip keeps
  the statement's truth, and a tick or cross beside it — with a spoken label —
  says whether the student got it.

  Known limitation, left deliberately: an untouched statement renders as
  "Սխալ", because `selectedIds` is the set of statements marked *true* and
  the API has no third value for "not answered". Distinguishing them is a
  backend contract change, not a frontend one. TierPage is at least honest
  about the consequence at submit time ("Չպատասխանվածները կհաշվվեն սխալ։").
*/
export function TrueFalseQuestion({
  statements,
  selectedIds,
  onToggle,
  revealed,
  size = "normal",
  showHint = true,
  onHintOpen,
}: Props) {
  const sizeClasses = size === "large" ? "px-6 py-5 text-2xl" : "px-4 py-2 text-lg";

  return (
    <div className={cn("flex flex-col", size === "large" ? "gap-3" : "gap-2")}>
      {statements.map((s) => {
        const markedTrue = selectedIds.has(s.id);
        const userCorrect = markedTrue === s.is_true;
        const state = revealed ? (userCorrect ? "correct" : "incorrect") : markedTrue ? "selected" : "idle";

        return (
          <div
            key={s.id}
            className={cn(
              "flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border",
              "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              sizeClasses,
              answerStateClasses(state),
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(s.id)}
              disabled={revealed}
              /* A toggle, so its state belongs in aria-pressed as well as in
                 the visible chip — the chip is inside the button's own
                 accessible name, which makes the name change as it is
                 pressed; aria-pressed is the part that stays stable. */
              aria-pressed={revealed ? undefined : markedTrue}
              className="flex flex-1 items-center gap-[var(--space-3)] text-left"
            >
              <span className="font-medium">{s.label}.</span>
              <MathText text={s.text} className="flex-1" />
              <span className="whitespace-nowrap text-xs">
                {revealed ? (s.is_true ? "Ճիշտ է" : "Սխալ է") : markedTrue ? "Ճիշտ" : "Սխալ"}
              </span>
              {/* "verdict", not "option": here the mark judges the student's
                  own answer, not which of several options is right. */}
              {revealed && <AnswerMark state={state} meaning="verdict" />}
            </button>
            {!revealed && showHint && <HintButton hint={s.hint ?? ""} onOpen={onHintOpen} />}
          </div>
        );
      })}
    </div>
  );
}
