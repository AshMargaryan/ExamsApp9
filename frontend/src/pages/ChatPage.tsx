import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as chatApi from "../api/chat";
import type { Conversation } from "../api/chat";
import { ConversationList } from "../components/chat/ConversationList";
import { ConversationView } from "../components/chat/ConversationView";
import { NewConversationModal } from "../components/chat/NewConversationModal";
import { conversationTitle } from "../lib/chatLabels";

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  function refresh(): Promise<Conversation[]> {
    return chatApi.listConversations(search || undefined).then((data) => {
      setConversations(data);
      return data;
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

  async function handleCreatePrivate(userId: number) {
    const conversation = await chatApi.createPrivateConversation(userId);
    await refresh();
    setSelectedId(conversation.id);
    setCreating(false);
    setSidebarOpen(false);
  }

  async function handleCreateGroup(name: string, participantIds: number[]) {
    const conversation = await chatApi.createGroupConversation(name, participantIds);
    await refresh();
    setSelectedId(conversation.id);
    setCreating(false);
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="p-3">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          + Նոր զրույց
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
        {conversations === null ? (
          <p className="px-2 py-4 text-sm text-text-muted">Բեռնվում է...</p>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSidebarOpen(false);
            }}
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
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">
            {selectedConversation ? conversationTitle(selectedConversation) : "Հաղորդագրություններ"}
          </h1>
        </header>

        {selectedConversation ? (
          <ConversationView key={selectedConversation.id} conversation={selectedConversation} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-text-muted">
            Ընտրեք զրույց կամ սկսեք նորը։
          </div>
        )}
      </main>

      {creating && (
        <NewConversationModal
          onClose={() => setCreating(false)}
          onCreatePrivate={handleCreatePrivate}
          onCreateGroup={handleCreateGroup}
        />
      )}
    </div>
  );
}
