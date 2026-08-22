import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../LoginPage";
import { AuthProvider } from "../../auth/AuthContext";
import { ToastProvider } from "../../context/ToastContext";
import * as authApi from "../../api/auth";
import type { SignedOutDevice, User } from "../../api/auth";

vi.mock("../../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../../api/auth")>("../../api/auth");
  return { ...actual, login: vi.fn(), fetchMe: vi.fn() };
});

const FAKE_USER: User = {
  id: 1, username: "student1", email: "s@example.com", date_joined: "2026-01-01",
  is_email_verified: true, role: "student", first_name: "A", last_name: "B",
  age: null, grade: null, sex: "", school: null, university: null,
  has_usable_password: true,
};

const EVICTED: SignedOutDevice = { label: "Windows · Chrome", count: 1, device_limit: 2 };

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <LoginPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// The web form's <label>s have no htmlFor, so they can't be queried by label
// text; select the two fields structurally instead.
async function submitCredentials(container: HTMLElement) {
  const [username, password] = Array.from(container.querySelectorAll("input"));
  await userEvent.type(username, "student1");
  await userEvent.type(password, "hunter2222");
  await userEvent.click(screen.getByRole("button", { name: "Մուտք գործել" }));
}

describe("LoginPage — device limit eviction", () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchMe).mockResolvedValue(FAKE_USER);
  });

  it("tells the user which device was signed out to make room", async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(EVICTED);
    const { container } = renderLogin();

    await submitCredentials(container);

    // The login still succeeds — the cap evicts rather than blocks — so the
    // only user-visible trace is this notice.
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Windows · Chrome/);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/2 սարք/);
  });

  it("says nothing when the login was under the device cap", async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce(null);
    const { container } = renderLogin();

    await submitCredentials(container);

    await waitFor(() => expect(authApi.fetchMe).toHaveBeenCalled());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports bad credentials without claiming a device was signed out", async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(new Error("401"));
    const { container } = renderLogin();

    await submitCredentials(container);

    await waitFor(() => {
      expect(screen.getByText("Սխալ օգտանուն կամ գաղտնաբառ։")).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
