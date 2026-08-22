import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MobileTabBar } from "../MobileTabBar";

// Both hooks poll the API on an interval; the tab bar only cares about the
// number they return, so stub them rather than standing up a fake server.
vi.mock("../../../hooks/useAssignmentNotifications", () => ({
  useAssignmentNotifications: () => [],
}));
vi.mock("../../../hooks/useChatUnreadCount", () => ({
  useChatUnreadCount: () => 3,
}));

function renderTabBar(role: "student" | "teacher" | "parent", path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar role={role} />
    </MemoryRouter>,
  );
}

describe("MobileTabBar", () => {
  it("shows the student's four primary destinations plus More", () => {
    renderTabBar("student");
    const tabBar = screen.getByRole("navigation", { name: "Հիմնական" });

    expect(within(tabBar).getByText("Գլխավոր")).toBeInTheDocument();
    expect(within(tabBar).getByText("Առարկաներ")).toBeInTheDocument();
    expect(within(tabBar).getByText("AI")).toBeInTheDocument();
    expect(within(tabBar).getByText("Չաթ")).toBeInTheDocument();
    expect(within(tabBar).getByText("Ավելին")).toBeInTheDocument();
  });

  it("marks the tab matching the current route as the current page", () => {
    renderTabBar("student", "/subjects/math");
    // A nested route still lights up its section's tab.
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute("href", "/subjects");
  });

  it("moves every non-primary destination into the More sheet", async () => {
    renderTabBar("student");
    const tabBar = screen.getByRole("navigation", { name: "Հիմնական" });
    expect(within(tabBar).queryByText("Բառաքարտեր")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Ավելին/ }));

    const sheet = screen.getByRole("dialog", { name: "Ավելին" });
    expect(within(sheet).getByText("Բառաքարտեր")).toBeInTheDocument();
    expect(within(sheet).getByText("Սխալների տետր")).toBeInTheDocument();
    // Account destinations have no sidebar equivalent on mobile, so the sheet
    // is the only way to reach them.
    expect(within(sheet).getByText("Կարգավորումներ")).toBeInTheDocument();
  });

  it("gives each role its own primary tabs", () => {
    const { unmount } = renderTabBar("teacher");
    expect(screen.getByText("Վահանակ")).toBeInTheDocument();
    expect(screen.queryByText("Առարկաներ")).not.toBeInTheDocument();
    unmount();

    renderTabBar("parent");
    // Parents get no study tools, so /subjects and the AI tab never appear.
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
    expect(screen.getByText("Չաթ")).toBeInTheDocument();
  });
});
