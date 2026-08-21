import { useEffect, useRef, useState } from "react";
import { Ban, Info, Inbox, PictureInPicture2, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as chatApi from "../api/chat";
import type { Conversation } from "../api/chat";
import type { ChallengeInvite } from "../api/challenges";
import * as friendsApi from "../api/friends";
import * as teachingApi from "../api/teaching";
import type { FriendUser } from "../api/friends";
import { ChallengeModal } from "../components/challenges/ChallengeModal";
import { ConversationList } from "../components/chat/ConversationList";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingRegion, SkeletonRows } from "../components/ui/Skeleton";
import { ConversationView } from "../components/chat/ConversationView";
import { GlobalSearchPanel } from "../components/chat/GlobalSearchPanel";
import { GroupInfoPanel } from "../components/chat/GroupInfoPanel";
import { MessageRequestsModal } from "../components/chat/MessageRequestsModal";
import { NewConversationModal, type GroupCreationExtra } from "../components/chat/NewConversationModal";
import { useChatWidget } from "../context/ChatWidgetContext";
import { conversationTitle } from "../lib/chatLabels";
import { LinkButton } from "../components/ui/LinkButton";

export function ChatPage() {
  const { user } = useAuth();
  const { openFloatingChat } = useChatWidget();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState<unknown>(null);
  // Read inside `refresh`'s catch without making it a dependency of anything.
  const conversationsRef = useRef<Conversation[] | null>(null);
  conversationsRef.current = conversations;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [students, setStudents] = useState<FriendUser[]>([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [blocking, setBlocking] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [challenging, setChallenging] = useState(false);

  useEffect(() => {
    if (user?.role !== "teacher") return;
    teachingApi.fetchStudentRoster().then((roster) => setStudents(roster.map((r) => r.student)));
  }, [user?.role]);

  function refreshRequestCount() {
    chatApi.listMessageRequests().then((r) => setRequestCount(r.length));
  }

  useEffect(() => {
    refreshRequestCount();
    const interval = setInterval(refreshRequestCount, 15000);
    return () => clearInterval(interval);
  }, []);

  /*
    `conversations === null` is this page's *loading* state, and the fetch had
    no `.catch`, so any failure left the sidebar reading "Բեռնվում է..." for
    ever with no error and no way to retry — while a 15-second poller kept
    failing silently behind it. Failure is tracked separately from absence
    now, exactly as DailyProblemCard was corrected in session 1.

    The rejection is swallowed rather than rethrown because five call sites
    await this, including a `setInterval`; the last good list stays on screen
    and the error is reported beside it.
  */
  function refresh(): Promise<Conversation[]> {
    return chatApi
      .listConversations(search || undefined)
      .then((data) => {
        setConversations(data);
        setListError(null);
        return data;
      })
      .catch((err) => {
        setListError(err ?? new Error("Չհաջողվեց բեռնել զրույցները։"));
        return conversationsRef.current ?? [];
      });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selectedConversation = conversations?.find((c) => c.id === selectedId) ?? null;

  function handleSelect(id: number) {
    setSelectedId(id);
    // Opening the conversation marks it read on the backend immediately
    // (WS connect / mark-read); zero the badge here too instead of waiting
    // up to 15s for the next poll to catch up.
    setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)) ?? prev);
  }

  async function handleTogglePin(id: number, pinned: boolean) {
    setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, pinned } : c)) ?? prev);
    await chatApi.setConversationPrefs(id, { pinned });
  }

  async function handleToggleMute(id: number, muted: boolean) {
    setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, muted } : c)) ?? prev);
    await chatApi.setConversationPrefs(id, { muted });
  }

  async function handleLeave(id: number) {
    if (!user) return;
    await chatApi.removeParticipant(id, user.id);
    setConversations((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    setSelectedId((prev) => (prev === id ? null : prev));
  }

  async function handleStartChatFromSearch(userId: number) {
    await handleCreatePrivate(userId);
    setSearch("");
  }

  // A message/file search result's conversation may not be in `conversations`
  // right now — that list is itself filtered by the search text (by name,
  // not content), so a hit on message text alone can point at a
  // conversation the name-filter excluded. Clearing the search reverts to
  // the full unfiltered list so selectedConversation resolves once refresh
  // completes.
  function handleSelectFromSearch(id: number) {
    setSelectedId(id);
    setSearch("");
    setSidebarOpen(false);
  }

  async function handleCreatePrivate(userId: number) {
    const conversation = await chatApi.createPrivateConversation(userId);
    await refresh();
    setSelectedId(conversation.id);
    setCreating(false);
    setSidebarOpen(false);
  }

  async function handleBlock() {
    const other = selectedConversation?.other_participant;
    if (!other) return;
    if (!window.confirm(`Արգելափակե՞լ ${other.username}-ին։ Կչեղարկվի ընկերությունը և այլևս չես կարողանա նամակագրվել։`)) {
      return;
    }
    setBlocking(true);
    try {
      await friendsApi.blockUser(other.id);
      setSelectedId(null);
      await refresh();
    } finally {
      setBlocking(false);
    }
  }

  async function handleChallengeSent(invite: ChallengeInvite) {
    if (!selectedId) return;
    setChallenging(false);
    await chatApi.sendMessage(selectedId, "", [], null, { context_type: "challenge", context_id: invite.id });
  }

  async function handleCreateGroup(name: string, participantIds: number[], extra: GroupCreationExtra) {
    const conversation = await chatApi.createGroupConversation(name, participantIds, extra);
    await refresh();
    setSelectedId(conversation.id);
    setCreating(false);
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          + Նոր զրույց
        </button>
        <button
          type="button"
          onClick={() => setRequestsOpen(true)}
          title="Հաղորդագրության հարցումներ"
          className="relative shrink-0 rounded-md border border-border px-3 py-2 text-text-muted hover:bg-surface-muted"
        >
          <Inbox size={16} strokeWidth={1.75} />
          {requestCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-contrast">
              {requestCount}
            </span>
          )}
        </button>
      </div>
      <div className="px-3 pb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Փնտրել զրույցներում..."
          className="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-text"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversations === null && listError !== null ? (
          <ErrorState
            size="sm"
            className="m-2"
            title="Չհաջողվեց բեռնել զրույցները։"
            hint="Ստուգիր կապը և փորձիր կրկին։"
            onRetry={() => {
              setListError(null);
              void refresh();
            }}
          />
        ) : conversations === null ? (
          <LoadingRegion label="Զրույցները բեռնվում են" className="px-2 py-2">
            <SkeletonRows count={5} />
          </LoadingRegion>
        ) : search.trim() ? (
          <GlobalSearchPanel
            query={search}
            matchingConversations={conversations}
            onSelectConversation={handleSelectFromSearch}
            onStartChat={handleStartChatFromSearch}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => {
              handleSelect(id);
              setSidebarOpen(false);
            }}
            onTogglePin={handleTogglePin}
            onToggleMute={handleToggleMute}
            onLeave={handleLeave}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-bg">
      <div className={`${sidebarOpen ? "block" : "hidden"} fixed inset-0 z-20 md:hidden`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div className="absolute inset-y-0 left-0 flex w-80 flex-col border-r border-border bg-surface">
          {sidebarContent}
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {sidebarContent}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-border px-2 py-1 text-text md:hidden"
          >
            ☰
          </button>
          <LinkButton to="/">← Գլխավոր</LinkButton>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">
            {selectedConversation ? conversationTitle(selectedConversation) : "Հաղորդագրություններ"}
          </h1>
          {selectedConversation?.type === "private" && selectedConversation.other_participant && (
            <button
              type="button"
              onClick={() => setChallenging(true)}
              title="Մարտահրավեր"
              className="shrink-0 text-text-muted hover:text-primary"
            >
              <Swords size={16} strokeWidth={1.75} />
            </button>
          )}
          {selectedConversation?.type === "private" && (
            <button
              type="button"
              onClick={handleBlock}
              disabled={blocking}
              title="Արգելափակել օգտատիրոջը"
              className="shrink-0 text-text-muted hover:text-incorrect disabled:opacity-60"
            >
              <Ban size={16} strokeWidth={1.75} />
            </button>
          )}
          {selectedConversation?.type === "group" && (
            <button
              type="button"
              onClick={() => setGroupInfoOpen(true)}
              title="Խմբի մասին"
              className="shrink-0 text-text-muted hover:text-primary"
            >
              <Info size={16} strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // FloatingChatWidget deliberately hides itself while we're on
              // /chat (no point floating a duplicate of the page you're
              // already looking at) — so opening it here has to also
              // navigate away, or the button would silently do nothing.
              openFloatingChat(selectedId);
              navigate("/");
            }}
            title="Բացել լողացող պատուհանում"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-text-muted hover:border-primary hover:text-text"
          >
            <PictureInPicture2 size={15} strokeWidth={1.75} aria-hidden />
            <span className="hidden sm:inline">Լողացող</span>
          </button>
        </header>

        {selectedConversation ? (
          <ConversationView key={selectedConversation.id} conversation={selectedConversation} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            Ընտրիր զրույց կամ սկսիր նորը։
          </div>
        )}
      </main>

      {creating && (
        <NewConversationModal
          onClose={() => setCreating(false)}
          onCreatePrivate={handleCreatePrivate}
          onCreateGroup={handleCreateGroup}
          students={students}
        />
      )}

      {requestsOpen && (
        <MessageRequestsModal
          onClose={() => {
            setRequestsOpen(false);
            refreshRequestCount();
            refresh();
          }}
        />
      )}

      {groupInfoOpen && selectedConversation && (
        <GroupInfoPanel conversation={selectedConversation} onClose={() => setGroupInfoOpen(false)} />
      )}

      {challenging && selectedConversation?.other_participant && (
        <ChallengeModal
          friend={selectedConversation.other_participant}
          onClose={() => setChallenging(false)}
          onSent={handleChallengeSent}
        />
      )}
    </div>
  );
}
