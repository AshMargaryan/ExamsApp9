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

function ConversationRow({
  conversation, active, onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors ${
        active ? "bg-primary text-primary-contrast" : "hover:bg-surface-muted"
      }`}
    >
      <ConversationAvatar conversation={conversation} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{conversationTitle(conversation)}</p>
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
          {conversation.unread_count > 0 && (
            <span
              className={`flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                active ? "bg-primary-contrast text-primary" : "bg-primary text-primary-contrast"
              }`}
            >
              {conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  conversations, selectedId, onSelect,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (conversations.length === 0) {
    return <p className="px-2 py-4 text-sm text-text-muted">Զրույցներ չկան։</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      {conversations.map((c) => (
        <ConversationRow key={c.id} conversation={c} active={c.id === selectedId} onSelect={() => onSelect(c.id)} />
      ))}
    </div>
  );
}
