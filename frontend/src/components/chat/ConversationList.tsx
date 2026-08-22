import { useState } from "react";
import { Bell, BellOff, LogOut, MoreVertical, Pin, PinOff } from "lucide-react";
import type { Conversation } from "../../api/chat";
import { conversationTitle, lastMessagePreviewText } from "../../lib/chatLabels";
import { cn } from "../../lib/cn";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Dropdown } from "../ui/Dropdown";
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

/*
  The per-conversation options menu.

  Four things were wrong with it, and three of them only bite on a phone —
  which is where most of this list is read.

  - The trigger was `opacity-0 group-hover:opacity-100`. A touch device has
    no hover, so on the platform this surface is used on, pin / mute / leave
    were invisible and unreachable; a keyboard user could tab into a button
    that was not drawn. This is the same defect session 4 fixed on the AI
    assistant's message actions, still present here.
  - It was a "⋮" text glyph, named only by a `title` that touch devices never
    display.
  - The menu was hand-rolled: no keyboard, no Escape, no aria-expanded, and
    positioned `absolute` inside a scrolling list. ui/Dropdown does all of
    that and portals the menu so the list cannot clip it.
  - Leaving a group went through `window.confirm`, a native dialog in a
    product that has ConfirmDialog everywhere else.
*/
function RowMenu({
  conversation, onTogglePin, onToggleMute, onLeave,
}: {
  conversation: Conversation;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
  onLeave: (id: number) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isGroup = conversation.type === "group";

  return (
    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
      <Dropdown
        align="end"
        renderTrigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label="Զրույցի ընտրանքներ"
            className={cn(
              "tap-target flex h-8 w-8 items-center justify-center rounded-full",
              "text-text-muted transition-colors hover:bg-surface-muted hover:text-text",
              // Visible by default where there is no hover, revealed on
              // hover or keyboard focus on pointer devices.
              "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:aria-expanded:opacity-100",
            )}
          >
            <MoreVertical size={16} strokeWidth={1.75} aria-hidden />
          </button>
        )}
        items={[
          {
            key: "pin",
            icon: conversation.pinned ? <PinOff size={15} strokeWidth={1.75} /> : <Pin size={15} strokeWidth={1.75} />,
            label: conversation.pinned ? "Ապակցել" : "Կցել",
            onSelect: () => onTogglePin(conversation.id, !conversation.pinned),
          },
          {
            key: "mute",
            icon: conversation.muted ? <Bell size={15} strokeWidth={1.75} /> : <BellOff size={15} strokeWidth={1.75} />,
            label: conversation.muted ? "Միացնել ձայնը" : "Անջատել ձայնը",
            onSelect: () => onToggleMute(conversation.id, !conversation.muted),
          },
          {
            key: "leave",
            icon: <LogOut size={15} strokeWidth={1.75} />,
            label: isGroup ? "Դուրս գալ խմբից" : "Հեռացնել զրույցը",
            tone: "danger",
            divider: true,
            onSelect: () => setConfirmOpen(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isGroup ? "Դուրս գա՞լ այս խմբից" : "Հեռացնե՞լ այս զրույցը"}
        description={
          isGroup
            ? "Այլևս չես ստանա այս խմբի հաղորդագրությունները։ Կարող ես կրկին միանալ։"
            : "Զրույցը կհեռացվի ցանկից, բայց պատմությունը կպահպանվի։"
        }
        confirmLabel={isGroup ? "Դուրս գալ" : "Հեռացնել"}
        onConfirm={() => {
          setConfirmOpen(false);
          onLeave(conversation.id);
        }}
      />
    </div>
  );
}

function ConversationRow({
  conversation, active, onSelect, onTogglePin, onToggleMute, onLeave,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
  onLeave: (id: number) => void;
}) {
  // Not a <button> — RowMenu below renders a real <button> for its own
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
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors ${
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
      <RowMenu conversation={conversation} onTogglePin={onTogglePin} onToggleMute={onToggleMute} onLeave={onLeave} />
    </div>
  );
}

function Section({
  title, conversations, selectedId, onSelect, onTogglePin, onToggleMute, onLeave,
}: {
  title: string;
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
  onLeave: (id: number) => void;
}) {
  if (conversations.length === 0) return null;
  return (
    <div className="mb-2">
      <p className="px-2 pb-1 pt-2 text-xs font-semibold tracking-wide text-text-muted">{title}</p>
      <div className="flex flex-col gap-1">
        {conversations.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            active={c.id === selectedId}
            onSelect={() => onSelect(c.id)}
            onTogglePin={onTogglePin}
            onToggleMute={onToggleMute}
            onLeave={onLeave}
          />
        ))}
      </div>
    </div>
  );
}

export function ConversationList({
  conversations, selectedId, onSelect, onTogglePin, onToggleMute, onLeave,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onTogglePin: (id: number, pinned: boolean) => void;
  onToggleMute: (id: number, muted: boolean) => void;
  onLeave: (id: number) => void;
}) {
  if (conversations.length === 0) {
    return <p className="px-2 py-4 text-sm text-text-muted">Զրույցներ չկան։</p>;
  }

  const pinned = conversations.filter((c) => c.pinned);
  const groups = conversations.filter((c) => !c.pinned && c.type === "group");
  const recent = conversations.filter((c) => !c.pinned && c.type === "private");

  const sectionProps = { selectedId, onSelect, onTogglePin, onToggleMute, onLeave };

  return (
    <div className="flex flex-col">
      <Section title="Կցված" conversations={pinned} {...sectionProps} />
      <Section title="Խմբեր" conversations={groups} {...sectionProps} />
      <Section title="Վերջին" conversations={recent} {...sectionProps} />
    </div>
  );
}
