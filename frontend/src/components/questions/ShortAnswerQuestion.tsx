import { MathText } from "../MathText";
import { cn } from "../../lib/cn";
import { fieldInputClass } from "../ui/Field";
import { AnswerMark } from "./answerState";

interface Props {
  value: string;
  onChange: (value: string) => void;
  revealed: boolean;
  correctAnswerText?: string;
  size?: "normal" | "large";
}

export function ShortAnswerQuestion({
  value,
  onChange,
  revealed,
  correctAnswerText,
  size = "normal",
}: Props) {
  const isCorrect =
    revealed && value.trim().toLowerCase() === (correctAnswerText ?? "").trim().toLowerCase();

  let borderClass = "border-border focus:border-primary";
  if (revealed) {
    borderClass = isCorrect ? "border-correct" : "border-incorrect";
  }
  const sizeClasses =
    size === "large"
      ? "px-[var(--space-6)] py-[var(--space-5)] text-[length:var(--text-2xl)]"
      : "px-[var(--space-4)] text-[length:var(--text-lg)]";

  return (
    <div>
      {/*
        `outline-none` used to sit on this input, on the surface where a
        student actually types an answer. It removed the global focus ring
        from theme.css and left the border recolour as the only indication of
        where the keyboard was — and after the answer is revealed the border
        is already carrying correct/incorrect, so there was nothing left at
        all. The shared surface draws the ring like every other control.
      */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={revealed}
        aria-label="Քո պատասխանը"
        placeholder="Քո պատասխանը…"
        className={cn(fieldInputClass, "bg-surface", sizeClasses, borderClass)}
      />
      {revealed && (
        <p
          className={cn(
            "mt-[var(--space-1)] flex items-start gap-[var(--space-1)] text-[length:var(--text-base)]",
            isCorrect ? "text-correct" : "text-incorrect",
          )}
        >
          {/* The verdict was tint alone: a green border and green text meant
              right, red meant wrong, which is the red/green case and is silent
              to a screen reader. The mark carries it too. */}
          <AnswerMark state={isCorrect ? "correct" : "incorrect"} meaning="verdict" className="mt-[3px]" />
          <span>
            Ճիշտ պատասխան՝ <MathText text={correctAnswerText ?? ""} />
          </span>
        </p>
      )}
    </div>
  );
}
