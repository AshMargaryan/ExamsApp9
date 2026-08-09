import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountSessionsPage } from "../AccountSessionsPage";
import * as sessionsApi from "../../api/sessions";
import type { DeviceSession } from "../../api/sessions";

vi.mock("../../api/sessions");

const SESSIONS: DeviceSession[] = [
  { id: 1, platform: "Windows", browser: "Chrome", created_at: "2026-01-01T10:00:00Z", last_activity_at: "2026-01-02T10:00:00Z", is_current: true },
  { id: 2, platform: "Android", browser: "Chrome", created_at: "2026-01-01T09:00:00Z", last_activity_at: "2026-01-02T09:00:00Z", is_current: false },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountSessionsPage />
    </MemoryRouter>,
  );
}

describe("AccountSessionsPage", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.fetchSessions).mockResolvedValue(SESSIONS);
    vi.mocked(sessionsApi.revokeSession).mockResolvedValue(undefined);
  });

  it("lists devices and marks the current one", async () => {
    renderPage();

    expect(await screen.findByText(/Windows/)).toBeInTheDocument();
    expect(screen.getByText(/Android/)).toBeInTheDocument();
    expect(screen.getByText("Այս սարքը")).toBeInTheDocument();

    // The current device has no revoke button; only the other one does.
    expect(screen.getAllByRole("button", { name: "Անջատել" })).toHaveLength(1);
  });

  it("removes a session from the list after revoking it", async () => {
    renderPage();
    await screen.findByText(/Android/);

    await userEvent.click(screen.getByRole("button", { name: "Անջատել" }));

    await waitFor(() => {
      expect(sessionsApi.revokeSession).toHaveBeenCalledWith(2);
      expect(screen.queryByText(/Android/)).not.toBeInTheDocument();
    });
    // The current device is still there.
    expect(screen.getByText(/Windows/)).toBeInTheDocument();
  });
});
