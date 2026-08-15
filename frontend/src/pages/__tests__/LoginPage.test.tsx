import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { LoginPage } from "../LoginPage";
import { AuthProvider } from "../../auth/AuthContext";
import * as authApi from "../../api/auth";
import * as sessionsApi from "../../api/sessions";
import type { User } from "../../api/auth";
import type { DeviceSession } from "../../api/sessions";

vi.mock("../../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../../api/auth")>("../../api/auth");
  return { ...actual, login: vi.fn(), fetchMe: vi.fn() };
});
vi.mock("../../api/sessions");

const FAKE_USER: User = {
  id: 1, username: "student1", email: "s@example.com", date_joined: "2026-01-01",
  is_email_verified: true, role: "student", first_name: "A", last_name: "B",
  age: null, grade: null, sex: "", school: null, university: null,
  has_usable_password: true,
};

const FAKE_SESSIONS: DeviceSession[] = [
  { id: 1, platform: "Windows", browser: "Chrome", created_at: "2026-01-01T10:00:00Z", last_activity_at: "2026-01-02T10:00:00Z", is_current: false },
  { id: 2, platform: "macOS", browser: "Safari", created_at: "2026-01-01T09:00:00Z", last_activity_at: "2026-01-02T09:00:00Z", is_current: false },
];

function deviceLimitError() {
  const error = new AxiosError("Forbidden", "403");
  error.response = {
    status: 403,
    statusText: "Forbidden",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {
      code: "device_limit_reached",
      detail: "Հասել եք սարքերի առավելագույն թվին (2)։",
      management_ticket: "signed-ticket",
    },
  };
  return error;
}

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function getInputs(container: HTMLElement) {
  const inputs = container.querySelectorAll("input");
  return { username: inputs[0] as HTMLInputElement, password: inputs[1] as HTMLInputElement };
}

describe("LoginPage — device limit rejection", () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchMe).mockResolvedValue(FAKE_USER);
  });

  it("shows the device-limit panel with existing sessions when login is rejected", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(deviceLimitError());
    vi.mocked(sessionsApi.fetchManagedSessions).mockResolvedValue(FAKE_SESSIONS);

    const { container } = renderLoginPage();
    const { username, password } = getInputs(container);
    await userEvent.type(username, "student1");
    await userEvent.type(password, "password123");
    await userEvent.click(screen.getByRole("button", { name: "Մուտք գործել" }));

    expect(await screen.findByText("Հասել եք սարքերի սահմանաչափին")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Windows/)).toBeInTheDocument();
      expect(screen.getByText(/macOS/)).toBeInTheDocument();
    });
  });

  it("retries login automatically after revoking a session from the panel", async () => {
    vi.mocked(authApi.login)
      .mockRejectedValueOnce(deviceLimitError())
      .mockResolvedValueOnce(undefined);
    vi.mocked(sessionsApi.fetchManagedSessions).mockResolvedValue(FAKE_SESSIONS);
    vi.mocked(sessionsApi.revokeManagedSession).mockResolvedValue(undefined);

    const { container } = renderLoginPage();
    const { username, password } = getInputs(container);
    await userEvent.type(username, "student1");
    await userEvent.type(password, "password123");
    await userEvent.click(screen.getByRole("button", { name: "Մուտք գործել" }));

    await screen.findByText("Հասել եք սարքերի սահմանաչափին");
    const revokeButtons = await screen.findAllByRole("button", { name: "Անջատել" });
    await userEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(sessionsApi.revokeManagedSession).toHaveBeenCalledWith("signed-ticket", FAKE_SESSIONS[0].id);
      expect(authApi.login).toHaveBeenCalledTimes(2);
    });
  });
});
