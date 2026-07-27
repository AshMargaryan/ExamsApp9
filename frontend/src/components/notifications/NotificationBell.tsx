import { useEffect, useRef, useState } from "react";
import * as friendsApi from "../../api/friends";
import type { FriendRequest } from "../../api/friends";
import { PublicProfileModal } from "../profile/PublicProfileModal";

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState<FriendRequest[] | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  function loadIncoming() {
    friendsApi.fetchIncomingRequests().then(setIncoming);
  }

  useEffect(() => {
    loadIncoming();
    const interval = setInterval(loadIncoming, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRespond(requestId: number, action: "accept" | "reject") {
    await friendsApi.respondToRequest(requestId, action);
    loadIncoming();
  }

  const count = incoming?.length ?? 0;

  return (
    <div ref={wrapRef} className="fixed right-4 top-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ծանուցումներ"
        title="Ծանուցումներ"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-lg transition-colors hover:border-primary"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 max-h-96 w-[min(92vw,22rem)] overflow-y-auto rounded-[var(--radius)] border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text">Ընկերության հարցումներ</span>
          </div>

          {incoming === null && <p className="p-4 text-sm text-text-muted">Բեռնվում է...</p>}
          {incoming?.length === 0 && <p className="p-4 text-sm text-text-muted">Նոր հարցումներ չկան։</p>}

          {incoming?.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
              <button
                type="button"
                onClick={() => setViewingUserId(r.sender.id)}
                title="Տեսնել պրոֆիլը"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted transition-colors hover:border-primary"
              >
                {r.sender.avatar ? (
                  <img src={r.sender.avatar} alt={r.sender.username} className="h-full w-full object-cover" />
                ) : (
                  (r.sender.first_name || r.sender.username).slice(0, 1).toUpperCase()
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  <span className="font-medium">{displayName(r.sender)}</span>-ից ընկերության հարցում
                </p>
                <p className="text-xs text-text-muted">@{r.sender.username}</p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleRespond(r.id, "accept")}
                    className="text-sm text-primary hover:underline"
                  >
                    Ընդունել
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(r.id, "reject")}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Մերժել
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingUserId(r.sender.id)}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Պրոֆիլ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingUserId !== null && (
        <div onClick={(e) => e.stopPropagation()}>
          <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        </div>
      )}
    </div>
  );
}
