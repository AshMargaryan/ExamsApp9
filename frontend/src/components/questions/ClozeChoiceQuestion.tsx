import type { Choice } from "../../api/practice";
import { MathText } from "../MathText";

interface Props {
  index: number;
  text: string;
  choices: Choice[];
  selectedChoiceId: number | undefined;
  onSelect: (choiceId: number) => void;
  revealed: boolean;
}

const BLANK = "_____";

// Cloze-style rendering for fill-in-the-blank sentences: the blank is shown
// inline in the sentence and filled with whichever chip the student picks,
// instead of a plain vertical list of lettered options.
export function ClozeChoiceQuestion({ index, text, choices, selectedChoiceId, onSelect, revealed }: Props) {
  const blankIndex = text.indexOf(BLANK);
  const before = blankIndex >= 0 ? text.slice(0, blankIndex) : text;
  const after = blankIndex >= 0 ? text.slice(blankIndex + BLANK.length) : "";
  const selected = choices.find((choice) => choice.id === selectedChoiceId);

  return (
    <div>
      <p className="mb-5 text-xl leading-relaxed font-medium text-text">
        {index}. <MathText text={before} />
        <span
          className={`mx-1 inline-block min-w-[6rem] rounded-md border-b-2 px-2 py-0.5 text-center align-baseline ${
            selected
              ? "border-primary bg-surface-muted text-text"
              : "border-text-muted text-text-muted"
          }`}
        >
          {selected ? selected.text : " "}
        </span>
        <MathText text={after} />
      </p>

      <div className="flex flex-wrap gap-2">
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
              className={`rounded-full border px-4 py-2 text-base font-medium transition-colors ${classes}`}
            >
              {choice.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
