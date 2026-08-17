import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, MessagesSquare, SquarePen } from "lucide-react";
import * as assistantApi from "../../../api/assistant";
import type { Conversation, EducationalContext } from "../../../api/assistant";
import { useAuth } from "../../../auth/AuthContext";
import { useConversationChat } from "../../../hooks/useConversationChat";
import { useStudyActivityTracker } from "../../../hooks/useStudyActivityTracker";
import { hapticStep } from "../../../lib/haptics";
import { MessageInput } from "../../assistant/MessageInput";
import { WelcomeMessage } from "../../assistant/WelcomeMessage";
import { ConversationSheet } from "./ConversationSheet";
import { MobileMessageBubble } from "./MobileMessageBubble";

/*
  The AI assistant as a chat app rather than a web page with a sidebar.

  Structure is the standard messaging one, and it's structural rather than
  cosmetic: a fixed header, a single scrolling transcript, and a composer
  welded to the bottom above the keyboard. The conversation list moved from a
  permanent 280px sidebar into a bottom sheet (ConversationSheet), and message
  actions moved from hover to long-press (MobileMessageBubble) — both were
  simply unreachable on a touch screen.

  This screen manages its own conversation state rather than sharing with
  AssistantPage: the web page's state is entangled with sidebar/desktop
  concerns (which pane is open, archived filtering in a docked rail) that don't
  exist here.
*/

export function MobileAssistant() {
  useStudyActivityTracker();

  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const autoCreatedRef = useRef(false);

  const { messages, sending, activityLabel, sendMessage, regenerate, editMessage, deleteMessage, stopGeneration } =
    useConversationChat(selectedId);

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

  // Same eager-create as the web page: a first-time user should land in a
  // writable conversation, not an empty "pick something" state.
  useEffect(() => {
    if (autoCreatedRef.current || search || showArchived) return;
    if (conversations !== null && conversations.length === 0 && !selectedId) {
      autoCreatedRef.current = true;
      handleCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, selectedId, search, showArchived]);

  // Follow new content only when already at the bottom, so scrolling up to
  // reread something doesn't get yanked back down by a streaming reply.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isNearBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    else setShowJumpToLatest(true);
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

  const selectedConversation = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function handleCreate() {
    hapticStep();
    const conversation = await assistantApi.createConversation();
    setConversations((prev) => (prev ? [conversation, ...prev] : [conversation]));
    setSelectedId(conversation.id);
  }

  async function handleSend(content: string, attachmentIds: number[], educationalContext?: EducationalContext) {
    await sendMessage(content, attachmentIds, educationalContext);
    // The backend titles a conversation from its first message, so the header
    // and the sheet need to pick that up.
    refreshConversations();
  }

  async function handleTogglePin(conversation: Conversation) {
    await (conversation.is_pinned
      ? assistantApi.unpinConversation(conversation.id)
      : assistantApi.pinConversation(conversation.id));
    refreshConversations();
  }

  async function handleToggleArchive(conversation: Conversation) {
    await (conversation.is_archived
      ? assistantApi.unarchiveConversation(conversation.id)
      : assistantApi.archiveConversation(conversation.id));
    refreshConversations();
  }

  async function handleDelete(conversation: Conversation) {
    await assistantApi.deleteConversation(conversation.id);
    if (conversation.id === selectedId) setSelectedId(null);
    refreshConversations();
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-bg"
      style={{ paddingLeft: "var(--safe-left)", paddingRight: "var(--safe-right)" }}
    >
      <header
        className="flex flex-none items-center gap-2 border-b border-border bg-surface/90 px-2 backdrop-blur-md"
        style={{ paddingTop: "var(--safe-top)", height: "calc(var(--safe-top) + 3.25rem)" }}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Զրույցներ"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-text active:bg-surface-muted"
        >
          <MessagesSquare size={22} strokeWidth={1.75} />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-text">
          {selectedConversation?.title || "AI Օգնական"}
        </h1>

        <button
          type="button"
          onClick={handleCreate}
          aria-label="Նոր զրույց"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-text active:bg-surface-muted"
        >
          <SquarePen size={21} strokeWidth={1.75} />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages === null && <p className="text-center text-[15px] text-text-muted">Բեռնվում է...</p>}

          {messages?.length === 0 && selectedId && (
            <WelcomeMessage
              username={user?.username ?? ""}
              conversationId={selectedId}
              disabled={sending}
              onSend={handleSend}
            />
          )}

          {messages?.map((m) => (
            <MobileMessageBubble
              key={m.id}
              message={m}
              pending={m.status === "sending"}
              activityLabel={m.role === "assistant" && m.status === "sending" ? activityLabel : undefined}
              onEdit={m.role === "user" && m.id > 0 ? (content) => editMessage(m.id, content) : undefined}
              onDelete={m.id > 0 ? () => deleteMessage(m.id) : undefined}
              onRegenerate={m.role === "assistant" && m.id > 0 ? () => regenerate(m.id) : undefined}
            />
          ))}
        </div>

        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => {
              isNearBottomRef.current = true;
              setShowJumpToLatest(false);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }}
            aria-label="Ցույց տալ վերջինը"
            className="absolute bottom-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg active:scale-90"
          >
            <ArrowDown size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {selectedId && (
        <div
          className="assistant-composer flex-none border-t border-border bg-surface px-3 pt-2"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 0.5rem)" }}
        >
          <MessageInput
            conversationId={selectedId}
            disabled={sending}
            streaming={sending}
            onStop={stopGeneration}
            onSend={handleSend}
          />
        </div>
      )}

      {sheetOpen && (
        <ConversationSheet
          conversations={conversations ?? []}
          selectedId={selectedId}
          search={search}
          showArchived={showArchived}
          onSearchChange={setSearch}
          onToggleShowArchived={() => setShowArchived((v) => !v)}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDelete}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
