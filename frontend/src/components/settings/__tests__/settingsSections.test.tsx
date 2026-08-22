import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SecuritySection } from "../SecuritySection";
import { PrivacySection } from "../PrivacySection";
import { AuthProvider } from "../../../auth/AuthContext";
import { ToastProvider } from "../../../context/ToastContext";
import * as sessionsApi from "../../../api/sessions";
import * as profileApi from "../../../api/profile";
import type { DeviceSession } from "../../../api/sessions";
import type { PrivacySettings } from "../../../api/profile";

vi.mock("../../../api/sessions");
vi.mock("../../../api/profile");
vi.mock("../../../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../../../api/auth")>("../../../api/auth");
  return { ...actual, fetchMe: vi.fn().mockRejectedValue(new Error("no session")), changePassword: vi.fn() };
});

const SESSIONS: DeviceSession[] = [
  {
    id: 1,
    platform: "Windows",
    browser: "Chrome",
    created_at: "2026-01-01T10:00:00Z",
    last_activity_at: "2026-01-02T10:00:00Z",
    is_current: true,
  },
  {
    id: 2,
    platform: "Android",
    browser: "Chrome",
    created_at: "2026-01-01T09:00:00Z",
    last_activity_at: "2026-01-02T09:00:00Z",
    is_current: false,
  },
];

const PRIVACY: PrivacySettings = {
  show_school: true,
  show_age: true,
  show_university: true,
  show_stats: true,
  show_ranking: true,
  show_achievements: true,
  show_friends: true,
  show_activity: true,
  show_on_leaderboard: true,
};

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("SecuritySection — devices", () => {
  beforeEach(() => {
    vi.mocked(sessionsApi.fetchSessions).mockResolvedValue(SESSIONS);
    vi.mocked(sessionsApi.revokeSession).mockResolvedValue(undefined);
  });

  it("lists devices, marks the current one, and only offers to disconnect the others", async () => {
    renderWithProviders(<SecuritySection />);

    expect(await screen.findByText(/Windows/)).toBeInTheDocument();
    expect(screen.getByText(/Android/)).toBeInTheDocument();
    expect(screen.getByText("Այս սարքը")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Անջատել" })).toHaveLength(1);
  });

  it("confirms before disconnecting, then removes the device from the list", async () => {
    renderWithProviders(<SecuritySection />);
    await screen.findByText(/Android/);

    await userEvent.click(screen.getByRole("button", { name: "Անջատել" }));

    // Disconnecting a device is not undoable from here, so it asks first —
    // the previous page revoked on the first click.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Անջատե՞լ այս սարքը");

    await userEvent.click(within(dialog).getByRole("button", { name: "Անջատել" }));

    await waitFor(() => {
      expect(sessionsApi.revokeSession).toHaveBeenCalledWith(2);
      expect(screen.queryByText(/Android/)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Windows/)).toBeInTheDocument();
  });

  it("offers a retry instead of loading forever when the device list fails", async () => {
    vi.mocked(sessionsApi.fetchSessions).mockRejectedValueOnce(new Error("offline"));
    renderWithProviders(<SecuritySection />);

    expect(await screen.findByText("Չհաջողվեց բեռնել սարքերի ցանկը։")).toBeInTheDocument();
  });
});

describe("PrivacySection", () => {
  beforeEach(() => {
    vi.mocked(profileApi.fetchPrivacySettings).mockResolvedValue(PRIVACY);
  });

  it("rolls a toggle back when the save fails, rather than claiming it saved", async () => {
    // Held open so the optimistic value can be asserted *before* the failure
    // lands — otherwise this test would pass even if the toggle never moved.
    let reject!: (reason: unknown) => void;
    vi.mocked(profileApi.updatePrivacySettings).mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    renderWithProviders(<PrivacySection />);

    const schoolSwitch = await screen.findByRole("switch", { name: "Դպրոց" });
    expect(schoolSwitch).toHaveAttribute("aria-checked", "true");

    await userEvent.click(schoolSwitch);
    expect(schoolSwitch).toHaveAttribute("aria-checked", "false");

    reject(new Error("500"));

    // The old modal left the optimistic value on screen after a rejected
    // request, so the switch said "hidden" while the server said "visible".
    await waitFor(() => expect(schoolSwitch).toHaveAttribute("aria-checked", "true"));
  });

  it("keeps the server's value when the save succeeds", async () => {
    vi.mocked(profileApi.updatePrivacySettings).mockResolvedValue({ ...PRIVACY, show_age: false });
    renderWithProviders(<PrivacySection />);

    const ageSwitch = await screen.findByRole("switch", { name: "Տարիք" });
    await userEvent.click(ageSwitch);

    await waitFor(() => expect(ageSwitch).toHaveAttribute("aria-checked", "false"));
    expect(profileApi.updatePrivacySettings).toHaveBeenCalledWith({ show_age: false });
  });
});
