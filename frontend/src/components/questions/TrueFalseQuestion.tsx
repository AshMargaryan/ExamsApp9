import type { Statement } from "../../api/practice";
import { MathText } from "../MathText";

interface Props {
  statements: Statement[];
  selectedIds: Set<number>;
  onToggle: (statementId: number) => void;
  revealed: boolean;
}

export function TrueFalseQuestion({ statements, selectedIds, onToggle, revealed }: Props) {
  return (
    <div className="flex flex-col gap-2">
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
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s.id)}
            disabled={revealed}
            className={`flex items-center gap-3 rounded-md border px-4 py-2 text-left text-lg transition-colors ${classes}`}
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
        );
      })}
    </div>
  );
}