import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { Conversation, Message } from "../../api/chat";
import { conversationTitle } from "../../lib/chatLabels";
import { ConversationAvatar } from "./ConversationAvatar";

export function ForwardModal({ message, onClose }: { message: Message; onClose: () => void }) {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [sentId, setSentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chatApi.listConversations().then(setConversations);
  }, []);

  async function handleForward(conversationId: number) {
    setError(null);
    setSendingId(conversationId);
    try {
      await chatApi.forwardMessage(message.id, conversationId);
      setSentId(conversationId);
    } catch {
      setError("Փոխանցելիս սխալ տեղի ունեցավ։");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text">Փոխանցել</h2>
          <button type="button" onClick={onClose} aria-label="Փակել" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:bg-surface-muted hover:text-text">
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {error && <p className="px-4 pt-2 text-sm text-incorrect">{error}</p>}

        <div className="flex-1 overflow-y-auto p-2">
          {conversations === null && <p className="px-2 py-4 text-sm text-text-muted">Բեռնվում է...</p>}
          {conversations?.length === 0 && (
            <p className="px-2 py-4 text-sm text-text-muted">Զրույցներ չկան։</p>
          )}
          {conversations?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleForward(c.id)}
              disabled={sendingId !== null}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              <ConversationAvatar conversation={c} size="h-10 w-10" />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{conversationTitle(c)}</span>
              {sendingId === c.id && <span className="shrink-0 text-xs text-text-muted">...</span>}
              {sentId === c.id && <Check size={16} strokeWidth={2.5} aria-hidden className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
