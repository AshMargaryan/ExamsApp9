import { useEffect, useState } from "react";
import * as sessionsApi from "../../api/sessions";
import type { DeviceSession } from "../../api/sessions";
import { SessionsList } from "./SessionsList";

interface Props {
  ticket: string;
  onRevokedRetry: () => void;
  onClose: () => void;
}

export function DeviceLimitModal({ ticket, onRevokedRetry, onClose }: Props) {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    sessionsApi
      .fetchManagedSessions(ticket)
      .then(setSessions)
      .catch(() => setError("Չհաջողվեց բեռնել սարքերի ցանկը։"));
  }, [ticket]);

  async function handleRevoke(id: number) {
    setError(null);
    setRevokingId(id);
    try {
      await sessionsApi.revokeManagedSession(ticket, id);
      onRevokedRetry();
    } catch {
      setError("Չհաջողվեց անջատել սարքը։");
      setRevokingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել"
          className="absolute top-3 right-3 text-lg text-text-muted transition-colors hover:text-text"
        >
          ✕
        </button>
        <p className="text-4xl">📱</p>
        <h2 className="mt-4 text-lg font-semibold text-text">Հասել եք սարքերի սահմանաչափին</h2>
        <p className="mt-2 text-sm text-text-muted">
          Միաժամանակ կարող եք մուտք գործած լինել առավելագույնը 2 սարքից։ Անջատեք ստորև ներկայացված սարքերից մեկը՝
          շարունակելու համար։
        </p>

        <div className="mt-4">
          {sessions === null ? (
            <p className="text-sm text-text-muted">Բեռնվում է...</p>
          ) : (
            <SessionsList sessions={sessions} onRevoke={handleRevoke} revokingId={revokingId} />
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
