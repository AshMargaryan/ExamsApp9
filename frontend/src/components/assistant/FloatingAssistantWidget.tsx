import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as assistantApi from "../../api/assistant";
import { useAuth } from "../../auth/AuthContext";
import { useAssistantLaunch } from "../../contexts/AssistantLaunchContext";
import { useConversationChat } from "../../hooks/useConversationChat";
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

  const panelRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    baseLeft: number;
    baseTop: number;
    width: number;
    height: number;
  } | null>(null);

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
      baseLeft: rect.left - dragOffset.x,
      baseTop: rect.top - dragOffset.y,
      width: rect.width,
      height: rect.height,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const margin = 8;
    const minX = margin - drag.baseLeft;
    const maxX = window.innerWidth - margin - drag.width - drag.baseLeft;
    const minY = margin - drag.baseTop;
    const maxY = window.innerHeight - margin - drag.height - drag.baseTop;

    const rawX = drag.originX + (e.clientX - drag.startX);
    const rawY = drag.originY + (e.clientY - drag.startY);
    setDragOffset({
      x: Math.min(Math.max(rawX, Math.min(minX, maxX)), Math.max(minX, maxX)),
      y: Math.min(Math.max(rawY, Math.min(minY, maxY)), Math.max(minY, maxY)),
    });
  }

  function handleDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId !== e.pointerId) return;
    dragState.current = null;
    setDragging(false);
  }

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
          ref={panelRef}
          style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
          className="fixed right-4 bottom-24 z-40 flex h-[32rem] w-[min(92vw,22rem)] flex-col rounded-[var(--radius)] border border-border bg-surface shadow-xl sm:right-6"
        >
          <div
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            className={`flex items-center justify-between border-b border-border px-4 py-3 touch-none ${
              dragging ? "cursor-grabbing" : "cursor-grab"
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
