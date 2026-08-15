import { API_ORIGIN, apiClient } from "./client";

export type MessageRole = "system" | "user" | "assistant" | "tool";
// "stopped": a streaming turn whose client disconnected (Stop button,
// network drop) before the backend could send a terminal SSE event —
// distinct from "failed" (an explicit provider error). Mirrors
// backend MessageStatus (apps/ai_assistant/models.py).
export type MessageStatus = "sending" | "sent" | "failed" | "stopped";
export type AttachmentType = "image" | "pdf" | "document" | "text" | "other";
export type ConversationMode =
  | "general_chat" | "solving_question" | "learning" | "revision" | "homework_solver"
  | "explain_mode" | "teach_it_to_me" | "why_am_i_wrong";

export interface Conversation {
  id: number;
  title: string;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface EducationalContext {
  question_id?: number | null;
  subject?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  difficulty?: string | null;
  lesson_id?: number | null;
  conversation_mode?: ConversationMode | null;
}

export interface Attachment {
  id: number;
  original_filename: string;
  mime_type: string;
  size: number;
  attachment_type: AttachmentType;
  uploaded_at: string;
  url: string | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface Message {
  id: number;
  conversation: number;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error_message: string;
  created_at: string;
  edited_at: string | null;
  model_used: string;
  provider: string;
  response_time_ms: number | null;
  token_usage: TokenUsage | null;
  educational_context: EducationalContext | null;
  is_active_response: boolean;
  attachments: Attachment[];
}

export async function listConversations(params?: {
  q?: string;
  archived?: boolean;
}): Promise<Conversation[]> {
  const { data } = await apiClient.get("/assistant/conversations/", { params });
  return data.results;
}

export async function createConversation(): Promise<Conversation> {
  const { data } = await apiClient.post("/assistant/conversations/");
  return data;
}

export async function renameConversation(id: number, title: string): Promise<Conversation> {
  const { data } = await apiClient.patch(`/assistant/conversations/${id}/`, { title });
  return data;
}

export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/assistant/conversations/${id}/`);
}

async function conversationAction(id: number, action: string): Promise<Conversation> {
  const { data } = await apiClient.post(`/assistant/conversations/${id}/${action}/`);
  return data;
}

export const restoreConversation = (id: number) => conversationAction(id, "restore");
export const archiveConversation = (id: number) => conversationAction(id, "archive");
export const unarchiveConversation = (id: number) => conversationAction(id, "unarchive");
export const pinConversation = (id: number) => conversationAction(id, "pin");
export const unpinConversation = (id: number) => conversationAction(id, "unpin");

export async function listMessages(conversationId: number): Promise<Message[]> {
  const { data } = await apiClient.get(`/assistant/conversations/${conversationId}/messages/`);
  return data;
}

// Sending/regenerating a message now streams (Server-Sent Events) instead
// of returning one JSON response — see useConversationChat.ts, which owns
// the fetch/ReadableStream consumption since it needs to drive incremental
// UI updates rather than resolve once. These are just the URL/body/event
// shapes both call sites (send + regenerate) share.

export type SSEEvent =
  | { type: "user_message"; message: Message }
  | { type: "tool_call"; tool_name: string }
  | { type: "tool_call_reset" }
  | { type: "delta"; content: string }
  | { type: "message"; message: Message }
  | { type: "error"; message: Message };

export function sendMessageStreamUrl(conversationId: number): string {
  return `${API_ORIGIN}/api/assistant/conversations/${conversationId}/messages/`;
}

export function regenerateMessageStreamUrl(messageId: number): string {
  return `${API_ORIGIN}/api/assistant/messages/${messageId}/regenerate/`;
}

export function sendMessageStreamBody(
  content: string,
  attachmentIds: number[] = [],
  educationalContext?: EducationalContext,
): Record<string, unknown> {
  return { content, attachment_ids: attachmentIds, educational_context: educationalContext };
}

export async function editMessage(id: number, content: string): Promise<Message> {
  const { data } = await apiClient.patch(`/assistant/messages/${id}/`, { content });
  return data;
}

export async function deleteMessage(id: number): Promise<void> {
  await apiClient.delete(`/assistant/messages/${id}/`);
}

export async function uploadAttachment(conversationId: number, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append("conversation", String(conversationId));
  form.append("file", file);
  const { data } = await apiClient.post("/assistant/attachments/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAttachment(id: number): Promise<void> {
  await apiClient.delete(`/assistant/attachments/${id}/`);
}

export type ArmenianVoice = "hy-AM-AnahitNeural" | "hy-AM-HaykNeural";

export async function transcribeVoice(file: File): Promise<string> {
  const form = new FormData();
  form.append("audio", file);
  const { data } = await apiClient.post("/assistant/voice/transcribe/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.text as string;
}

export async function synthesizeVoice(text: string, voice: ArmenianVoice): Promise<Blob> {
  const { data } = await apiClient.post(
    "/assistant/voice/synthesize/",
    { text, voice },
    { responseType: "blob" },
  );
  return data as Blob;
}
