import type { Choice } from "../../api/practice";
import { MathText } from "../MathText";

interface Props {
  choices: Choice[];
  selectedChoiceId: number | undefined;
  onSelect: (choiceId: number) => void;
  revealed: boolean;
}

export function MultipleChoiceQuestion({ choices, selectedChoiceId, onSelect, revealed }: Props) {
  return (
    <div className="flex flex-col gap-2">
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
          classes = "border-primary bg-surface-muted";
        }

        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onSelect(choice.id)}
            className={`rounded-md border px-4 py-2 text-left text-lg transition-colors ${classes}`}
          >
            <MathText text={choice.text} />
          </button>
        );
      })}
    </div>
  );
}