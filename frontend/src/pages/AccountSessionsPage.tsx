import { useEffect, useState } from "react";
import * as sessionsApi from "../api/sessions";
import type { DeviceSession } from "../api/sessions";
import { SessionsList } from "../components/auth/SessionsList";
import { MessageModal } from "../components/MessageModal";
import { LinkButton } from "../components/ui/LinkButton";

export function AccountSessionsPage() {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    sessionsApi
      .fetchSessions()
      .then(setSessions)
      .catch(() => setError("Չհաջողվեց բեռնել սարքերի ցանկը։"));
  }, []);

  async function handleRevoke(id: number) {
    setRevokingId(id);
    try {
      await sessionsApi.revokeSession(id);
      setSessions((current) => current?.filter((s) => s.id !== id) ?? null);
    } catch {
      setError("Չհաջողվեց անջատել սարքը։");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <LinkButton to="/profile">← Հետ դեպի պրոֆիլ</LinkButton>

      <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-text">Ակտիվ սարքեր</h1>
        <p className="mb-6 text-sm text-text-muted">
          Առավելագույնը 2 սարք կարող են միաժամանակ մուտք գործած լինել Ձեր հաշվում։ Անջատեք սարքը, որն այլևս Ձեզ չի
          պատկանում կամ Ձեզ պետք չէ։
        </p>

        {sessions === null ? (
          <p className="text-sm text-text-muted">Բեռնվում է...</p>
        ) : (
          <SessionsList sessions={sessions} onRevoke={handleRevoke} revokingId={revokingId} />
        )}
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
