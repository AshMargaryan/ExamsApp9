import { useId } from "react";
import type { Choice } from "../../api/practice";
import { cn } from "../../lib/cn";
import { MathText } from "../MathText";
import { AnswerMark, answerStateClasses, choiceState } from "./answerState";

interface Props {
  index: number;
  text: string;
  choices: Choice[];
  selectedChoiceId: number | undefined;
  onSelect: (choiceId: number) => void;
  revealed: boolean;
}

const BLANK = "_____";

/*
  Cloze-style rendering for fill-in-the-blank sentences: the blank is shown
  inline in the sentence and filled with whichever chip the student picks,
  instead of a plain vertical list of lettered options.

  Same two corrections as MultipleChoiceQuestion — the chips are a real radio
  group so the choice is announced and arrow-navigable, and status comes from
  ./answerState so correct/incorrect is never tint alone.
*/
export function ClozeChoiceQuestion({ index, text, choices, selectedChoiceId, onSelect, revealed }: Props) {
  const groupName = useId();
  const blankIndex = text.indexOf(BLANK);
  const before = blankIndex >= 0 ? text.slice(0, blankIndex) : text;
  const after = blankIndex >= 0 ? text.slice(blankIndex + BLANK.length) : "";
  const selected = choices.find((choice) => choice.id === selectedChoiceId);

  return (
    <div>
      <p className="mb-5 text-xl font-medium leading-relaxed text-text">
        {index}. <MathText text={before} />
        <span
          className={cn(
            "mx-1 inline-block min-w-[6rem] rounded-[var(--radius-md)] border-b-2 px-2 py-0.5 text-center align-baseline",
            selected ? "border-primary bg-surface-muted text-text" : "border-text-muted text-text-muted",
          )}
        >
          {/* The blank is part of the sentence, so it needs to read as one:
              without this it is announced as an empty element and the
              sentence loses its subject. */}
          {selected ? selected.text : <span className="sr-only">(բաց թողնված բառ)</span>}
          {!selected && " "}
        </span>
        <MathText text={after} />
      </p>

      <div role="radiogroup" aria-label="Պատասխանի տարբերակները" className="flex flex-wrap gap-2">
        {choices.map((choice) => {
          const isSelected = choice.id === selectedChoiceId;
          const state = choiceState(isSelected, choice.is_correct === true, revealed);

          return (
            <label
              key={choice.id}
              className={cn(
                "flex items-center gap-[var(--space-2)] rounded-full border px-4 py-2 text-base font-medium",
                "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
                "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
                revealed ? "cursor-default" : "cursor-pointer",
                answerStateClasses(state),
              )}
            >
              <input
                type="radio"
                name={groupName}
                className="sr-only"
                checked={isSelected}
                disabled={revealed}
                onChange={() => onSelect(choice.id)}
              />
              {/* Only the revealed marks appear on a chip row — an idle circle
                  beside every chip would double the width of a layout whose
                  whole point is that the options sit on one or two lines. */}
              {revealed && <AnswerMark state={state} />}
              {choice.text}
            </label>
          );
        })}
      </div>
    </div>
  );
}
