import { AI_BOT_USERNAME } from "../api/chat";
import type { Conversation } from "../api/chat";

export function isAiSender(sender: { username: string } | null | undefined): boolean {
  return sender?.username === AI_BOT_USERNAME;
}

export function conversationTitle(conversation: {
  type: Conversation["type"];
  name: Conversation["name"];
  other_participant: Conversation["other_participant"];
}): string {
  if (conversation.type === "group") return conversation.name || "Խումբ";
  const other = conversation.other_participant;
  if (!other) return "Զրույց";
  return [other.first_name, other.last_name].filter(Boolean).join(" ") || other.username;
}

export function conversationAvatar(conversation: Conversation): string | null {
  if (conversation.type === "group") return conversation.image;
  return conversation.other_participant?.avatar ?? null;
}

export function conversationInitial(conversation: Conversation): string {
  const title = conversationTitle(conversation);
  return title.slice(0, 1).toUpperCase();
}

const MESSAGE_TYPE_PREVIEW: Record<string, string> = {
  image: "📷 Նկար",
  file: "📎 Ֆայլ",
};

const CONTEXT_TYPE_PREVIEW: Record<string, string> = {
  mock_exam_result: "📝 Քննության արդյունք",
  achievement: "🏆 Նվաճում",
  profile: "👤 Պրոֆիլ",
};

/** Text/image/file preview label for anything shaped like a message (last-message preview, reply bar, in-bubble quote). */
export function messagePreviewText(message: { text: string; message_type: string; context_type?: string | null }): string {
  if (message.context_type) return CONTEXT_TYPE_PREVIEW[message.context_type] ?? message.text;
  if (message.message_type !== "text") return MESSAGE_TYPE_PREVIEW[message.message_type] ?? message.text;
  return message.text;
}

export function lastMessagePreviewText(conversation: Conversation): string {
  const last = conversation.last_message;
  if (!last) return "Հաղորդագրություններ դեռ չկան";
  return messagePreviewText(last);
}
