import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Pin, PinOff } from "lucide-react";
import type { Conversation } from "../../api/chat";
import { conversationTitle, lastMessagePreviewText } from "../../lib/chatLabels";
import { ConversationAvatar } from "./ConversationAvatar";

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay
    ? d.toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("hy-AM", { day: "2-digit", month: "2-digit" });
}

function RowMenu({
  conversation, onTogglePin, onToggleMute,
}: {
  conversation: Conversation;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        title="Ընտրանքներ"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-full p-1 text-sm text-text-muted opacity-0 hover:bg-black/10 group-hover:opacity-100"
      >
        ⋮
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-md border border-border bg-surface py-1 text-left shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTogglePin(conversation.id, !conversation.pinned);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            {conversation.pinned ? (
              <>
                <PinOff size={15} strokeWidth={1.75} /> Ապակցել
              </>
            ) : (
              <>
                <Pin size={15} strokeWidth={1.75} /> Կցել
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleMute(conversation.id, !conversation.muted);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            {conversation.muted ? (
              <>
                <Bell size={15} strokeWidth={1.75} /> Միացնել ձայնը
              </>
            ) : (
              <>
                <BellOff size={15} strokeWidth={1.75} /> Անջատել ձայնը
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation, active, onSelect, onTogglePin, onToggleMute,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
}) {
  // Not a <button> — RowMenu below renders a real <button> for the "⋮"
  // trigger, and nesting <button> inside <button> is invalid HTML (the
  // browser silently closes the outer one where the inner starts,
  // corrupting everything else in this list). role="button" + a key
  // handler keeps it keyboard-accessible without that.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
        active ? "bg-primary text-primary-contrast" : "hover:bg-surface-muted"
      }`}
    >
      <ConversationAvatar conversation={conversation} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1 truncate text-sm font-medium">
            {conversation.pinned && <Pin className="shrink-0" size={12} strokeWidth={1.75} />}
            <span className="truncate">{conversationTitle(conversation)}</span>
            {conversation.muted && <BellOff className="shrink-0 opacity-70" size={12} strokeWidth={1.75} />}
          </p>
          {conversation.last_message && (
            <span className={`shrink-0 text-xs ${active ? "text-primary-contrast/80" : "text-text-muted"}`}>
              {timeLabel(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${active ? "text-primary-contrast/80" : "text-text-muted"}`}>
            {lastMessagePreviewText(conversation)}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {conversation.unread_count > 0 && (
              <span
                className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-semibold ${
                  active ? "bg-primary-contrast text-primary" : "bg-primary text-primary-contrast"
                }`}
              >
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
      <RowMenu conversation={conversation} onTogglePin={onTogglePin} onToggleMute={onToggleMute} />
    </div>
  );
}

function Section({
  title, conversations, selectedId, onSelect, onTogglePin, onToggleMute,
}: {
  title: string;
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
}) {
  if (conversations.length === 0) return null;
  return (
    <div className="mb-2">
      <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      <div className="flex flex-col gap-1">
        {conversations.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            active={c.id === selectedId}
            onSelect={() => onSelect(c.id)}
            onTogglePin={onTogglePin}
            onToggleMute={onToggleMute}
          />
        ))}
      </div>
    </div>
  );
}

export function ConversationList({
  conversations, selectedId, onSelect, onTogglePin, onToggleMute,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
}) {
  if (conversations.length === 0) {
    return <p className="px-2 py-4 text-sm text-text-muted">Զրույցներ չկան։</p>;
  }

  const pinned = conversations.filter((c) => c.pinned);
  const groups = conversations.filter((c) => !c.pinned && c.type === "group");
  const recent = conversations.filter((c) => !c.pinned && c.type === "private");

  const sectionProps = { selectedId, onSelect, onTogglePin, onToggleMute };

  return (
    <div className="flex flex-col">
      <Section title="Կցված" conversations={pinned} {...sectionProps} />
      <Section title="Խմբեր" conversations={groups} {...sectionProps} />
      <Section title="Վերջին" conversations={recent} {...sectionProps} />
    </div>
  );
}
