import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import confetti from "canvas-confetti";
import { ScoreModal } from "../ScoreModal";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

const PROPS = {
  correctCount: 4,
  total: 4,
  continueLabel: "Անցնել Միջին մակարդակին",
  onContinue: () => {},
  onClose: () => {},
};

beforeEach(() => {
  vi.mocked(confetti).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScoreModal", () => {
  it("states how the student did in words, not only in colour", () => {
    setReducedMotion(true);
    render(<ScoreModal {...PROPS} correctCount={1} total={4} />);
    expect(screen.getByText("Այս թեման ուշադրություն է պահանջում")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("is a real dialog rather than a bare overlay div", () => {
    setReducedMotion(true);
    render(<ScoreModal {...PROPS} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // The title is what labels it for assistive tech.
    expect(screen.getByText("Անթերի է")).toBeInTheDocument();
  });

  it("offers both next steps as named actions, not a bare close glyph", () => {
    setReducedMotion(true);
    render(<ScoreModal {...PROPS} />);
    expect(screen.getByRole("button", { name: "Տեսնել պատասխանները" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Անցնել Միջին մակարդակին" })).toBeInTheDocument();
  });

  it("does not fire confetti when the student asked for reduced motion", () => {
    setReducedMotion(true);
    render(<ScoreModal {...PROPS} />);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("still celebrates a perfect score when motion is allowed", () => {
    setReducedMotion(false);
    render(<ScoreModal {...PROPS} />);
    expect(confetti).toHaveBeenCalled();
  });

  it("never celebrates an imperfect score", () => {
    setReducedMotion(false);
    render(<ScoreModal {...PROPS} correctCount={3} total={4} />);
    expect(confetti).not.toHaveBeenCalled();
  });
});
