/*
  Share one in-flight request between concurrent callers.

  This is **not** a cache, and the distinction is the whole point. Nothing is
  retained after the promise settles: the entry is deleted in `finally`, so the
  next call always goes to the network. There is no staleness policy, no TTL
  and nothing to invalidate — the only thing it removes is two components
  asking for the same thing in the same tick and getting two identical
  requests.

  Why that is worth a module
  --------------------------
  Measured on the dashboard (see docs/DESIGN.md §13): `GET /profile/me/` is
  issued twice on every mount of "/", once by `HeaderStrip` for the streak and
  XP chips and once by `HomePage` for the greeting and the exam date. Both
  requests start within a millisecond of each other and return the same body.
  The same shape appears on `GET /teaching/assignments/notifications/`, which
  `useAssignmentNotifications` fetches from two components mounted at once —
  the sidebar's badge and the notification bell.

  The general fix for that is a shared provider, and a shared provider needs a
  refresh contract: both call sites mutate the profile (the exam date, the
  avatar) and would have to agree on when the shared value is stale. That is a
  real design decision and it belongs to the product owner — so this does the
  part that needs no decision at all.

  Deliberately keyed by the caller rather than derived from the request, so a
  key can never accidentally collapse two calls that differ in a header, a
  query string or the signed-in user.
*/

const pending = new Map<string, Promise<unknown>>();

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = pending.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = run().finally(() => {
    pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}

/** Test seam: the map is module state, so a test that asserts on it needs a
 *  way back to empty. */
export function clearInFlight() {
  pending.clear();
}
