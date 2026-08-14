import type { Conversation } from "../api/chat";

export function conversationTitle(conversation: Conversation): string {
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
  voice: "🎤 Ձայնային հաղորդագրություն",
};

/** Text/image/file preview label for anything shaped like a message (last-message preview, reply bar, in-bubble quote). */
export function messagePreviewText(message: { text: string; message_type: string }): string {
  if (message.message_type !== "text") return MESSAGE_TYPE_PREVIEW[message.message_type] ?? message.text;
  return message.text;
}

export function lastMessagePreviewText(conversation: Conversation): string {
  const last = conversation.last_message;
  if (!last) return "Հաղորդագրություններ դեռ չկան";
  return messagePreviewText(last);
}
