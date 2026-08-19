import { useCallback, useEffect, useRef, useState } from "react";

/*
  One async read, with all four states and a retry.

  The pattern this replaces, from HomePage:

      useEffect(() => {
        profileApi.fetchProfile().then(setProfile);
        streaksApi.fetchStreak().then(setStreak);
        // …three more
      }, []);

  No `.catch`, so any failure left the page on its `Բեռնվում է...` branch
  permanently — no error, no explanation, no way back. And no cleanup, so a
  student who navigated away mid-flight got a state update on an unmounted
  component.

  Deliberately NOT a cache. The app has no React Query/SWR by design (see
  CLAUDE.md — adopting one is a repo-wide decision, not a one-off), so this
  stays a thin per-component primitive: same fetch-on-mount semantics as
  before, but with the error branch and the cleanup that were missing.

  `deps` re-runs the fetch when they change, exactly like useEffect.
*/

export type AsyncResource<T> = {
  data: T | null;
  /** True only on the first load; a retry sets `isReloading` instead, so the
   *  UI can keep showing stale content rather than flashing back to skeletons. */
  isLoading: boolean;
  isReloading: boolean;
  error: unknown | null;
  retry: () => void;
  /** For the rare case where a component owns an update to the fetched value
   *  (e.g. saving the exam date returns a fresh profile). */
  setData: (value: T) => void;
};

export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  deps: readonly unknown[] = [],
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Kept in a ref so callers can pass an inline arrow without the effect
  // re-running on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;

    // A retry keeps the previously loaded value on screen while it re-fetches.
    if (attempt > 0) setIsReloading(true);
    else setIsLoading(true);
    setError(null);

    fetcherRef.current()
      .then((value) => {
        if (!active) return;
        setData(value);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err ?? new Error("request failed"));
      })
      .finally(() => {
        if (!active) return;
        setIsLoading(false);
        setIsReloading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, isLoading, isReloading, error, retry, setData };
}
