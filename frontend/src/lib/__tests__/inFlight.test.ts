import { afterEach, describe, expect, it, vi } from "vitest";
import { clearInFlight, dedupe } from "../inFlight";

afterEach(() => clearInFlight());

describe("dedupe", () => {
  it("gives concurrent callers one request", async () => {
    const run = vi.fn(() => Promise.resolve("profile"));

    const [a, b] = await Promise.all([dedupe("k", run), dedupe("k", run)]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(a).toBe("profile");
    expect(b).toBe("profile");
  });

  /* The property that makes this not a cache: once a request settles it is
     forgotten, so the next read is fresh. A student who has just earned XP
     must not be shown the profile that was fetched before it. */
  it("does not retain the result once the request settles", async () => {
    const run = vi.fn(() => Promise.resolve("profile"));

    await dedupe("k", run);
    await dedupe("k", run);

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("keeps different keys apart", async () => {
    const run = vi.fn((v: string) => Promise.resolve(v));

    const [a, b] = await Promise.all([dedupe("a", () => run("a")), dedupe("b", () => run("b"))]);

    expect(run).toHaveBeenCalledTimes(2);
    expect([a, b]).toEqual(["a", "b"]);
  });

  it("rejects every joined caller, and forgets the failure", async () => {
    const failing = vi.fn(() => Promise.reject(new Error("offline")));

    const both = Promise.all([dedupe("k", failing), dedupe("k", failing)]);
    await expect(both).rejects.toThrow("offline");
    expect(failing).toHaveBeenCalledTimes(1);

    // A failed read must not poison the key — a retry has to reach the network.
    await expect(dedupe("k", failing)).rejects.toThrow("offline");
    expect(failing).toHaveBeenCalledTimes(2);
  });
});
