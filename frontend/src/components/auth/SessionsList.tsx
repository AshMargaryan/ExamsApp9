import type { DeviceSession } from "../../api/sessions";

interface Props {
  sessions: DeviceSession[];
  onRevoke: (id: number) => void;
  revokingId?: number | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("hy-AM", { dateStyle: "medium", timeStyle: "short" });
}

export function SessionsList({ sessions, onRevoke, revokingId }: Props) {
  if (sessions.length === 0) {
    return <p className="text-sm text-text-muted">Ակտիվ սարքեր չկան։</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between gap-4 rounded-md border border-border bg-bg p-4"
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-medium text-text">
              {session.platform || "Անհայտ սարք"}
              {session.browser && <span className="text-text-muted">· {session.browser}</span>}
              {session.is_current && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Այս սարքը
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Մուտք՝ {formatDate(session.created_at)} · Վերջին ակտիվություն՝ {formatDate(session.last_activity_at)}
            </p>
          </div>
          {!session.is_current && (
            <button
              type="button"
              onClick={() => onRevoke(session.id)}
              disabled={revokingId === session.id}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-primary disabled:opacity-60"
            >
              {revokingId === session.id ? "..." : "Անջատել"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
