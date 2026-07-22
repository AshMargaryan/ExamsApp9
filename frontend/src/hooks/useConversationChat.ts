import { useEffect, useState } from "react";
import * as assistantApi from "../api/assistant";
import type { Message } from "../api/assistant";

const PENDING_ID = -1;

/** Shared message-list + send/edit/delete/regenerate logic for a single
 * conversation, used by both the full assistant page and the floating
 * widget so they behave identically. */
export function useConversationChat(conversationId: number | null) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages(null);
      return;
    }
    setMessages(null);
    assistantApi.listMessages(conversationId).then(setMessages);
  }, [conversationId]);

  async function sendMessage(content: string, attachmentIds: number[] = []) {
    if (!conversationId) return;
    setSending(true);

    const pendingUser: Message = {
      id: PENDING_ID,
      conversation: conversationId,
      role: "user",
      content,
      status: "sending",
      error_message: "",
      created_at: new Date().toISOString(),
      edited_at: null,
      model_used: "",
      provider: "",
      response_time_ms: null,
      token_usage: null,
      educational_context: null,
      is_active_response: true,
      attachments: [],
    };
    const pendingAssistant: Message = { ...pendingUser, id: PENDING_ID - 1, role: "assistant" };
    setMessages((prev) => [...(prev ?? []), pendingUser, pendingAssistant]);

    try {
      const result = await assistantApi.sendMessage(conversationId, content, attachmentIds);
      setMessages((prev) => [
        ...(prev ?? []).filter((m) => m.id !== PENDING_ID && m.id !== PENDING_ID - 1),
        result.user_message,
        result.assistant_message,
      ]);
      return result;
    } finally {
      setSending(false);
    }
  }

  async function regenerate(messageId: number) {
    const newMessage = await assistantApi.regenerateMessage(messageId);
    setMessages((prev) => (prev ?? []).map((m) => (m.id === messageId ? newMessage : m)));
  }

  async function editMessage(messageId: number, content: string) {
    const updated = await assistantApi.editMessage(messageId, content);
    setMessages((prev) => (prev ?? []).map((m) => (m.id === messageId ? updated : m)));

    const index = (messages ?? []).findIndex((m) => m.id === messageId);
    const followingAssistant = (messages ?? [])
      .slice(index + 1)
      .find((m) => m.role === "assistant");
    if (followingAssistant) {
      await regenerate(followingAssistant.id);
    }
  }

  async function deleteMessage(messageId: number) {
    await assistantApi.deleteMessage(messageId);
    setMessages((prev) => (prev ?? []).filter((m) => m.id !== messageId));
  }

  return { messages, sending, sendMessage, regenerate, editMessage, deleteMessage };
}
