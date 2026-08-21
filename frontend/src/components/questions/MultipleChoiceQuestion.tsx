import { useId } from "react";
import type { Choice } from "../../api/practice";
import { cn } from "../../lib/cn";
import { MathText } from "../MathText";
import { AnswerMark, answerStateClasses, choiceState } from "./answerState";

interface Props {
  choices: Choice[];
  selectedChoiceId: number | undefined;
  onSelect: (choiceId: number) => void;
  revealed: boolean;
  size?: "normal" | "large";
}

/*
  The options for one multiple-choice question.

  Was a `<div>` of plain `<button>`s. Two things followed from that, and both
  mattered on the product's most-used screen:

  - Nothing told assistive technology which option the student had chosen.
    Selection was `bg-primary` and nothing more: no aria-checked, no pressed
    state, no grouping. A screen-reader user heard four unrelated buttons and
    could not confirm their own answer.
  - There was no radio group, so the four options were four tab stops with no
    name and no "2 of 4" position, and arrow keys did nothing.

  They are native radios in a labelled group now — one tab stop, arrow keys
  for free from the browser, and the choice announced when it changes. This
  is the idiom AppearanceSection's accent picker already established: the
  input is `sr-only` and the visible label carries the focus ring via
  `has-[:focus-visible]`, because the element actually holding focus is 1px
  square.

  Status marks come from ./answerState so that correct/incorrect/selected are
  never carried by colour alone — see the note there.
*/
export function MultipleChoiceQuestion({
  choices,
  selectedChoiceId,
  onSelect,
  revealed,
  size = "normal",
}: Props) {
  const groupName = useId();
  const sizeClasses = size === "large" ? "px-6 py-5 text-2xl" : "px-4 py-2 text-lg";

  return (
    <div
      role="radiogroup"
      aria-label="Պատասխանի տարբերակները"
      className={cn("flex flex-col", size === "large" ? "gap-3" : "gap-2")}
    >
      {choices.map((choice) => {
        const isSelected = choice.id === selectedChoiceId;
        const state = choiceState(isSelected, choice.is_correct === true, revealed);

        return (
          <label
            key={choice.id}
            className={cn(
              "flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border text-left",
              "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
              "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
              revealed ? "cursor-default" : "cursor-pointer",
              sizeClasses,
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
            <AnswerMark state={state} />
            <MathText text={choice.text} className="min-w-0 flex-1" />
          </label>
        );
      })}
    </div>
  );
}
