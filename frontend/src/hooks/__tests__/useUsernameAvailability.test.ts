import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as authApi from "../../api/auth";
import { resetUsernameAvailabilityCache, useUsernameAvailability } from "../useUsernameAvailability";

vi.mock("../../api/auth", async () => {
  const actual = await vi.importActual<typeof import("../../api/auth")>("../../api/auth");
  return { ...actual, checkUsernameAvailability: vi.fn() };
});

const check = vi.mocked(authApi.checkUsernameAvailability);

function taken(username: string) {
  return {
    username,
    available: false,
    valid: true,
    detail: "Այս օգտանունն արդեն զբաղված է։",
    suggestions: [`${username}12`, `${username}34`],
  };
}

function free(username: string) {
  return { username, available: true, valid: true, detail: "", suggestions: [] };
}

describe("useUsernameAvailability", () => {
  beforeEach(() => {
    resetUsernameAvailabilityCache();
    // shouldAdvanceTime keeps real time moving under the fake clock, so
    // RTL's waitFor can still poll while we control the debounce timer.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the server before the debounce elapses", () => {
    renderHook(() => useUsernameAvailability("daniel"));
    expect(check).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(449);
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("reports a taken username with its suggestions", async () => {
    check.mockResolvedValue(taken("daniel"));
    const { result } = renderHook(() => useUsernameAvailability("daniel"));

    act(() => {
      vi.advanceTimersByTime(450);
    });

    await waitFor(() => expect(result.current.status).toBe("taken"));
    expect(result.current.suggestions).toEqual(["daniel12", "daniel34"]);
  });

  it("answers a repeated taken username from cache without a second request", async () => {
    check.mockResolvedValue(taken("daniel"));
    const first = renderHook(() => useUsernameAvailability("daniel"));
    act(() => {
      vi.advanceTimersByTime(450);
    });
    await waitFor(() => expect(first.result.current.status).toBe("taken"));
    expect(check).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useUsernameAvailability("daniel"));

    // Cached verdicts resolve synchronously — no debounce wait, no request.
    expect(second.result.current.status).toBe("taken");
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("re-asks for an available username, since it can be claimed at any moment", async () => {
    check.mockResolvedValue(free("daniel"));
    const first = renderHook(() => useUsernameAvailability("daniel"));
    act(() => {
      vi.advanceTimersByTime(450);
    });
    await waitFor(() => expect(first.result.current.status).toBe("available"));

    renderHook(() => useUsernameAvailability("daniel"));
    act(() => {
      vi.advanceTimersByTime(450);
    });

    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));
  });

  it("stays quiet below the minimum length", () => {
    const { result } = renderHook(() => useUsernameAvailability("da"));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe("too-short");
    expect(check).not.toHaveBeenCalled();
  });

  it("does not block the user when the check itself fails", async () => {
    check.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useUsernameAvailability("daniel"));

    act(() => {
      vi.advanceTimersByTime(450);
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
  });
});
