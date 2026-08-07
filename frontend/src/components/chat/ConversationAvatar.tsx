import type { Conversation } from "../../api/chat";
import { conversationAvatar, conversationInitial } from "../../lib/chatLabels";

export function ConversationAvatar({ conversation, size = "h-12 w-12" }: { conversation: Conversation; size?: string }) {
  const avatar = conversationAvatar(conversation);
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-lg font-semibold text-text-muted`}
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        conversationInitial(conversation)
      )}
    </span>
  );
}
