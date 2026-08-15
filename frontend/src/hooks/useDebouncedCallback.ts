import { useCallback, useEffect, useRef } from "react";

/** Debounces on the trailing edge only, and exposes `flush` so callers can
 * force an immediate save on blur/unmount instead of losing the last edit
 * to an in-flight timer — the pattern autosave editors need and a fixed
 * setInterval (e.g. MockExamAttemptPage's) doesn't give you. */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const debounced = useCallback(
    (...args: Args) => {
      pendingArgsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pending = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (pending) callbackRef.current(...pending);
      }, delayMs);
    },
    [delayMs],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingArgsRef.current;
    pendingArgsRef.current = null;
    if (pending) callbackRef.current(...pending);
  }, []);

  return [debounced, flush] as const;
}
