import type { Statement } from "../../api/practice";
import { MathText } from "../MathText";
import { HintButton } from "../HintButton";

interface Props {
  statements: Statement[];
  selectedIds: Set<number>;
  onToggle: (statementId: number) => void;
  revealed: boolean;
  size?: "normal" | "large";
  showHint?: boolean;
}

export function TrueFalseQuestion({
  statements,
  selectedIds,
  onToggle,
  revealed,
  size = "normal",
  showHint = true,
}: Props) {
  const sizeClasses = size === "large" ? "px-6 py-5 text-2xl" : "px-4 py-2 text-lg";

  return (
    <div className={`flex flex-col ${size === "large" ? "gap-3" : "gap-2"}`}>
      {statements.map((s) => {
        const markedTrue = selectedIds.has(s.id);
        let classes = markedTrue
          ? "border-primary bg-surface-muted"
          : "border-border";

        if (revealed) {
          const userCorrect = markedTrue === s.is_true;
          classes = userCorrect
            ? "border-correct bg-correct-bg text-correct"
            : "border-incorrect bg-incorrect-bg text-incorrect";
        }

        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 rounded-md border transition-colors ${sizeClasses} ${classes}`}
          >
            <button
              type="button"
              onClick={() => onToggle(s.id)}
              disabled={revealed}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className="font-medium">{s.label}.</span>
              <MathText text={s.text} className="flex-1" />
              <span className="text-xs whitespace-nowrap">
                {revealed
                  ? s.is_true
                    ? "Ճիշտ է"
                    : "Սխալ է"
                  : markedTrue
                    ? "Ճիշտ"
                    : "Սխալ"}
              </span>
            </button>
            {!revealed && showHint && <HintButton hint={s.hint ?? ""} />}
          </div>
        );
      })}
    </div>
  );
}