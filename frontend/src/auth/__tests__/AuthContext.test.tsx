import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { tokenStorage } from "../../api/client";
import * as authApi from "../../api/auth";

vi.mock("../../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../../api/auth")>("../../api/auth");
  return { ...actual, fetchMe: vi.fn() };
});

function Probe() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>loading</p>;
  return <p>{user ? `logged in as ${user.username}` : "logged out"}</p>;
}

describe("AuthContext — behavior after a session is revoked", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats a stored token whose session was revoked as logged out", async () => {
    // Simulates the real flow: the backend rejects /auth/me/ with 401 once
    // the session backing this token has been revoked (SessionAwareJWTAuthentication),
    // and the existing AuthProvider mount effect already handles fetchMe()
    // failing by clearing local tokens and leaving the user logged out.
    tokenStorage.set("stale-access-token", "stale-refresh-token");
    vi.mocked(authApi.fetchMe).mockRejectedValue(new Error("401 Unauthorized"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("logged out")).toBeInTheDocument();
    });
    expect(tokenStorage.getAccess()).toBeNull();
  });

  it("keeps the user logged in when the stored token is still valid", async () => {
    tokenStorage.set("valid-access-token", "valid-refresh-token");
    vi.mocked(authApi.fetchMe).mockResolvedValue({
      id: 1, username: "student1", email: "s@example.com", date_joined: "2026-01-01",
      is_email_verified: true, role: "student", first_name: "A", last_name: "B",
      age: null, grade: null, sex: "", school: null, university: null,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("logged in as student1")).toBeInTheDocument();
    });
    expect(tokenStorage.getAccess()).toBe("valid-access-token");
  });
});
