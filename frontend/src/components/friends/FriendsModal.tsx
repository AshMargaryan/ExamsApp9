import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock, Mail, Search, Swords, Trash2, UserCheck, UserPlus, Users, X } from "lucide-react";
import * as challengesApi from "../../api/challenges";
import type { ChallengeInvite } from "../../api/challenges";
import * as friendsApi from "../../api/friends";
import type { FriendRequest, FriendUser, SearchResultUser } from "../../api/friends";
import { ChallengeInviteCard } from "../challenges/ChallengeInviteCard";
import { ChallengeModal } from "../challenges/ChallengeModal";
import { SearchField } from "../ui/SearchField";

type Tab = "friends" | "requests" | "challenges" | "search";

const TABS: { key: Tab; icon: ReactNode; label: string }[] = [
  { key: "friends", icon: <Users size={16} strokeWidth={1.75} />, label: "Ընկերներ" },
  { key: "requests", icon: <Mail size={16} strokeWidth={1.75} />, label: "Հարցումներ" },
  { key: "challenges", icon: <Swords size={16} strokeWidth={1.75} />, label: "Մարտահրավերներ" },
  { key: "search", icon: <Search size={16} strokeWidth={1.75} />, label: "Փնտրել" },
];

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function Avatar({
  user,
  onClick,
  size = "h-11 w-11",
}: {
  user: { id: number; username: string; first_name: string; avatar: string | null };
  onClick: () => void;
  size?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Տեսնել պրոֆիլը"
      className={`group flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted p-0.5 text-sm font-semibold text-text-muted transition-transform hover:scale-105`}
      style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface">
        {user.avatar ? (
          <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
        ) : (
          (user.first_name || user.username).slice(0, 1).toUpperCase()
        )}
      </span>
    </button>
  );
}

/** Compact icon-only action for a dense row (challenge/remove) — a labelled
 * pill for every row action reads as noisy once there are two per row. */
function IconAction({
  icon,
  label,
  onClick,
  tone = "muted",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "muted" | "danger" | "accent";
}) {
  const toneClass = {
    muted: "text-text-muted hover:bg-surface-muted hover:text-text",
    danger: "text-text-muted hover:bg-incorrect-bg hover:text-incorrect",
    accent: "text-text-muted hover:bg-primary/10 hover:text-primary",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${toneClass}`}
    >
      {icon}
    </button>
  );
}

function PillButton({
  children,
  icon,
  onClick,
  tone = "primary",
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  tone?: "primary" | "outline" | "danger" | "muted";
}) {
  const toneClass = {
    primary: "text-white shadow-sm hover:shadow-md hover:scale-105",
    outline: "border border-primary text-primary hover:bg-primary/10",
    danger: "border border-transparent text-incorrect hover:bg-incorrect-bg",
    muted: "border border-border text-text-muted hover:bg-surface-muted",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${toneClass}`}
      style={tone === "primary" ? { backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyRow({ icon, text, cta }: { icon: ReactNode; text: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
      <span className="flex text-text-muted">{icon}</span>
      <p className="text-sm text-text-muted">{text}</p>
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-1 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105"
          style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted">
      {children}
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; icon: ReactNode; className: string }> = {
  friends: { label: "Ընկեր է", icon: <UserCheck size={12} strokeWidth={2} />, className: "bg-correct-bg text-correct" },
  request_sent: { label: "Ուղարկված է", icon: <Clock size={12} strokeWidth={2} />, className: "bg-surface-muted text-text-muted" },
  request_received: { label: "Սպասում է քո պատասխանին", icon: <Clock size={12} strokeWidth={2} />, className: "bg-medium-bg text-medium" },
};

export function FriendsModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [incoming, setIncoming] = useState<FriendRequest[] | null>(null);
  const [outgoing, setOutgoing] = useState<FriendRequest[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengingFriend, setChallengingFriend] = useState<FriendUser | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<ChallengeInvite[] | null>(null);
  const [outgoingChallenges, setOutgoingChallenges] = useState<ChallengeInvite[] | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function loadFriends() {
    friendsApi.fetchFriends().then(setFriends);
  }

  function loadRequests() {
    friendsApi.fetchIncomingRequests().then(setIncoming);
    friendsApi.fetchOutgoingRequests().then(setOutgoing);
  }

  function loadChallenges() {
    challengesApi.listChallenges("incoming").then(setIncomingChallenges);
    challengesApi.listChallenges("outgoing").then((all) => setOutgoingChallenges(all.filter((c) => c.status === "pending")));
  }

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadChallenges();
  }, []);

  useEffect(() => {
    if (tab !== "search") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await friendsApi.searchUsers(query));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab]);

  async function handleSend(userId: number) {
    setError(null);
    try {
      await friendsApi.sendFriendRequest(userId);
      setResults(await friendsApi.searchUsers(query));
      loadRequests();
    } catch {
      setError("Հարցումն ուղարկելիս սխալ տեղի ունեցավ։");
    }
  }

  async function handleRespond(requestId: number, action: "accept" | "reject") {
    await friendsApi.respondToRequest(requestId, action);
    loadRequests();
    loadFriends();
  }

  async function handleCancel(requestId: number) {
    await friendsApi.cancelFriendRequest(requestId);
    loadRequests();
  }

  async function handleRemove(userId: number) {
    await friendsApi.removeFriend(userId);
    loadFriends();
  }

  async function handleCancelChallenge(id: number) {
    await challengesApi.cancelChallenge(id);
    loadChallenges();
  }

  function close() {
    setMounted(false);
    setTimeout(onClose, 150);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-150 ${mounted ? "opacity-100" : "opacity-0"}`}
      onClick={close}
    >
      <div
        className={`flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl transition-all duration-200 ${mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        >
          <div className="flex items-center gap-2 text-white">
            <Users size={22} strokeWidth={1.75} />
            <h2 className="text-lg font-bold">Ընկերներ</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Փակել"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-3">
          {TABS.map((t) => {
            const count =
              t.key === "friends"
                ? friends?.length
                : t.key === "requests"
                  ? incoming?.length
                  : t.key === "challenges"
                    ? incomingChallenges?.length
                    : undefined;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  active ? "text-white shadow-sm" : "text-text-muted hover:bg-surface-muted"
                }`}
                style={active ? { backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" } : undefined}
              >
                {t.icon}
                <span>{t.label}</span>
                {!!count && <span className={active ? "text-white/80" : "text-text-muted"}>({count})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          {tab === "friends" && (
            <>
              {friends === null && <p className="py-6 text-center text-text-muted">Բեռնվում է...</p>}
              {friends?.length === 0 && (
                <EmptyRow
                  icon={<Users size={28} strokeWidth={1.5} />}
                  text="Ընկերներ դեռ չկան։"
                  cta={{ label: "Փնտրել ընկերներ", onClick: () => setTab("search") }}
                />
              )}
              {friends?.map((f) => (
                <Row key={f.id}>
                  <div className="flex items-center gap-3">
                    <Avatar user={f} onClick={() => navigate(`/profile/${f.id}`)} />
                    <div>
                      <p className="font-medium text-text">{displayName(f)}</p>
                      <p className="text-xs text-text-muted">@{f.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconAction icon={<Swords size={16} strokeWidth={1.75} />} label="Մարտահրավեր" tone="accent" onClick={() => setChallengingFriend(f)} />
                    <IconAction icon={<Trash2 size={16} strokeWidth={1.75} />} label="Հեռացնել" tone="danger" onClick={() => handleRemove(f.id)} />
                  </div>
                </Row>
              ))}
            </>
          )}

          {tab === "challenges" && (
            <>
              <h3 className="mb-1 mt-2 text-xs font-bold tracking-wide text-text-muted">Ստացված</h3>
              {incomingChallenges === null && <p className="py-4 text-center text-text-muted">Բեռնվում է...</p>}
              {incomingChallenges?.length === 0 && <EmptyRow icon={<Swords size={28} strokeWidth={1.5} />} text="Մարտահրավերներ չկան։" />}
              {incomingChallenges?.map((c) => (
                <ChallengeInviteCard key={c.id} invite={c} onRespond={loadChallenges} />
              ))}

              <h3 className="mb-1 mt-4 text-xs font-bold tracking-wide text-text-muted">Ուղարկված</h3>
              {outgoingChallenges?.length === 0 && <EmptyRow icon={<Swords size={28} strokeWidth={1.5} />} text="Մարտահրավերներ չկան։" />}
              {outgoingChallenges?.map((c) => (
                <Row key={c.id}>
                  <div className="flex items-center gap-2">
                    <Swords size={16} strokeWidth={1.75} className="text-text-muted" />
                    <div>
                      <p className="text-text">
                        Մարտահրավեր <span className="font-medium">{c.receiver.username}</span>-ին
                      </p>
                      <p className="text-xs text-text-muted">
                        {c.subject_name}
                        {c.topic_name ? ` · ${c.topic_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <IconAction icon={<X size={16} strokeWidth={1.75} />} label="Չեղարկել" onClick={() => handleCancelChallenge(c.id)} />
                </Row>
              ))}
            </>
          )}

          {tab === "requests" && (
            <>
              <h3 className="mb-1 mt-2 text-xs font-bold tracking-wide text-text-muted">Ստացված</h3>
              {incoming === null && <p className="py-4 text-center text-text-muted">Բեռնվում է...</p>}
              {incoming?.length === 0 && <EmptyRow icon={<Mail size={28} strokeWidth={1.5} />} text="Հարցումներ չկան։" />}
              {incoming?.map((r) => (
                <Row key={r.id}>
                  <div className="flex items-center gap-3">
                    <Avatar user={r.sender} onClick={() => navigate(`/profile/${r.sender.id}`)} />
                    <div>
                      <p className="font-medium text-text">{displayName(r.sender)}</p>
                      <p className="text-xs text-text-muted">@{r.sender.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconAction icon={<Check size={16} strokeWidth={2} />} label="Ընդունել" tone="accent" onClick={() => handleRespond(r.id, "accept")} />
                    <IconAction icon={<X size={16} strokeWidth={1.75} />} label="Մերժել" tone="danger" onClick={() => handleRespond(r.id, "reject")} />
                  </div>
                </Row>
              ))}

              <h3 className="mb-1 mt-4 text-xs font-bold tracking-wide text-text-muted">Ուղարկված</h3>
              {outgoing?.length === 0 && <EmptyRow icon={<Mail size={28} strokeWidth={1.5} />} text="Հարցումներ չկան։" />}
              {outgoing?.map((r) => (
                <Row key={r.id}>
                  <div className="flex items-center gap-3">
                    <Avatar user={r.receiver} onClick={() => navigate(`/profile/${r.receiver.id}`)} />
                    <div>
                      <p className="font-medium text-text">{displayName(r.receiver)}</p>
                      <p className="text-xs text-text-muted">@{r.receiver.username}</p>
                    </div>
                  </div>
                  <IconAction icon={<X size={16} strokeWidth={1.75} />} label="Չեղարկել" onClick={() => handleCancel(r.id)} />
                </Row>
              ))}
            </>
          )}

          {tab === "search" && (
            <>
              <SearchField
                autoFocus
                containerClassName="mb-3"
                label="Փնտրիր օգտանունով"
                placeholder="Փնտրիր օգտանունով…"
                value={query}
                onChange={setQuery}
              />
              {searching && <p className="py-4 text-center text-text-muted">Փնտրվում է...</p>}
              {!searching && query && results?.length === 0 && <EmptyRow icon={<Search size={28} strokeWidth={1.5} />} text="Ոչինչ չի գտնվել։" />}
              {!query && <EmptyRow icon={<Search size={28} strokeWidth={1.5} />} text="Գրեք օգտանուն՝ դասընկերներ գտնելու համար։" />}
              {results?.map((u) => {
                const badge = STATUS_BADGE[u.relationship_status];
                return (
                  <Row key={u.id}>
                    <div className="flex items-center gap-3">
                      <Avatar user={u} onClick={() => navigate(`/profile/${u.id}`)} />
                      <div>
                        <p className="font-medium text-text">{displayName(u)}</p>
                        <p className="text-xs text-text-muted">@{u.username}</p>
                      </div>
                    </div>
                    {u.relationship_status === "none" && (
                      <PillButton tone="primary" icon={<UserPlus size={14} strokeWidth={2} />} onClick={() => handleSend(u.id)}>
                        Հրավիրել
                      </PillButton>
                    )}
                    {badge && (
                      <span className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    )}
                  </Row>
                );
              })}
            </>
          )}
        </div>

        {error && <p className="px-4 pb-3 text-sm text-incorrect">{error}</p>}
      </div>

      {challengingFriend && (
        <div onClick={(e) => e.stopPropagation()}>
          <ChallengeModal
            friend={challengingFriend}
            onClose={() => {
              setChallengingFriend(null);
              loadChallenges();
            }}
          />
        </div>
      )}
    </div>
  );
}
