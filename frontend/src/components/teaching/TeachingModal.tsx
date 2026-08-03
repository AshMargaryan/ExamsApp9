import { useEffect, useState } from "react";
import * as teachingApi from "../../api/teaching";
import type { StudentSearchResult, TeacherStudentConnection } from "../../api/teaching";
import type { Role } from "../../api/auth";
import { PublicProfileModal } from "../profile/PublicProfileModal";

type Tab = "invitations" | "search";

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function Avatar({
  user,
  onClick,
}: {
  user: { id: number; username: string; first_name: string; avatar: string | null };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Տեսնել պրոֆիլը"
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted transition-colors hover:border-primary"
    >
      {user.avatar ? (
        <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
      ) : (
        (user.first_name || user.username).slice(0, 1).toUpperCase()
      )}
    </button>
  );
}

export function TeachingModal({
  role,
  onClose,
  onChange,
}: {
  role: Role;
  onClose: () => void;
  onChange: () => void;
}) {
  const [tab, setTab] = useState<Tab>("invitations");
  const [invitations, setInvitations] = useState<TeacherStudentConnection[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  function loadInvitations() {
    teachingApi.fetchInvitations().then(setInvitations);
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    if (tab !== "search" || role !== "teacher") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await teachingApi.searchStudents(query));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab, role]);

  async function handleSend(studentId: number) {
    setError(null);
    try {
      await teachingApi.sendInvitation(studentId);
      setResults(await teachingApi.searchStudents(query));
      loadInvitations();
    } catch (err) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail ?? "Հրավերն ուղարկելիս սխալ տեղի ունեցավ։");
    }
  }

  async function handleRespond(id: number, action: "accept" | "decline") {
    await teachingApi.respondToInvitation(id, action);
    loadInvitations();
    onChange();
  }

  async function handleCancel(id: number) {
    await teachingApi.cancelInvitation(id);
    loadInvitations();
  }

  function tabClass(t: Tab) {
    return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      tab === t ? "bg-primary text-primary-contrast" : "text-text-muted hover:bg-surface-muted"
    }`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">
            {role === "teacher" ? "Աշակերտների հրավերներ" : "Ուսուցիչների հրավերներ"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="text-lg text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>

        {role === "teacher" && (
          <div className="mb-4 flex gap-2">
            <button type="button" className={tabClass("invitations")} onClick={() => setTab("invitations")}>
              Ուղարկված {invitations ? `(${invitations.length})` : ""}
            </button>
            <button type="button" className={tabClass("search")} onClick={() => setTab("search")}>
              Հրավիրել աշակերտի
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {tab === "invitations" && (
            <>
              {invitations === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {invitations?.length === 0 && (
                <p className="text-text-muted">
                  {role === "teacher" ? "Ուղարկված հրավերներ չկան։" : "Հրավերներ չկան։"}
                </p>
              )}
              {invitations?.map((inv) => {
                const person = role === "teacher" ? inv.student : inv.teacher;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={person} onClick={() => setViewingUserId(person.id)} />
                      <div>
                        <p className="text-text">{displayName(person)}</p>
                        <p className="text-xs text-text-muted">@{person.username}</p>
                      </div>
                    </div>
                    {role === "teacher" ? (
                      <button
                        type="button"
                        onClick={() => handleCancel(inv.id)}
                        className="text-sm text-text-muted hover:underline"
                      >
                        Չեղարկել
                      </button>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleRespond(inv.id, "accept")}
                          className="text-sm text-primary hover:underline"
                        >
                          Ընդունել
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespond(inv.id, "decline")}
                          className="text-sm text-text-muted hover:underline"
                        >
                          Մերժել
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === "search" && role === "teacher" && (
            <>
              <input
                autoFocus
                className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
                placeholder="Փնտրեք օգտանունով..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searching && <p className="text-text-muted">Փնտրվում է...</p>}
              {!searching && query && results?.length === 0 && (
                <p className="text-text-muted">Ոչինչ չի գտնվել։</p>
              )}
              {results?.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={u} onClick={() => setViewingUserId(u.id)} />
                    <div>
                      <p className="text-text">{displayName(u)}</p>
                      <p className="text-xs text-text-muted">@{u.username}</p>
                    </div>
                  </div>
                  {u.connection_status === "none" && (
                    <button
                      type="button"
                      onClick={() => handleSend(u.id)}
                      className="text-sm text-primary hover:underline"
                    >
                      Հրավիրել
                    </button>
                  )}
                  {u.connection_status === "pending" && (
                    <span className="text-sm text-text-muted">Ուղարկված է</span>
                  )}
                  {u.connection_status === "accepted" && (
                    <span className="text-sm text-text-muted">Կապակցված է</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}
      </div>

      {viewingUserId !== null && (
        <div onClick={(e) => e.stopPropagation()}>
          <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        </div>
      )}
    </div>
  );
}