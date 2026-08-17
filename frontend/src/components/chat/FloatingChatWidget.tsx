import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as chatApi from "../../api/chat";
import type { Conversation } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useChatWidget } from "../../context/ChatWidgetContext";
import { useFloatingPanel } from "../../hooks/useFloatingPanel";
import { conversationTitle } from "../../lib/chatLabels";
import { PanelResizeHandles } from "../panels/PanelResizeHandles";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";

export function FloatingChatWidget() {
  const location = useLocation();
  const { user } = useAuth();
  const { open, selectedConversationId, selectConversation, closeFloatingChat } = useChatWidget();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  const { rect, zIndex, isDragging, isCompact, bringToFront, dragHandleProps, getResizeHandleProps } =
    useFloatingPanel({
      defaultSize: { width: 360, height: 520 },
      minSize: { width: 300, height: 380 },
      defaultAnchor: "bottom-left",
      margin: 16,
    });

  useEffect(() => {
    if (!open) return;
    chatApi.listConversations().then(setConversations);
    const interval = setInterval(() => chatApi.listConversations().then(setConversations), 15000);
    return () => clearInterval(interval);
  }, [open]);

  async function handleTogglePin(id: number, pinned: boolean) {
    setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, pinned } : c)) ?? prev);
    await chatApi.setConversationPrefs(id, { pinned });
  }

  async function handleToggleMute(id: number, muted: boolean) {
    setConversations((prev) => prev?.map((c) => (c.id === id ? { ...c, muted } : c)) ?? prev);
    await chatApi.setConversationPrefs(id, { muted });
  }

  async function handleLeave(id: number) {
    if (!user) return;
    await chatApi.removeParticipant(id, user.id);
    setConversations((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    if (selectedConversationId === id) selectConversation(null);
  }

  // Avoid a redundant floating chat on top of the full chat page — same
  // rule FloatingAssistantWidget applies for /assistant. The panel's
  // open/selected-conversation state persists in context regardless, so
  // it reappears the moment the user navigates away from /chat.
  if (!open || location.pathname.startsWith("/chat")) return null;

  const selectedConversation = conversations?.find((c) => c.id === selectedConversationId) ?? null;

  return (
    <div
      onPointerDownCapture={bringToFront}
      style={isCompact ? { zIndex } : { left: rect.left, top: rect.top, width: rect.width, height: rect.height, zIndex }}
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
        <div className="flex min-w-0 items-center gap-2">
          {selectedConversation && (
            <button
              type="button"
              onClick={() => selectConversation(null)}
              aria-label="Ետ"
              title="Ետ"
              className="text-text-muted hover:text-primary"
            >
              ←
            </button>
          )}
          <span className="truncate text-sm font-medium text-text select-none">
            {selectedConversation ? conversationTitle(selectedConversation) : "💬 Հաղորդագրություններ"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-text-muted">
          <Link to="/chat" title="Բացել ամբողջ էջում" className="hover:text-primary" onClick={closeFloatingChat}>
            ⤢
          </Link>
          <button type="button" onClick={closeFloatingChat} aria-label="Close" className="hover:text-primary">
            ✕
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {conversations === null ? (
          <p className="px-3 py-3 text-sm text-text-muted">Բեռնվում է...</p>
        ) : selectedConversation ? (
          <ConversationView key={selectedConversation.id} conversation={selectedConversation} />
        ) : (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={selectConversation}
              onTogglePin={handleTogglePin}
              onToggleMute={handleToggleMute}
              onLeave={handleLeave}
            />
          </div>
        )}
      </div>

      {!isCompact && <PanelResizeHandles getHandleProps={getResizeHandleProps} />}
    </div>
  );
}
