import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import type { Conversation } from "../../api/assistant";
import { Button } from "../ui/Button";
import { HamburgerIcon, MoreIcon, PlusCircleIcon } from "./icons";
import { SearchField } from "../ui/SearchField";
import { cn } from "../../lib/cn";
import { fieldInputClass } from "../ui/Field";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The row lives inside a scrollable (overflow-y-auto) list, so a plain
  // absolutely-positioned dropdown gets clipped by that ancestor. Portaling
  // to <body> with position:fixed (computed from the trigger's own rect)
  // escapes that clipping regardless of where the row sits in the list.
  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function saveRename() {
    const title = draft.trim();
    if (title && title !== conversation.title) onRename(title);
    setEditing(false);
  }

  function runAction(action: () => void) {
    action();
    setMenuOpen(false);
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
          className={cn(fieldInputClass, "border-primary bg-surface px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-sm)]")}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-[var(--radius)] border-l-2 px-3 py-2.5 text-[15px] transition-colors ${
        active
          ? "border-primary bg-surface-muted font-medium text-text"
          : "border-transparent text-text hover:bg-surface-muted"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 truncate text-left">
        {conversation.is_pinned && (
          <Pin size={12} strokeWidth={2} aria-hidden className="mr-1 inline-block align-[-1px] text-text-muted" />
        )}
        {conversation.title || "Նոր զրույց"}
      </button>

      <div className="relative ml-1 shrink-0">
        <button
          ref={triggerRef}
          type="button"
          title="Ընտրանքներ"
          onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
          className={`rounded-full p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text ${
            menuOpen ? "bg-bg text-text" : ""
          }`}
        >
          <MoreIcon className="h-4 w-4" />
        </button>

        {menuOpen &&
          createPortal(
            <div
              ref={menuRef}
              style={{ top: menuPos.top, right: menuPos.right }}
              className="fixed z-50 w-44 overflow-hidden rounded-[var(--radius)] border border-border bg-surface py-1 shadow-lg"
            >
              <button
                type="button"
                onClick={() => runAction(() => setEditing(true))}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                <Pencil size={15} strokeWidth={1.75} /> Վերանվանել
              </button>
              <button
                type="button"
                onClick={() => runAction(onTogglePin)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                {conversation.is_pinned ? (
                  <>
                    <PinOff size={15} strokeWidth={1.75} /> Ապամրակցել
                  </>
                ) : (
                  <>
                    <Pin size={15} strokeWidth={1.75} /> Ամրակցել
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => runAction(onToggleArchive)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                {conversation.is_archived ? (
                  <>
                    <ArchiveRestore size={15} strokeWidth={1.75} /> Հանել արխիվից
                  </>
                ) : (
                  <>
                    <Archive size={15} strokeWidth={1.75} /> Արխիվացնել
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => runAction(onDelete)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-incorrect hover:bg-surface-muted"
              >
                <Trash2 size={15} strokeWidth={1.75} /> Ջնջել
              </button>
            </div>,
            document.body,
          )}
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
  onClose,
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
  /** Present only when rendered as a closable mobile drawer. */
  onClose?: () => void;
}) {
  const pinned = conversations.filter((c) => c.is_pinned);
  const rest = conversations.filter((c) => !c.is_pinned);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-3 pt-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Փակել"
            className="rounded-full p-1.5 text-text transition-colors hover:bg-surface-muted"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">AI Օգնական</h2>
        <button
          type="button"
          onClick={onCreate}
          title="Նոր զրույց"
          className="rounded-full p-1.5 text-text transition-colors hover:bg-surface-muted"
        >
          <PlusCircleIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3 py-3">
        <SearchField
          value={search}
          onChange={onSearchChange}
          label="Փնտրել զրույցներում"
          placeholder="Փնտրել"
          className="bg-surface-muted text-[length:var(--text-sm)]"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleShowArchived}
        className="mx-3 mb-2 h-7 justify-start px-2 text-xs text-text-muted"
      >
        {showArchived ? "← Ցույց տալ ակտիվները" : "Ցույց տալ արխիվացվածները →"}
      </Button>

      <p className="px-4 pb-1 text-xs font-medium text-text-muted">Զրույցներ</p>

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
