import { useEffect, useState } from "react";
import { Check, Globe, Lock, X } from "lucide-react";
import * as friendsApi from "../../api/friends";
import type { FriendUser, SearchResultUser } from "../../api/friends";
import type { GroupPrivacy } from "../../api/chat";

function UserPickerRow({
  user, selected, onToggle,
}: {
  user: FriendUser;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
        selected ? "bg-primary/10" : "hover:bg-surface-muted"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          (user.first_name || user.username).slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text">
          {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}
        </p>
        <p className="truncate text-xs text-text-muted">@{user.username}</p>
      </div>
      {selected && <Check size={16} strokeWidth={2.5} aria-hidden className="shrink-0 text-primary" />}
    </button>
  );
}

export interface GroupCreationExtra {
  description: string;
  subject: string;
  grade: number | null;
  privacy: GroupPrivacy;
}

export function NewConversationModal({
  onClose, onCreatePrivate, onCreateGroup, students,
}: {
  onClose: () => void;
  onCreatePrivate: (userId: number) => Promise<void>;
  onCreateGroup: (name: string, participantIds: number[], extra: GroupCreationExtra) => Promise<void>;
  /** A teacher's connected students, shown up front so she doesn't have to search for them. */
  students?: FriendUser[];
}) {
  const [mode, setMode] = useState<"private" | "group">("private");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Map<number, FriendUser>>(new Map());
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupSubject, setGroupSubject] = useState("");
  const [groupGrade, setGroupGrade] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState<GroupPrivacy>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      friendsApi.searchUsers(query.trim()).then(setResults);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function toggleUser(user: FriendUser) {
    if (mode === "private") {
      setSelectedIds(new Set([user.id]));
      setSelectedUsers(new Map([[user.id, user]]));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.add(user.id);
      return next;
    });
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (mode === "private") {
      const userId = [...selectedIds][0];
      if (!userId) {
        setError("Ընտրիր օգտատեր։");
        return;
      }
      setBusy(true);
      try {
        await onCreatePrivate(userId);
      } catch {
        setError("Զրույցը ստեղծելիս սխալ տեղի ունեցավ։");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!groupName.trim()) {
      setError("Խնդրում ենք գրել խմբի անունը։");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Ընտրիր առնվազն մեկ մասնակից։");
      return;
    }
    setBusy(true);
    try {
      await onCreateGroup(groupName.trim(), [...selectedIds], {
        description: groupDescription.trim(),
        subject: groupSubject.trim(),
        grade: groupGrade ? Number(groupGrade) : null,
        privacy: groupPrivacy,
      });
    } catch {
      setError("Խումբը ստեղծելիս սխալ տեղի ունեցավ։");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text">Նոր զրույց</h2>
          <button type="button" onClick={onClose} aria-label="Փակել" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:bg-surface-muted hover:text-text">
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="flex gap-2 border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setMode("private");
              setSelectedIds(new Set());
              setSelectedUsers(new Map());
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "private" ? "bg-primary text-primary-contrast" : "text-text-muted hover:bg-surface-muted"
            }`}
          >
            Անձնական
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("group");
              setSelectedIds(new Set());
              setSelectedUsers(new Map());
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "group" ? "bg-primary text-primary-contrast" : "text-text-muted hover:bg-surface-muted"
            }`}
          >
            Խումբ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {mode === "group" && (
            <>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Խմբի անունը"
                className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary"
              />
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Նկարագրություն (ոչ պարտադիր)"
                rows={2}
                className="mb-2 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary"
              />
              <div className="mb-2 flex gap-2">
                <input
                  value={groupSubject}
                  onChange={(e) => setGroupSubject(e.target.value)}
                  placeholder="Առարկա (օր. Մաթեմատիկա)"
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary"
                />
                <input
                  value={groupGrade}
                  onChange={(e) => setGroupGrade(e.target.value.replace(/\D/g, ""))}
                  placeholder="Դասարան"
                  inputMode="numeric"
                  className="w-24 shrink-0 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary"
                />
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setGroupPrivacy("private")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupPrivacy === "private" ? "border-primary text-primary" : "border-border text-text-muted"
                  }`}
                >
                  <Lock size={14} strokeWidth={1.75} /> Փակ
                </button>
                <button
                  type="button"
                  onClick={() => setGroupPrivacy("public")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                    groupPrivacy === "public" ? "border-primary text-primary" : "border-border text-text-muted"
                  }`}
                >
                  <Globe size={14} strokeWidth={1.75} /> Բաց
                </button>
              </div>
            </>
          )}

          {mode === "group" && selectedUsers.size > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {[...selectedUsers.values()].map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                >
                  {u.first_name || u.username}
                  <button type="button" onClick={() => toggleUser(u)} aria-label={`Հեռացնել ${u.first_name || u.username}-ին`} className="hover:opacity-70">
                    <X size={12} strokeWidth={2.5} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Փնտրել օգտատեր..."
            className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary"
          />

          <div className="flex flex-col gap-1">
            {!query.trim() && students && students.length > 0 && (
              <>
                <p className="px-2 pb-1 text-xs font-medium text-text-muted">Ձեր աշակերտները</p>
                {students.map((u) => (
                  <UserPickerRow key={u.id} user={u} selected={selectedIds.has(u.id)} onToggle={() => toggleUser(u)} />
                ))}
              </>
            )}
            {query.trim() &&
              results.map((u) => (
                <UserPickerRow key={u.id} user={u} selected={selectedIds.has(u.id)} onToggle={() => toggleUser(u)} />
              ))}
            {query.trim() && results.length === 0 && (
              <p className="px-2 py-3 text-sm text-text-muted">Օգտատերեր չեն գտնվել։</p>
            )}
          </div>
        </div>

        {error && <p className="px-4 pb-2 text-sm text-incorrect">{error}</p>}

        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? "..." : mode === "private" ? "Սկսել զրույցը" : "Ստեղծել խումբը"}
          </button>
        </div>
      </div>
    </div>
  );
}
