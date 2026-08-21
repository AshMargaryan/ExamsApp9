import { useEffect, useState } from "react";
import { Archive, Pin, Plus, Search, Trash2, X } from "lucide-react";
import type { Conversation } from "../../../api/assistant";
import { hapticStep } from "../../../lib/haptics";

/*
  Conversation switcher, native.

  The web version is a permanently-docked 280px sidebar that collapses into a
  slide-in drawer under `md`. On a phone that drawer is the same hamburger
  pattern the rest of the app just stopped using, and its per-row actions are
  hover-revealed. This is a bottom sheet instead: reachable by thumb, dismissed
  by tapping away, with row actions long-pressed rather than hovered.
*/

const LONG_PRESS_MS = 450;

interface Props {
  conversations: Conversation[];
  selectedId: number | null;
  search: string;
  showArchived: boolean;
  onSearchChange: (value: string) => void;
  onToggleShowArchived: () => void;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onTogglePin: (conversation: Conversation) => void;
  onToggleArchive: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onClose: () => void;
}

export function ConversationSheet({
  conversations,
  selectedId,
  search,
  showArchived,
  onSearchChange,
  onToggleShowArchived,
  onSelect,
  onCreate,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onClose,
}: Props) {
  // Which row has its action strip revealed; only ever one at a time.
  const [openActionsFor, setOpenActionsFor] = useState<number | null>(null);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startPress(id: number) {
    pressTimer = setTimeout(() => {
      hapticStep();
      setOpenActionsFor((current) => (current === id ? null : id));
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = null;
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label="Զրույցներ"
        className="fixed inset-x-0 bottom-0 z-[95] flex max-h-[85dvh] flex-col rounded-t-[var(--radius-2xl)] border-t border-border bg-surface"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 0.5rem)" }}
      >
        <div className="flex-none px-4 pt-3">
          <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-border" />
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold text-text">Զրույցներ</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Փակել"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <div className="relative mt-3">
            <Search
              size={17}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Փնտրել զրույց"
              className="w-full rounded-[var(--radius-xl)] border border-border bg-bg py-3 pl-10 pr-3 text-[16px] text-text focus:border-primary"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onCreate();
                onClose();
              }}
              className="bg-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-xl)] text-[15px] font-semibold text-primary-contrast active:scale-[0.97]"
            >
              <Plus size={18} strokeWidth={2} /> Նոր զրույց
            </button>
            <button
              type="button"
              onClick={onToggleShowArchived}
              aria-pressed={showArchived}
              className={`flex h-11 items-center gap-2 rounded-[var(--radius-xl)] border px-4 text-[15px] font-medium active:scale-[0.97] ${
                showArchived ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"
              }`}
            >
              <Archive size={17} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-2">
          {conversations.length === 0 && (
            <p className="px-2 py-8 text-center text-[15px] text-text-muted">
              {search ? "Ոչինչ չգտնվեց։" : showArchived ? "Արխիվը դատարկ է։" : "Դեռ զրույցներ չկան։"}
            </p>
          )}

          {conversations.map((conversation) => {
            const active = conversation.id === selectedId;
            const actionsOpen = openActionsFor === conversation.id;
            return (
              <div key={conversation.id} className="mb-1.5">
                <button
                  type="button"
                  onPointerDown={() => startPress(conversation.id)}
                  onPointerUp={cancelPress}
                  onPointerLeave={cancelPress}
                  onPointerCancel={cancelPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setOpenActionsFor(actionsOpen ? null : conversation.id);
                  }}
                  onClick={() => {
                    onSelect(conversation.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-xl)] px-3.5 py-3.5 text-left active:bg-surface-muted ${
                    active ? "bg-primary/10" : ""
                  }`}
                >
                  {conversation.is_pinned && (
                    <Pin size={15} strokeWidth={2} className="flex-none text-primary" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[16px] ${active ? "font-semibold text-primary" : "font-medium text-text"}`}
                    >
                      {conversation.title || "Նոր զրույց"}
                    </span>
                  </span>
                </button>

                {actionsOpen && (
                  <div className="mt-1 flex gap-2 px-1">
                    <SheetRowAction
                      icon={<Pin size={16} strokeWidth={1.75} />}
                      label={conversation.is_pinned ? "Ապակցել" : "Կցել"}
                      onClick={() => {
                        onTogglePin(conversation);
                        setOpenActionsFor(null);
                      }}
                    />
                    <SheetRowAction
                      icon={<Archive size={16} strokeWidth={1.75} />}
                      label={conversation.is_archived ? "Վերականգնել" : "Արխիվացնել"}
                      onClick={() => {
                        onToggleArchive(conversation);
                        setOpenActionsFor(null);
                      }}
                    />
                    <SheetRowAction
                      icon={<Trash2 size={16} strokeWidth={1.75} />}
                      label="Ջնջել"
                      destructive
                      onClick={() => {
                        onDelete(conversation);
                        setOpenActionsFor(null);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SheetRowAction({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius)] border text-[13px] font-medium active:scale-[0.97] ${
        destructive ? "border-incorrect/40 text-incorrect" : "border-border text-text-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
