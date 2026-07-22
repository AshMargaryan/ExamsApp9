import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as assistantApi from "../../api/assistant";
import { useAuth } from "../../auth/AuthContext";
import { useConversationChat } from "../../hooks/useConversationChat";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { WelcomeMessage } from "./WelcomeMessage";

const STORAGE_KEY = "assistant_widget_conversation_id";

export function FloatingAssistantWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [preparing, setPreparing] = useState(false);

  const { messages, sending, sendMessage, regenerate, editMessage, deleteMessage } =
    useConversationChat(conversationId);

  // Avoid a redundant floating chat on top of the full assistant page.
  if (location.pathname.startsWith("/assistant")) return null;

  async function handleOpen() {
    setOpen(true);
    if (conversationId) return;
    setPreparing(true);
    try {
      const conversation = await assistantApi.createConversation();
      localStorage.setItem(STORAGE_KEY, String(conversation.id));
      setConversationId(conversation.id);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed right-4 bottom-24 z-40 flex h-[32rem] w-[min(92vw,22rem)] flex-col rounded-[var(--radius)] border border-border bg-surface shadow-xl sm:right-6">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text">🤖 AI Օգնական</span>
            <div className="flex items-center gap-3 text-text-muted">
              <Link
                to="/assistant"
                title="Բացել ամբողջ էջում"
                className="hover:text-primary"
                onClick={() => setOpen(false)}
              >
                ⤢
              </Link>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="hover:text-primary">
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col space-y-3 overflow-y-auto px-3 py-3">
            {(preparing || messages === null) && <p className="text-sm text-text-muted">Բեռնվում է...</p>}
            {messages?.length === 0 && <WelcomeMessage username={user?.username ?? ""} />}
            {messages?.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                pending={m.id < 0}
                onEdit={m.role === "user" && m.id > 0 ? (content) => editMessage(m.id, content) : undefined}
                onDelete={m.id > 0 ? () => deleteMessage(m.id) : undefined}
                onRegenerate={m.role === "assistant" && m.id > 0 ? () => regenerate(m.id) : undefined}
              />
            ))}
          </div>

          {conversationId && (
            <div className="border-t border-border p-2">
              <MessageInput
                conversationId={conversationId}
                disabled={sending || preparing}
                onSend={(content, attachmentIds) => sendMessage(content, attachmentIds)}
              />
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label="AI Օգնական"
        title="AI Օգնական"
        className={`fixed right-4 bottom-4 z-40 flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg transition-colors sm:right-6 ${
          open ? "bg-primary text-primary-contrast" : "border border-border bg-surface text-text hover:border-primary"
        }`}
      >
        💬
      </button>
    </>
  );
}
