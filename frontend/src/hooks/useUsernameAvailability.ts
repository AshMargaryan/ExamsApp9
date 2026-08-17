import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailability, type UsernameAvailability } from "../api/auth";

/*
  Live username availability for the signup form.

  A field that asks the server on every keystroke would send a request per
  letter, so three things keep the traffic down to roughly one request per
  name the user actually pauses on:

    1. debounce — nothing is sent until typing stops for DEBOUNCE_MS;
    2. a module-level cache — every verdict already seen this session answers
       instantly and offline, which covers backspacing, re-typing, and stepping
       back to this screen;
    3. in-flight dedupe — the same name requested twice shares one promise.

  The server caches taken verdicts too (see UsernameAvailabilityView), so even
  a cold client checking a popular name costs no database work.
*/

const DEBOUNCE_MS = 450;
const MIN_LENGTH = 3;

export type UsernameStatus = "idle" | "too-short" | "checking" | "available" | "taken" | "invalid" | "error";

export interface UsernameCheck {
  status: UsernameStatus;
  /** Reason text from the server when taken or malformed. */
  detail: string;
  suggestions: string[];
}

const IDLE: UsernameCheck = { status: "idle", detail: "", suggestions: [] };

// Deliberately module-level, not per-hook state: the answer for a given name
// doesn't depend on which component asked, and surviving unmount is the point
// (stepping back and forth through signup shouldn't re-ask).
const cache = new Map<string, UsernameAvailability>();
const inFlight = new Map<string, Promise<UsernameAvailability>>();

function fetchOnce(username: string): Promise<UsernameAvailability> {
  const existing = inFlight.get(username);
  if (existing) return existing;

  const request = checkUsernameAvailability(username)
    .then((result) => {
      // Only "taken"/"invalid" are cached. An available name can be claimed by
      // someone else a second later, and caching that would tell the user a
      // name is free right up until registration rejects it.
      if (!result.available) cache.set(username, result);
      return result;
    })
    .finally(() => inFlight.delete(username));

  inFlight.set(username, request);
  return request;
}

function toCheck(result: UsernameAvailability): UsernameCheck {
  if (!result.valid) return { status: "invalid", detail: result.detail, suggestions: [] };
  if (result.available) return { status: "available", detail: "", suggestions: [] };
  return { status: "taken", detail: result.detail, suggestions: result.suggestions };
}

export function useUsernameAvailability(username: string): UsernameCheck {
  const [check, setCheck] = useState<UsernameCheck>(IDLE);
  // Guards against a slow response for an earlier name overwriting the verdict
  // for what's in the field now.
  const latest = useRef("");

  useEffect(() => {
    const trimmed = username.trim();
    latest.current = trimmed;

    if (trimmed.length === 0) {
      setCheck(IDLE);
      return;
    }
    if (trimmed.length < MIN_LENGTH) {
      setCheck({ status: "too-short", detail: "", suggestions: [] });
      return;
    }

    const cached = cache.get(trimmed);
    if (cached) {
      setCheck(toCheck(cached));
      return;
    }

    setCheck({ status: "checking", detail: "", suggestions: [] });
    const timer = setTimeout(() => {
      fetchOnce(trimmed)
        .then((result) => {
          if (latest.current === trimmed) setCheck(toCheck(result));
        })
        .catch(() => {
          // Offline or throttled: say nothing rather than block the user —
          // registration still validates for real.
          if (latest.current === trimmed) setCheck({ status: "error", detail: "", suggestions: [] });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [username]);

  return check;
}

/** Test-only: drops the session cache so specs don't leak verdicts. */
export function resetUsernameAvailabilityCache() {
  cache.clear();
  inFlight.clear();
}
