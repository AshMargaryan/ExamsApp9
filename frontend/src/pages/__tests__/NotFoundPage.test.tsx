import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";

/*
  Guards the catch-all. Before it existed, an unmatched URL rendered an
  entirely blank document, which no happy-path check can catch — so the
  properties worth pinning are "something rendered" and "there is a way out".
*/
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/practice" element={<p>practice</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("explains that the page does not exist rather than rendering nothing", () => {
    renderAt("/no-such-page");
    expect(screen.getByRole("heading", { name: "Այս էջը գոյություն չունի" })).toBeInTheDocument();
  });

  it("quotes the address that was tried, so a half-copied link is diagnosable", () => {
    renderAt("/some/deep/stale/link");
    expect(screen.getByText("/some/deep/stale/link")).toBeInTheDocument();
  });

  it("offers a way back into the product", () => {
    renderAt("/no-such-page");
    expect(screen.getByRole("link", { name: /Գլխավոր էջ/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Առարկաներ/ })).toHaveAttribute("href", "/practice");
  });

  it("still matches a nested unknown path", () => {
    renderAt("/practice/subtopic/12/not-a-tier/deeper");
    expect(screen.getByRole("heading", { name: "Այս էջը գոյություն չունի" })).toBeInTheDocument();
  });
});
