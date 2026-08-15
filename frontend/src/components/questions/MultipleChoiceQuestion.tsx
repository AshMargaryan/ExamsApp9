import type { Choice } from "../../api/practice";
import { MathText } from "../MathText";

interface Props {
  choices: Choice[];
  selectedChoiceId: number | undefined;
  onSelect: (choiceId: number) => void;
  revealed: boolean;
  size?: "normal" | "large";
}

export function MultipleChoiceQuestion({
  choices,
  selectedChoiceId,
  onSelect,
  revealed,
  size = "normal",
}: Props) {
  const sizeClasses = size === "large" ? "px-6 py-5 text-2xl" : "px-4 py-2 text-lg";

  return (
    <div className={`flex flex-col ${size === "large" ? "gap-3" : "gap-2"}`}>
      {choices.map((choice) => {
        const isSelected = choice.id === selectedChoiceId;
        let classes = "border-border hover:border-primary";
        if (revealed) {
          if (choice.is_correct) {
            classes = "border-correct bg-correct-bg text-correct";
          } else if (isSelected) {
            classes = "border-incorrect bg-incorrect-bg text-incorrect";
          }
        } else if (isSelected) {
          classes = "border-primary bg-primary text-primary-contrast";
        }

        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice.id)}
            className={`rounded-md border text-left transition-colors ${sizeClasses} ${classes}`}
          >
            <MathText text={choice.text} />
          </button>
        );
      })}
    </div>
  );
}