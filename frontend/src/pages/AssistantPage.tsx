import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import * as assistantApi from "../api/assistant";
import type { Conversation, EducationalContext } from "../api/assistant";
import { useAuth } from "../auth/AuthContext";
import { ConversationSidebar } from "../components/assistant/ConversationSidebar";
import { HamburgerIcon } from "../components/assistant/icons";
import { MessageBubble } from "../components/assistant/MessageBubble";
import { MessageInput } from "../components/assistant/MessageInput";
import { WelcomeMessage } from "../components/assistant/WelcomeMessage";
import { useConversationChat } from "../hooks/useConversationChat";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";
import { MobileAssistant } from "../components/mobile/assistant/MobileAssistant";
import { useIsNativeApp } from "../lib/platform";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";

export function AssistantPage() {
  // Native is a chat app, not this page shrunk: bottom-sheet conversation
  // switcher, long-press message actions, keyboard-welded composer.
  if (useIsNativeApp()) return <MobileAssistant />;
  return <WebAssistantPage />;
}

function WebAssistantPage() {
  useStudyActivityTracker();

  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const isParent = user?.role === "parent";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: number; title: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const {
    messages, sending, activityLabel, sendMessage, regenerate, editMessage, deleteMessage, stopGeneration,
  } = useConversationChat(selectedId);

  async function refreshConversations() {
    const data = await assistantApi.listConversations({
      q: search || undefined,
      archived: showArchived,
    });
    setConversations(data);
    return data;
  }

  useEffect(() => {
    refreshConversations().then((data) => {
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, showArchived]);

  // First-time visitor with zero conversations ever: skip the dead "pick a
  // conversation or start a new one" state and land directly in a
  // ready-to-write conversation, same as the floating widget's eager-create
  // on open. Guarded to fire once — refreshConversations() also re-runs on
  // every search keystroke, and a legitimate zero-result search shouldn't
  // spawn a conversation.
  const autoCreatedRef = useRef(false);
  useEffect(() => {
    if (autoCreatedRef.current || search || showArchived) return;
    if (conversations !== null && conversations.length === 0 && !selectedId) {
      autoCreatedRef.current = true;
      handleCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedId, search, showArchived]);

  // Follow the newest content only while the user is already near the
  // bottom — an intentional scroll upward (to reread something while a
  // reply streams in) must not get yanked back down. isNearBottomRef is
  // kept live by the scroll listener below, including after this effect's
  // own auto-scroll, so it always reflects position *before* the update
  // that's about to render.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isNearBottomRef.current) {
      // "auto" (instant), not "smooth" — during streaming this effect can
      // fire many times a second, and re-triggering a smooth-scroll
      // animation on every one of them is what causes visible jitter, not
      // what prevents it.
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } else {
      setShowJumpToLatest(true);
    }
  }, [messages]);

  useEffect(() => {
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      const nearBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight < 80;
      isNearBottomRef.current = nearBottom;
      if (nearBottom) setShowJumpToLatest(false);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [selectedId]);

  function jumpToLatest() {
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  const selectedConversation = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function handleCreate() {
    const conversation = await assistantApi.createConversation();
    setConversations((prev) => (prev ? [conversation, ...prev] : [conversation]));
    setSelectedId(conversation.id);
    setSidebarOpen(false);
  }

  async function handleSend(
    content: string, attachmentIds: number[], educationalContext?: EducationalContext,
  ) {
    await sendMessage(content, attachmentIds, educationalContext);
    await refreshConversations();
  }

  async function handleRename(id: number, title: string) {
    const updated = await assistantApi.renameConversation(id, title);
    setConversations((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)));
  }

  async function handleTogglePin(id: number) {
    const conversation = conversations?.find((c) => c.id === id);
    if (!conversation) return;
    const updated = conversation.is_pinned
      ? await assistantApi.unpinConversation(id)
      : await assistantApi.pinConversation(id);
    setConversations((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)));
  }

  async function handleToggleArchive(id: number) {
    const conversation = conversations?.find((c) => c.id === id);
    if (!conversation) return;
    if (conversation.is_archived) {
      await assistantApi.unarchiveConversation(id);
    } else {
      await assistantApi.archiveConversation(id);
    }
    await refreshConversations();
  }

  async function handleDelete(id: number) {
    const conversation = conversations?.find((c) => c.id === id);
    await assistantApi.deleteConversation(id);
    setConversations((prev) => (prev ?? []).filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (conversation) {
      setUndo({ id, title: conversation.title });
      setTimeout(() => setUndo((u) => (u?.id === id ? null : u)), 6000);
    }
  }

  async function handleUndoDelete() {
    if (!undo) return;
    await assistantApi.restoreConversation(undo.id);
    setUndo(null);
    await refreshConversations();
  }

  if (isParent) return <Navigate to="/family" replace />;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-bg">
      <div className={`${sidebarOpen ? "block" : "hidden"} fixed inset-x-0 top-16 bottom-0 z-20 md:hidden`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div className="absolute inset-y-0 left-0">
          <ConversationSidebar
            conversations={conversations ?? []}
            selectedId={selectedId}
            search={search}
            showArchived={showArchived}
            onSearchChange={setSearch}
            onToggleShowArchived={() => setShowArchived((v) => !v)}
            onSelect={(id) => {
              setSelectedId(id);
              setSidebarOpen(false);
            }}
            onCreate={handleCreate}
            onRename={handleRename}
            onTogglePin={handleTogglePin}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDelete}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      <div className="hidden md:flex">
        <ConversationSidebar
          conversations={conversations ?? []}
          selectedId={selectedId}
          search={search}
          showArchived={showArchived}
          onSearchChange={setSearch}
          onToggleShowArchived={() => setShowArchived((v) => !v)}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onRename={handleRename}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
        />
      </div>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            title="Զրույցներ"
            className="rounded-full p-1.5 text-text transition-colors hover:bg-surface-muted md:hidden"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
          <LinkButton to="/">← Գլխավոր</LinkButton>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">
            {selectedConversation?.title || "AI Օգնական"}
          </h1>
        </header>

        {!selectedId && (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            {conversations === null || conversations.length === 0 ? "Բեռնվում է..." : "Ընտրեք զրույց կամ սկսեք նորը։"}
          </div>
        )}

        {selectedId && (
          <>
            <div className="relative flex flex-1 min-h-0">
              <div ref={scrollRef} className="flex flex-1 flex-col space-y-4 overflow-y-auto px-4 py-4">
                {messages === null && <p className="text-text-muted">Բեռնվում է...</p>}
                {messages?.length === 0 && (
                  <WelcomeMessage
                    username={user?.username ?? ""}
                    conversationId={selectedId}
                    disabled={sending}
                    onSend={handleSend}
                  />
                )}
                {messages?.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    pending={m.status === "sending"}
                    activityLabel={m.role === "assistant" && m.status === "sending" ? activityLabel : undefined}
                    onEdit={
                      m.role === "user" && m.id > 0 ? (content) => editMessage(m.id, content) : undefined
                    }
                    onDelete={m.id > 0 ? () => deleteMessage(m.id) : undefined}
                    onRegenerate={
                      m.role === "assistant" && m.id > 0 ? () => regenerate(m.id) : undefined
                    }
                  />
                ))}
              </div>

              {showJumpToLatest && (
                <button
                  type="button"
                  onClick={jumpToLatest}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text shadow-md transition-colors hover:bg-surface-muted"
                >
                  ↓ Ցույց տալ վերջինը
                </button>
              )}
            </div>

            {messages !== null && messages.length > 0 && (
              <div className="border-t border-border p-3">
                <MessageInput
                  conversationId={selectedId}
                  disabled={sending}
                  streaming={sending}
                  onStop={stopGeneration}
                  onSend={handleSend}
                />
              </div>
            )}
          </>
        )}
      </main>

      {undo && (
        <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text shadow-lg">
          <span>Զրույցը «{undo.title || "Նոր զրույց"}» ջնջվեց</span>
          <Button variant="secondary" size="sm" onClick={handleUndoDelete}>
            Հետարկել
          </Button>
        </div>
      )}
    </div>
  );
}
