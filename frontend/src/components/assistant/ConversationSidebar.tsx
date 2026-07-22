import { useState } from "react";
import type { Conversation } from "../../api/assistant";

function ConversationRow({
  conversation,
  active,
  onSelect,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  function saveRename() {
    const title = draft.trim();
    if (title && title !== conversation.title) onRename(title);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={saveRename}
          className="w-full rounded border border-primary bg-surface px-2 py-1 text-sm text-text"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
        active ? "bg-primary text-primary-contrast" : "text-text hover:bg-surface-muted"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {conversation.is_pinned && "📌 "}
        {conversation.title || "Նոր զրույց"}
      </button>

      <div
        className={`ml-1 hidden shrink-0 gap-1 group-hover:flex ${active ? "text-primary-contrast" : "text-text-muted"}`}
      >
        <button type="button" title="Վերանվանել" onClick={() => setEditing(true)} className="hover:opacity-70">
          ✏️
        </button>
        <button type="button" title="Ամրակցել" onClick={onTogglePin} className="hover:opacity-70">
          📌
        </button>
        <button type="button" title="Արխիվացնել" onClick={onToggleArchive} className="hover:opacity-70">
          🗄️
        </button>
        <button type="button" title="Ջնջել" onClick={onDelete} className="hover:opacity-70">
          🗑️
        </button>
      </div>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  selectedId,
  search,
  showArchived,
  onSearchChange,
  onToggleShowArchived,
  onSelect,
  onCreate,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  search: string;
  showArchived: boolean;
  onSearchChange: (value: string) => void;
  onToggleShowArchived: () => void;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onRename: (id: number, title: string) => void;
  onTogglePin: (id: number) => void;
  onToggleArchive: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const pinned = conversations.filter((c) => c.is_pinned);
  const rest = conversations.filter((c) => !c.is_pinned);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
      <div className="p-3">
        <button
          type="button"
          onClick={onCreate}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          + Նոր զրույց
        </button>
      </div>

      <div className="px-3 pb-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Փնտրել վերնագրով..."
          className="w-full rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm text-text"
        />
      </div>

      <button
        type="button"
        onClick={onToggleShowArchived}
        className="mx-3 mb-2 text-left text-xs text-text-muted hover:text-text"
      >
        {showArchived ? "← Ցույց տալ ակտիվները" : "Ցույց տալ արխիվացվածները →"}
      </button>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {pinned.length > 0 && (
          <div className="mb-2">
            {pinned.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                onSelect={() => onSelect(c.id)}
                onRename={(title) => onRename(c.id, title)}
                onTogglePin={() => onTogglePin(c.id)}
                onToggleArchive={() => onToggleArchive(c.id)}
                onDelete={() => onDelete(c.id)}
              />
            ))}
          </div>
        )}
        {rest.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            active={c.id === selectedId}
            onSelect={() => onSelect(c.id)}
            onRename={(title) => onRename(c.id, title)}
            onTogglePin={() => onTogglePin(c.id)}
            onToggleArchive={() => onToggleArchive(c.id)}
            onDelete={() => onDelete(c.id)}
          />
        ))}
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-text-muted">Զրույցներ չկան։</p>
        )}
      </div>
    </aside>
  );
}
