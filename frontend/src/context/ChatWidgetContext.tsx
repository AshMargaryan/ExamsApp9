import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ChatWidgetContextValue {
  open: boolean;
  selectedConversationId: number | null;
  openFloatingChat: (conversationId?: number | null) => void;
  selectConversation: (conversationId: number | null) => void;
  closeFloatingChat: () => void;
}

const ChatWidgetContext = createContext<ChatWidgetContextValue | null>(null);

/**
 * Open/selected-conversation state for the floating chat panel — mirrors
 * how FloatingAssistantWidget keeps its own state, except the chat widget
 * can be opened from ChatPage ("Open as floating panel"), so that state has
 * to live above both ChatPage and the widget (ProtectedRoute) instead of
 * inside the widget itself.
 */
export function ChatWidgetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  const value = useMemo<ChatWidgetContextValue>(
    () => ({
      open,
      selectedConversationId,
      openFloatingChat: (conversationId) => {
        if (conversationId !== undefined) setSelectedConversationId(conversationId);
        setOpen(true);
      },
      selectConversation: setSelectedConversationId,
      closeFloatingChat: () => setOpen(false),
    }),
    [open, selectedConversationId],
  );

  return <ChatWidgetContext.Provider value={value}>{children}</ChatWidgetContext.Provider>;
}

export function useChatWidget(): ChatWidgetContextValue {
  const ctx = useContext(ChatWidgetContext);
  if (!ctx) throw new Error("useChatWidget must be used within ChatWidgetProvider");
  return ctx;
}
