import { apiClient } from "./client";
import type { FriendUser } from "./friends";

export type ConversationType = "private" | "group";
export type ParticipantRole = "owner" | "admin" | "member";
export type MessageType = "text" | "image" | "file";
export type AttachmentType = "image" | "pdf" | "document" | "text" | "other";

export interface ConversationParticipant {
  id: number;
  user: FriendUser;
  role: ParticipantRole;
  joined_at: string;
  active: boolean;
}

export interface Attachment {
  id: number;
  file_type: AttachmentType;
  original_filename: string;
  mime_type: string;
  file_size: number;
  download_url: string;
  uploaded_at: string;
}

export interface Message {
  id: number;
  conversation: number;
  sender: FriendUser | null;
  message_type: MessageType;
  text: string;
  attachments: Attachment[];
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

export interface LastMessagePreview {
  id: number;
  message_type: MessageType;
  text: string;
  sender: FriendUser;
  created_at: string;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  image: string | null;
  other_participant: FriendUser | null;
  participants: ConversationParticipant[];
  last_message: LastMessagePreview | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessagePage {
  results: Message[];
  has_more: boolean;
}

export async function listConversations(search?: string): Promise<Conversation[]> {
  const { data } = await apiClient.get("/chat/conversations/", { params: search ? { q: search } : undefined });
  return data;
}

export async function getConversation(id: number): Promise<Conversation> {
  const { data } = await apiClient.get(`/chat/conversations/${id}/`);
  return data;
}

export async function createPrivateConversation(userId: number): Promise<Conversation> {
  const { data } = await apiClient.post("/chat/conversations/", { type: "private", user_id: userId });
  return data;
}

export async function createGroupConversation(name: string, participantIds: number[]): Promise<Conversation> {
  const { data } = await apiClient.post("/chat/conversations/", {
    type: "group", name, participant_ids: participantIds,
  });
  return data;
}

export async function renameGroup(id: number, name: string): Promise<Conversation> {
  const { data } = await apiClient.patch(`/chat/conversations/${id}/`, { name });
  return data;
}

export async function updateGroupImage(id: number, file: File): Promise<Conversation> {
  const form = new FormData();
  form.append("image", file);
  const { data } = await apiClient.patch(`/chat/conversations/${id}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function addParticipants(id: number, userIds: number[]): Promise<Conversation> {
  const { data } = await apiClient.post(`/chat/conversations/${id}/participants/`, { user_ids: userIds });
  return data;
}

export async function removeParticipant(id: number, userId: number): Promise<void> {
  await apiClient.delete(`/chat/conversations/${id}/participants/${userId}/`);
}

export async function listMessages(
  conversationId: number, before?: number, limit = 30,
): Promise<MessagePage> {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/messages/`, {
    params: { before, limit },
  });
  return data;
}

export async function sendMessage(
  conversationId: number, text: string, attachmentIds: number[] = [],
): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages/`, {
    text, attachment_ids: attachmentIds,
  });
  return data;
}

export async function uploadAttachment(conversationId: number, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("conversation", String(conversationId));
  form.append("file", file);
  const { data } = await apiClient.post("/chat/attachments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function markRead(conversationId: number, messageId?: number): Promise<Conversation> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/read/`, {
    message_id: messageId,
  });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get("/chat/conversations/unread-count/");
  return data.unread_count;
}
