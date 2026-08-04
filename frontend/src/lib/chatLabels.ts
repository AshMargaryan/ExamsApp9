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
};

export function lastMessagePreviewText(conversation: Conversation): string {
  const last = conversation.last_message;
  if (!last) return "Հաղորդագրություններ դեռ չկան";
  if (last.message_type !== "text") return MESSAGE_TYPE_PREVIEW[last.message_type] ?? last.text;
  return last.text;
}
