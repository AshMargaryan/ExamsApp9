import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as assistantApi from "../../api/assistant";
import { useAuth } from "../../auth/AuthContext";
import { useAssistantLaunch } from "../../contexts/AssistantLaunchContext";
import { useConversationChat } from "../../hooks/useConversationChat";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { PanelResizeHandles } from "../panels/PanelResizeHandles";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { WelcomeMessage } from "./WelcomeMessage";

export function FloatingAssistantWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);

  const {
    messages, messagesFailed, sending, activityLabel,
    sendMessage, regenerate, editMessage, deleteMessage, stopGeneration,
  } = useConversationChat(conversationId);
  const {
    request: launchRequest,
    clearRequest: clearLaunchRequest,
    assistantSuppressed,
  } = useAssistantLaunch();
  // StrictMode double-invokes effects in dev; without this, the effect below
  // that fires sendMessage(launchRequest...) can run twice for the same
  // request before clearLaunchRequest()'s state update propagates, sending
  // the same message twice. Tracks the specific request object already
  // dispatched, not just a boolean, so a genuinely new launch request still
  // fires normally.
  const dispatchedLaunchRequestRef = useRef<typeof launchRequest>(null);

  const { rect, zIndex, isDragging, isCompact, bringToFront, dragHandleProps, getResizeHandleProps } =
    useFloatingPanel({
      defaultSize: { width: 352, height: 512 },
      minSize: { width: 300, height: 360 },
      defaultAnchor: "bottom-right",
      margin: 16,
    });

  // A conversation that failed to load (e.g. deleted mid-session) 404s
  // forever instead of loading — drop it and start fresh rather than
  // getting stuck on "Loading...".
  useEffect(() => {
    if (messagesFailed && conversationId !== null) {
      setConversationId(null);
    }
  }, [messagesFailed, conversationId]);

  async function handleOpen() {
    setOpen(true);
    if (conversationId) return;
    setPreparing(true);
    try {
      const conversation = await assistantApi.createConversation();
      setConversationId(conversation.id);
    } finally {
      setPreparing(false);
    }
  }

  // Another page asked to open the assistant pre-seeded with a question
  // (e.g. "Explain this" on the daily problem) — open the panel and make
  // sure a conversation exists; the actual send happens once that
  // conversation's message list has loaded (see next effect), so
  // useConversationChat's sendMessage always runs against a fresh
  // conversationId instead of a stale closure.
  useEffect(() => {
    if (!launchRequest) return;
    setOpen(true);
    if (!conversationId && !preparing) {
      handleOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchRequest, conversationId, preparing]);

  useEffect(() => {
    if (!launchRequest || !conversationId || messages === null) return;
    if (dispatchedLaunchRequestRef.current === launchRequest) return;
    dispatchedLaunchRequestRef.current = launchRequest;
    sendMessage(launchRequest.message, [], launchRequest.educationalContext);
    clearLaunchRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchRequest, conversationId, messages]);

  // Avoid a redundant floating chat on top of the full assistant page.
  if (location.pathname.startsWith("/assistant")) return null;

  // The student opted out of AI help for the mock exam they're currently taking.
  if (assistantSuppressed) return null;

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
                pending={m.status === "sending"}
                activityLabel={m.role === "assistant" && m.status === "sending" ? activityLabel : undefined}
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
                streaming={sending}
                onStop={stopGeneration}
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
