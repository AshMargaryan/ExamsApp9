import { apiClient } from "./client";
import type { FriendUser } from "./friends";

export type ConversationType = "private" | "group";
export type ParticipantRole = "owner" | "admin" | "member";
export type MessageType = "text" | "image" | "file" | "voice";
export type AttachmentType = "image" | "pdf" | "document" | "text" | "audio" | "other";
export type ContextType = "mock_exam_result" | "achievement" | "profile" | "challenge";

export interface MockExamResultContext {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  subject: string;
  scaled_score: number | null;
  raw_score: number | null;
  question_count: number;
  percent_answered: number | null;
  duration_minutes: number | null;
  completed_at: string | null;
}

export interface AchievementContext {
  user_achievement_id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  unlocked_at: string;
}

export interface ProfileContext {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  level: number;
  total_xp: number;
  bio: string;
}

export interface ChallengeContext {
  invite_id: number;
  sender_id: number;
  sender_username: string;
  sender_name: string;
  receiver_id: number;
  receiver_username: string;
  receiver_name: string;
  subject_name: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  room_code: string | null;
}

export type ContextData = MockExamResultContext | AchievementContext | ProfileContext | ChallengeContext;

export interface ConversationParticipant {
  id: number;
  user: FriendUser;
  role: ParticipantRole;
  joined_at: string;
  active: boolean;
  last_read_message_id: number | null;
}

export interface Attachment {
  id: number;
  file_type: AttachmentType;
  original_filename: string;
  mime_type: string;
  file_size: number;
  download_url: string;
  duration: number | null;
  uploaded_at: string;
}

export interface ReplyPreview {
  id: number;
  text: string;
  sender: FriendUser | null;
  message_type: MessageType;
}

export interface Reaction {
  id: number;
  emoji: string;
  user: FriendUser;
}

export interface Message {
  id: number;
  conversation: number;
  sender: FriendUser | null;
  message_type: MessageType;
  text: string;
  attachments: Attachment[];
  reply_to: ReplyPreview | null;
  reactions: Reaction[];
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at: string | null;
  context_type: ContextType | null;
  context_id: number | null;
  context_data: ContextData | null;
}

export interface LastMessagePreview {
  id: number;
  message_type: MessageType;
  text: string;
  sender: FriendUser;
  created_at: string;
  context_type: ContextType | null;
}

export type GroupPrivacy = "public" | "private";

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  image: string | null;
  description: string;
  subject: string;
  grade: number | null;
  privacy: GroupPrivacy;
  other_participant: FriendUser | null;
  participants: ConversationParticipant[];
  last_message: LastMessagePreview | null;
  unread_count: number;
  pinned: boolean;
  muted: boolean;
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

export async function createGroupConversation(
  name: string, participantIds: number[],
  extra?: { description?: string; subject?: string; grade?: number | null; privacy?: GroupPrivacy },
): Promise<Conversation> {
  const { data } = await apiClient.post("/chat/conversations/", {
    type: "group", name, participant_ids: participantIds,
    description: extra?.description, subject: extra?.subject, grade: extra?.grade, privacy: extra?.privacy,
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

export async function updateGroupSettings(
  id: number, fields: { description?: string; subject?: string; grade?: number | null; privacy?: GroupPrivacy },
): Promise<Conversation> {
  const { data } = await apiClient.patch(`/chat/conversations/${id}/`, fields);
  return data;
}

export async function pinMessage(messageId: number): Promise<Message> {
  const { data } = await apiClient.post(`/chat/messages/${messageId}/pin/`);
  return data;
}

export async function unpinMessage(messageId: number): Promise<Message> {
  const { data } = await apiClient.delete(`/chat/messages/${messageId}/pin/`);
  return data;
}

export async function listPinnedMessages(conversationId: number): Promise<Message[]> {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/pinned/`);
  return data;
}

export async function listConversationFiles(conversationId: number): Promise<Attachment[]> {
  const { data } = await apiClient.get(`/chat/conversations/${conversationId}/files/`);
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
  conversationId: number, text: string, attachmentIds: number[] = [], replyToId: number | null = null,
  context?: { context_type: ContextType; context_id: number },
): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/messages/`, {
    text, attachment_ids: attachmentIds, reply_to_id: replyToId,
    context_type: context?.context_type ?? null, context_id: context?.context_id ?? null,
  });
  return data;
}

export async function editMessage(messageId: number, text: string): Promise<Message> {
  const { data } = await apiClient.patch(`/chat/messages/${messageId}/`, { text });
  return data;
}

export async function deleteMessageForEveryone(messageId: number): Promise<Message> {
  const { data } = await apiClient.delete(`/chat/messages/${messageId}/`);
  return data;
}

export async function hideMessageForMe(messageId: number): Promise<void> {
  await apiClient.post(`/chat/messages/${messageId}/hide/`);
}

export async function forwardMessage(messageId: number, conversationId: number): Promise<Message> {
  const { data } = await apiClient.post(`/chat/messages/${messageId}/forward/`, {
    conversation_id: conversationId,
  });
  return data;
}

export async function setReaction(messageId: number, emoji: string): Promise<Message> {
  const { data } = await apiClient.post(`/chat/messages/${messageId}/reactions/`, { emoji });
  return data;
}

export async function uploadAttachment(
  conversationId: number, file: File, duration?: number,
): Promise<Attachment> {
  const form = new FormData();
  form.append("conversation", String(conversationId));
  form.append("file", file);
  if (duration !== undefined) form.append("duration", String(duration));
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

export async function setConversationPrefs(
  id: number, prefs: { pinned?: boolean; muted?: boolean },
): Promise<Conversation> {
  const { data } = await apiClient.patch(`/chat/conversations/${id}/prefs/`, prefs);
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get("/chat/conversations/unread-count/");
  return data.unread_count;
}

export interface ConversationRef {
  id: number;
  type: ConversationType;
  name: string;
  image: string | null;
  other_participant: FriendUser | null;
}

export interface MessageSearchResult {
  id: number;
  conversation: ConversationRef;
  sender: FriendUser | null;
  text: string;
  created_at: string;
}

export interface FileSearchResult {
  id: number;
  conversation: ConversationRef;
  file_type: AttachmentType;
  original_filename: string;
  file_size: number;
  download_url: string;
  uploaded_at: string;
}

export interface ChatSearchResults {
  messages: MessageSearchResult[];
  files: FileSearchResult[];
}

export async function searchChat(query: string): Promise<ChatSearchResults> {
  const { data } = await apiClient.get("/chat/search/", { params: { q: query } });
  return data;
}

export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

export async function reportMessage(messageId: number, reason: ReportReason, details = ""): Promise<void> {
  await apiClient.post(`/chat/messages/${messageId}/report/`, { reason, details });
}

export async function listMessageRequests(): Promise<Conversation[]> {
  const { data } = await apiClient.get("/chat/requests/");
  return data;
}

export async function respondToMessageRequest(
  conversationId: number, action: "accept" | "decline" | "block",
): Promise<void> {
  await apiClient.post(`/chat/requests/${conversationId}/respond/`, { action });
}

export const AI_BOT_USERNAME = "gitus_ai";

export async function askAI(conversationId: number, messageId: number): Promise<Message> {
  const { data } = await apiClient.post(`/chat/conversations/${conversationId}/ask-ai/`, { message_id: messageId });
  return data;
}
