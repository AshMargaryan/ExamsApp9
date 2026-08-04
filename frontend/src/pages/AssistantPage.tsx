import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as assistantApi from "../api/assistant";
import type { Conversation } from "../api/assistant";
import { useAuth } from "../auth/AuthContext";
import { ConversationSidebar } from "../components/assistant/ConversationSidebar";
import { MessageBubble } from "../components/assistant/MessageBubble";
import { MessageInput } from "../components/assistant/MessageInput";
import { WelcomeMessage } from "../components/assistant/WelcomeMessage";
import { useConversationChat } from "../hooks/useConversationChat";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";

export function AssistantPage() {
  useStudyActivityTracker();

  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: number; title: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sending, sendMessage, regenerate, editMessage, deleteMessage } =
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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

  async function handleSend(content: string, attachmentIds: number[]) {
    await sendMessage(content, attachmentIds);
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

  return (
    <div className="flex h-screen bg-bg">
      <div className={`${sidebarOpen ? "block" : "hidden"} fixed inset-0 z-20 md:hidden`}>
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

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-border px-2 py-1 text-text md:hidden"
          >
            ☰
          </button>
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">
            {selectedConversation?.title || "AI Օգնական"}
          </h1>
        </header>

        {!selectedId && (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            Ընտրեք զրույց կամ սկսեք նորը։
          </div>
        )}

        {selectedId && (
          <>
            <div ref={scrollRef} className="flex flex-1 flex-col space-y-4 overflow-y-auto px-4 py-4">
              {messages === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {messages?.length === 0 && <WelcomeMessage username={user?.username ?? ""} />}
              {messages?.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  pending={m.id < 0}
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

            <div className="border-t border-border p-3">
              <MessageInput conversationId={selectedId} disabled={sending} onSend={handleSend} />
            </div>
          </>
        )}
      </main>

      {undo && (
        <div className="fixed bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-surface px-4 py-2 text-sm text-text shadow-lg">
          <span>Զրույցը «{undo.title || "Նոր զրույց"}» ջնջվեց</span>
          <button type="button" onClick={handleUndoDelete} className="font-medium text-primary hover:underline">
            Հետարկել
          </button>
        </div>
      )}
    </div>
  );
}
