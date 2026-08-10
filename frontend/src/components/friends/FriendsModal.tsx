import { useEffect, useState } from "react";
import * as challengesApi from "../../api/challenges";
import type { ChallengeInvite } from "../../api/challenges";
import * as friendsApi from "../../api/friends";
import type { FriendRequest, FriendUser, SearchResultUser } from "../../api/friends";
import { ChallengeInviteCard } from "../challenges/ChallengeInviteCard";
import { ChallengeModal } from "../challenges/ChallengeModal";
import { PublicProfileModal } from "../profile/PublicProfileModal";

type Tab = "friends" | "requests" | "challenges" | "search";

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

export function FriendsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendUser[] | null>(null);
  const [incoming, setIncoming] = useState<FriendRequest[] | null>(null);
  const [outgoing, setOutgoing] = useState<FriendRequest[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [challengingFriend, setChallengingFriend] = useState<FriendUser | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<ChallengeInvite[] | null>(null);
  const [outgoingChallenges, setOutgoingChallenges] = useState<ChallengeInvite[] | null>(null);

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
          <h2 className="text-lg font-semibold text-text">Ընկերներ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="text-lg text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button type="button" className={tabClass("friends")} onClick={() => setTab("friends")}>
            Ընկերներ {friends ? `(${friends.length})` : ""}
          </button>
          <button type="button" className={tabClass("requests")} onClick={() => setTab("requests")}>
            Հարցումներ {incoming && incoming.length > 0 ? `(${incoming.length})` : ""}
          </button>
          <button type="button" className={tabClass("challenges")} onClick={() => setTab("challenges")}>
            ⚔️ Մարտահրավերներ {incomingChallenges && incomingChallenges.length > 0 ? `(${incomingChallenges.length})` : ""}
          </button>
          <button type="button" className={tabClass("search")} onClick={() => setTab("search")}>
            Փնտրել
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "friends" && (
            <>
              {friends === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {friends?.length === 0 && <p className="text-text-muted">Ընկերներ դեռ չկան։</p>}
              {friends?.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={f} onClick={() => setViewingUserId(f.id)} />
                    <div>
                      <p className="text-text">{displayName(f)}</p>
                      <p className="text-xs text-text-muted">@{f.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChallengingFriend(f)}
                      className="text-sm text-primary hover:underline"
                    >
                      ⚔️ Մարտահրավեր
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(f.id)}
                      className="text-sm text-incorrect hover:underline"
                    >
                      Հեռացնել
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === "challenges" && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-text-muted">Ստացված</h3>
              {incomingChallenges === null && <p className="mb-4 text-text-muted">Բեռնվում է...</p>}
              {incomingChallenges?.length === 0 && (
                <p className="mb-4 text-sm text-text-muted">Մարտահրավերներ չկան։</p>
              )}
              {incomingChallenges?.map((c) => (
                <ChallengeInviteCard key={c.id} invite={c} onRespond={loadChallenges} />
              ))}

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-muted">Ուղարկված</h3>
              {outgoingChallenges?.length === 0 && <p className="text-sm text-text-muted">Մարտահրավերներ չկան։</p>}
              {outgoingChallenges?.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                  <div>
                    <p className="text-text">
                      ⚔️ Մարտահրավեր <span className="font-medium">{c.receiver.username}</span>-ին
                    </p>
                    <p className="text-xs text-text-muted">
                      {c.subject_name}
                      {c.topic_name ? ` · ${c.topic_name}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelChallenge(c.id)}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Չեղարկել
                  </button>
                </div>
              ))}
            </>
          )}

          {tab === "requests" && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-text-muted">Ստացված</h3>
              {incoming === null && <p className="mb-4 text-text-muted">Բեռնվում է...</p>}
              {incoming?.length === 0 && <p className="mb-4 text-sm text-text-muted">Հարցումներ չկան։</p>}
              {incoming?.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar user={r.sender} onClick={() => setViewingUserId(r.sender.id)} />
                    <div>
                      <p className="text-text">{displayName(r.sender)}</p>
                      <p className="text-xs text-text-muted">@{r.sender.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
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
                  </div>
                </div>
              ))}

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-muted">Ուղարկված</h3>
              {outgoing?.length === 0 && <p className="text-sm text-text-muted">Հարցումներ չկան։</p>}
              {outgoing?.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={r.receiver} onClick={() => setViewingUserId(r.receiver.id)} />
                    <div>
                      <p className="text-text">{displayName(r.receiver)}</p>
                      <p className="text-xs text-text-muted">@{r.receiver.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancel(r.id)}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Չեղարկել
                  </button>
                </div>
              ))}
            </>
          )}

          {tab === "search" && (
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
                  {u.relationship_status === "none" && (
                    <button
                      type="button"
                      onClick={() => handleSend(u.id)}
                      className="text-sm text-primary hover:underline"
                    >
                      Հրավիրել
                    </button>
                  )}
                  {u.relationship_status === "friends" && (
                    <span className="text-sm text-text-muted">Ընկեր է</span>
                  )}
                  {u.relationship_status === "request_sent" && (
                    <span className="text-sm text-text-muted">Ուղարկված է</span>
                  )}
                  {u.relationship_status === "request_received" && (
                    <span className="text-sm text-text-muted">Սպասում է ձեր պատասխանին</span>
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
