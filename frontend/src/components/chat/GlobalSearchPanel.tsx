import { useEffect, useState } from "react";
import { File, MessageCircle, Users } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { ChatSearchResults, Conversation } from "../../api/chat";
import * as friendsApi from "../../api/friends";
import type { SearchResultUser } from "../../api/friends";
import { conversationTitle } from "../../lib/chatLabels";
import { ConversationAvatar } from "./ConversationAvatar";
import { formatBytes } from "../../lib/formatBytes";

type Tab = "all" | "messages" | "people" | "files";

const TAB_LABELS: Record<Tab, string> = {
  all: "Բոլորը",
  messages: "Հաղորդագրություններ",
  people: "Մարդիկ",
  files: "Ֆայլեր",
};

const DEBOUNCE_MS = 300;

/**
 * Renders in place of the plain conversation list whenever the sidebar
 * search box has a query — "chats" (already server-filtered by name, see
 * ChatPage's listConversations(search)) plus messages/files (chat.search
 * API, scoped to the caller's own conversations) plus people (reuses
 * friends' existing search, not chat-specific).
 */
export function GlobalSearchPanel({
  query, matchingConversations, onSelectConversation, onStartChat,
}: {
  query: string;
  matchingConversations: Conversation[];
  onSelectConversation: (id: number) => void;
  onStartChat: (userId: number) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [results, setResults] = useState<ChatSearchResults | null>(null);
  const [people, setPeople] = useState<SearchResultUser[] | null>(null);

  useEffect(() => {
    setResults(null);
    setPeople(null);
    const trimmed = query.trim();
    if (!trimmed) return;
    const handle = setTimeout(() => {
      chatApi.searchChat(trimmed).then(setResults);
      friendsApi.searchUsers(trimmed).then(setPeople);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const loading = results === null || people === null;
  const messages = results?.messages ?? [];
  const files = results?.files ?? [];
  const peopleResults = people ?? [];

  const showChats = tab === "all" && matchingConversations.length > 0;
  const showMessages = tab === "all" || tab === "messages";
  const showPeople = tab === "all" || tab === "people";
  const showFiles = tab === "all" || tab === "files";

  const nothingFound =
    !loading
    && matchingConversations.length === 0
    && messages.length === 0
    && peopleResults.length === 0
    && files.length === 0;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex flex-wrap gap-1 px-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              tab === t ? "border-primary text-primary" : "border-border text-text-muted"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && <p className="px-2 py-4 text-sm text-text-muted">Փնտրվում է...</p>}
      {nothingFound && <p className="px-2 py-4 text-sm text-text-muted">Ոչինչ չի գտնվել։</p>}

      {showChats && (
        <div className="mb-2">
          <p className="px-2 pb-1 text-xs font-semibold tracking-wide text-text-muted">Զրույցներ</p>
          {matchingConversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectConversation(c.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <ConversationAvatar conversation={c} size="h-8 w-8" />
              <span className="truncate text-sm text-text">{conversationTitle(c)}</span>
            </button>
          ))}
        </div>
      )}

      {showMessages && messages.length > 0 && (
        <div className="mb-2">
          <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold tracking-wide text-text-muted">
            <MessageCircle size={13} strokeWidth={1.75} /> Հաղորդագրություններ
          </p>
          {messages.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectConversation(m.conversation.id)}
              className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="text-xs font-medium text-primary">{conversationTitle(m.conversation)}</span>
              <span className="truncate text-sm text-text">{m.text}</span>
            </button>
          ))}
        </div>
      )}

      {showPeople && peopleResults.length > 0 && (
        <div className="mb-2">
          <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold tracking-wide text-text-muted">
            <Users size={13} strokeWidth={1.75} /> Մարդիկ
          </p>
          {peopleResults.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onStartChat(p.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted">
                {p.avatar ? (
                  <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (p.first_name || p.username).slice(0, 1).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-text">
                {[p.first_name, p.last_name].filter(Boolean).join(" ") || p.username}
                <span className="ml-1 text-xs text-text-muted">@{p.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {showFiles && files.length > 0 && (
        <div className="mb-2">
          <p className="flex items-center gap-1.5 px-2 pb-1 text-xs font-semibold tracking-wide text-text-muted">
            <File size={13} strokeWidth={1.75} /> Ֆայլեր
          </p>
          {files.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectConversation(f.conversation.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="text-lg"><File size={18} strokeWidth={1.75} /></span>
              <span className="min-w-0 flex-1 truncate text-sm text-text">{f.original_filename}</span>
              <span className="shrink-0 text-xs text-text-muted">{formatBytes(f.file_size)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
