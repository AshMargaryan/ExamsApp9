import { useEffect, useState } from "react";
import { File, Globe, Lock, Pin, Users, X } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { Attachment, Conversation, Message } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { messagePreviewText } from "../../lib/chatLabels";
import { downloadAuthenticatedFile } from "../../lib/authenticatedFile";
import { ConversationAvatar } from "./ConversationAvatar";
import { formatBytes } from "../../lib/formatBytes";

const ROLE_LABELS: Record<string, string> = {
  owner: "Սեփականատեր",
  admin: "Ադմին",
  member: "Անդամ",
};

export function GroupInfoPanel({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { user } = useAuth();
  const [pinned, setPinned] = useState<Message[] | null>(null);
  const [files, setFiles] = useState<Attachment[] | null>(null);

  useEffect(() => {
    chatApi.listPinnedMessages(conversation.id).then(setPinned);
    chatApi.listConversationFiles(conversation.id).then(setFiles);
  }, [conversation.id]);

  const myRole = conversation.participants.find((p) => p.user.id === user?.id)?.role;
  const isManager = myRole === "owner" || myRole === "admin";

  async function handleUnpin(messageId: number) {
    await chatApi.unpinMessage(messageId);
    setPinned((prev) => prev?.filter((m) => m.id !== messageId) ?? prev);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-text">Խմբի մասին</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex flex-col items-center text-center">
            <ConversationAvatar conversation={conversation} size="h-16 w-16" />
            <p className="mt-2 text-base font-semibold text-text">{conversation.name}</p>
            {(conversation.subject || conversation.grade) && (
              <p className="text-xs text-text-muted">
                {[conversation.subject, conversation.grade ? `${conversation.grade}-րդ դասարան` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-text-muted">
              {conversation.privacy === "public" ? (
                <>
                  <Globe size={13} strokeWidth={1.75} /> Բաց խումբ
                </>
              ) : (
                <>
                  <Lock size={13} strokeWidth={1.75} /> Փակ խումբ
                </>
              )}
            </p>
            {conversation.description && (
              <p className="mt-2 text-sm text-text-muted">{conversation.description}</p>
            )}
          </div>

          <section className="mb-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-muted">
              <Pin size={13} strokeWidth={1.75} /> Ամրակցված հաղորդագրություններ
            </p>
            {pinned === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}
            {pinned?.length === 0 && <p className="text-sm text-text-muted">Ամրակցված հաղորդագրություններ չկան։</p>}
            <div className="flex flex-col gap-1">
              {pinned?.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
                  <p className="min-w-0 flex-1 truncate text-sm text-text">{messagePreviewText(m)}</p>
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => handleUnpin(m.id)}
                      className="shrink-0 text-xs text-text-muted hover:text-incorrect"
                    >
                      Հանել
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-muted">
              <Users size={13} strokeWidth={1.75} /> Անդամներ ({conversation.participants.length})
            </p>
            <div className="flex flex-col gap-1">
              {conversation.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-1 py-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-xs font-semibold text-text-muted">
                    {p.user.avatar ? (
                      <img src={p.user.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (p.user.first_name || p.user.username).slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text">
                    {[p.user.first_name, p.user.last_name].filter(Boolean).join(" ") || p.user.username}
                  </span>
                  <span className="shrink-0 text-xs text-text-muted">{ROLE_LABELS[p.role] ?? p.role}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-text-muted">
              <File size={13} strokeWidth={1.75} /> Ֆայլեր
            </p>
            {files === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}
            {files?.length === 0 && <p className="text-sm text-text-muted">Ֆայլեր չկան։</p>}
            <div className="flex flex-col gap-1">
              {files?.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => downloadAuthenticatedFile(f.download_url, f.original_filename)}
                  className="flex items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-surface-muted"
                >
                  <File size={18} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{f.original_filename}</span>
                  <span className="shrink-0 text-xs text-text-muted">{formatBytes(f.file_size)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
