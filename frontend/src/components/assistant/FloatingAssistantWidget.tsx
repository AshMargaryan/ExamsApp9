import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as assistantApi from "../../api/assistant";
import { useAuth } from "../../auth/AuthContext";
import { useConversationChat } from "../../hooks/useConversationChat";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { PanelResizeHandles } from "../panels/PanelResizeHandles";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { WelcomeMessage } from "./WelcomeMessage";

const STORAGE_KEY_PREFIX = "assistant_widget_conversation_id_";

export function FloatingAssistantWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const storageKey = `${STORAGE_KEY_PREFIX}${user?.id ?? "anon"}`;
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(() => {
    const stored = localStorage.getItem(storageKey);
    return stored ? Number(stored) : null;
  });
  const [preparing, setPreparing] = useState(false);

  const { messages, messagesFailed, sending, sendMessage, regenerate, editMessage, deleteMessage } =
    useConversationChat(conversationId);

  const { rect, zIndex, isDragging, isCompact, bringToFront, dragHandleProps, getResizeHandleProps } =
    useFloatingPanel({
      defaultSize: { width: 352, height: 512 },
      minSize: { width: 300, height: 360 },
      defaultAnchor: "bottom-right",
      margin: 16,
    });

  // A conversation ID left over from a different account on this browser
  // (or one that no longer exists) 404s forever instead of loading —
  // drop it and start fresh rather than getting stuck on "Loading...".
  useEffect(() => {
    if (messagesFailed && conversationId !== null) {
      localStorage.removeItem(storageKey);
      setConversationId(null);
    }
  }, [messagesFailed, conversationId, storageKey]);

  // Avoid a redundant floating chat on top of the full assistant page.
  if (location.pathname.startsWith("/assistant")) return null;

  async function handleOpen() {
    setOpen(true);
    if (conversationId) return;
    setPreparing(true);
    try {
      const conversation = await assistantApi.createConversation();
      localStorage.setItem(storageKey, String(conversation.id));
      setConversationId(conversation.id);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <>
      {open && (
        <div
          onPointerDownCapture={bringToFront}
          style={
            isCompact
              ? { zIndex }
              : { left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex }
          }
          className={
            isCompact
              ? "fixed inset-4 flex flex-col rounded-[var(--radius)] border border-border bg-surface shadow-xl"
              : "fixed flex flex-col rounded-[var(--radius)] border border-border bg-surface shadow-xl"
          }
        >
          <div
            {...dragHandleProps}
            className={`flex items-center justify-between border-b border-border px-4 py-3 touch-none ${
              isCompact ? "" : isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <span className="text-sm font-medium text-text select-none">🤖 AI Օգնական</span>
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
                onSend={(content, attachmentIds, educationalContext) =>
                  sendMessage(content, attachmentIds, educationalContext)
                }
              />
            </div>
          )}

          {!isCompact && <PanelResizeHandles getHandleProps={getResizeHandleProps} />}
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
