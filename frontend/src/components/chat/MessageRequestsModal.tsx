import { useEffect, useState } from "react";
import { X } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { Conversation } from "../../api/chat";
import { lastMessagePreviewText } from "../../lib/chatLabels";
import { ConversationAvatar } from "./ConversationAvatar";

function RequestRow({
  conversation, onRespond,
}: {
  conversation: Conversation;
  onRespond: (id: number, action: "accept" | "decline" | "block") => void;
}) {
  const [busy, setBusy] = useState(false);
  const other = conversation.other_participant;
  const name = other ? [other.first_name, other.last_name].filter(Boolean).join(" ") || other.username : "";

  async function respond(action: "accept" | "decline" | "block") {
    setBusy(true);
    try {
      await onRespond(conversation.id, action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-border p-3">
      <ConversationAvatar conversation={conversation} size="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {name}
          {other && <span className="ml-1 text-xs text-text-muted">@{other.username}</span>}
        </p>
        <p className="truncate text-sm text-text-muted">{lastMessagePreviewText(conversation)}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("accept")}
            className="rounded-[var(--radius)] bg-primary px-3 py-1 text-xs font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            Ընդունել
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("decline")}
            className="rounded-[var(--radius)] border border-border px-3 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted disabled:opacity-60"
          >
            Մերժել
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => respond("block")}
            className="rounded-[var(--radius)] border border-incorrect px-3 py-1 text-xs font-medium text-incorrect hover:bg-incorrect-bg disabled:opacity-60"
          >
            Արգելափակել
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageRequestsModal({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<Conversation[] | null>(null);

  function refresh() {
    chatApi.listMessageRequests().then(setRequests);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleRespond(id: number, action: "accept" | "decline" | "block") {
    await chatApi.respondToMessageRequest(id, action);
    refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text">Հաղորդագրության հարցումներ</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {requests === null && <p className="px-2 py-4 text-sm text-text-muted">Բեռնվում է...</p>}
          {requests?.length === 0 && (
            <p className="px-2 py-4 text-sm text-text-muted">Հարցումներ չկան։</p>
          )}
          <div className="flex flex-col gap-2">
            {requests?.map((c) => (
              <RequestRow key={c.id} conversation={c} onRespond={handleRespond} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
