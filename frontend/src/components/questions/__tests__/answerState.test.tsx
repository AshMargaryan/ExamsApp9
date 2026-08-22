import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultipleChoiceQuestion } from "../MultipleChoiceQuestion";
import { TrueFalseQuestion } from "../TrueFalseQuestion";
import { choiceState } from "../answerState";
import type { Choice, Statement } from "../../../api/practice";

const CHOICES: Choice[] = [
  { id: 1, text: "մոլեկուլ", is_correct: true },
  { id: 2, text: "ատոմ", is_correct: false },
  { id: 3, text: "բյուրեղ", is_correct: false },
] as Choice[];

const STATEMENTS: Statement[] = [
  { id: 10, label: "Ա", text: "Ատոմները կազմված են մոլեկուլներից։", is_true: false, hint: "" },
  { id: 11, label: "Բ", text: "Նյութերը կազմված են մասնիկներից։", is_true: true, hint: "" },
] as Statement[];

describe("choiceState", () => {
  it("distinguishes the right answer from the one the student picked", () => {
    expect(choiceState(true, false, true)).toBe("incorrect");
    expect(choiceState(false, true, true)).toBe("correct");
    expect(choiceState(false, false, true)).toBe("dimmed");
    expect(choiceState(true, false, false)).toBe("selected");
    expect(choiceState(false, false, false)).toBe("idle");
  });
});

describe("MultipleChoiceQuestion", () => {
  it("is a named radio group rather than a row of unrelated buttons", () => {
    render(
      <MultipleChoiceQuestion choices={CHOICES} selectedChoiceId={undefined} onSelect={() => {}} revealed={false} />,
    );
    expect(screen.getByRole("radiogroup", { name: "Պատասխանի տարբերակները" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("exposes which option the student chose", () => {
    render(<MultipleChoiceQuestion choices={CHOICES} selectedChoiceId={2} onSelect={() => {}} revealed={false} />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios[1].checked).toBe(true);
    expect(radios[0].checked).toBe(false);
  });

  it("reports it when a choice is made", async () => {
    const onSelect = vi.fn();
    render(
      <MultipleChoiceQuestion choices={CHOICES} selectedChoiceId={undefined} onSelect={onSelect} revealed={false} />,
    );
    await userEvent.click(screen.getAllByRole("radio")[2]);
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it("says which answer was right and which the student got wrong, in words", () => {
    render(<MultipleChoiceQuestion choices={CHOICES} selectedChoiceId={2} onSelect={() => {}} revealed={true} />);
    expect(screen.getByText(/ճիշտ պատասխանը/)).toBeInTheDocument();
    expect(screen.getByText(/քո պատասխանը՝ սխալ/)).toBeInTheDocument();
  });

  it("locks the options once the answer is revealed", () => {
    render(<MultipleChoiceQuestion choices={CHOICES} selectedChoiceId={2} onSelect={() => {}} revealed={true} />);
    for (const radio of screen.getAllByRole("radio") as HTMLInputElement[]) {
      expect(radio.disabled).toBe(true);
    }
  });
});

describe("TrueFalseQuestion", () => {
  it("judges the student's answer rather than restating the statement's truth", () => {
    // Ա is false and was left unmarked (so answered false) -> right.
    // Բ is true and was left unmarked (so answered false)  -> wrong.
    render(
      <TrueFalseQuestion
        statements={STATEMENTS}
        selectedIds={new Set()}
        onToggle={() => {}}
        revealed={true}
        showHint={false}
      />,
    );
    expect(screen.getByText(/պատասխանդ ճիշտ է/)).toBeInTheDocument();
    expect(screen.getByText(/պատասխանդ սխալ է/)).toBeInTheDocument();
  });

  it("exposes the toggle state before the reveal", () => {
    render(
      <TrueFalseQuestion
        statements={STATEMENTS}
        selectedIds={new Set([11])}
        onToggle={() => {}}
        revealed={false}
        showHint={false}
      />,
    );
    const toggles = screen.getAllByRole("button");
    expect(toggles[0]).toHaveAttribute("aria-pressed", "false");
    expect(toggles[1]).toHaveAttribute("aria-pressed", "true");
  });
});
