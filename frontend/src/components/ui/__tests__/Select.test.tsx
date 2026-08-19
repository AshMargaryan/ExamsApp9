import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Select } from "../Select";

/*
  These cover the keyboard contract, which is the whole reason a custom
  listbox is riskier than a native <select> — and the reason it regressed:
  callers pass `options` as an inline array literal, so anything keyed on its
  identity re-runs every render. An effect that re-seeded the highlight that
  way made the arrow keys look completely dead, with nothing to notice it.
*/

const OPTIONS = [
  { value: "math", label: "Մաթեմատիկա" },
  { value: "physics", label: "Ֆիզիկա" },
  { value: "biology", label: "Կենսաբանություն" },
];

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    // Rebuilt inline on every render, exactly as real call sites do it.
    <Select
      label="Առարկա"
      value={value}
      onChange={setValue}
      options={OPTIONS.map((o) => ({ ...o }))}
    />
  );
}

function trigger() {
  return screen.getByRole("combobox", { name: "Առարկա" });
}

describe("Select", () => {
  it("opens on ArrowDown and moves the highlight with repeated presses", async () => {
    render(<Harness />);
    trigger().focus();

    await userEvent.keyboard("{ArrowDown}");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");

    // Each press must advance. The regression pinned this at option 0.
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");

    const active = trigger().getAttribute("aria-activedescendant");
    expect(active).toMatch(/-2$/);
  });

  it("commits the highlighted option on Enter", async () => {
    render(<Harness />);
    trigger().focus();

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(trigger()).toHaveTextContent("Ֆիզիկա");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on the current value rather than the top of the list", async () => {
    render(<Harness initial="biology" />);
    await userEvent.click(trigger());

    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/-2$/);
  });

  it("jumps by type-ahead", async () => {
    render(<Harness />);
    await userEvent.click(trigger());

    await userEvent.keyboard("Ֆ");

    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/-1$/);
  });

  it("supports Home and End", async () => {
    render(<Harness initial="physics" />);
    await userEvent.click(trigger());

    await userEvent.keyboard("{End}");
    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/-2$/);

    await userEvent.keyboard("{Home}");
    expect(trigger().getAttribute("aria-activedescendant")).toMatch(/-0$/);
  });

  it("closes on Escape without changing the value", async () => {
    const onChange = vi.fn();
    render(<Select label="Առարկա" value="math" onChange={onChange} options={OPTIONS} />);

    await userEvent.click(trigger());
    await userEvent.keyboard("{ArrowDown}{Escape}");

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveTextContent("Մաթեմատիկա");
  });

  it("skips disabled options when stepping", async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Առարկա"
        value=""
        onChange={onChange}
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B", disabled: true },
          { value: "c", label: "C" },
        ]}
      />,
    );
    trigger().focus();

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("c");
  });
});
