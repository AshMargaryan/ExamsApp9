import { File, Globe, Lock, Pin, Users } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { Conversation } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { messagePreviewText } from "../../lib/chatLabels";
import { downloadAuthenticatedFile } from "../../lib/authenticatedFile";
import { formatBytes } from "../../lib/formatBytes";
import { ErrorState } from "../ui/ErrorState";
import { Modal } from "../ui/Modal";
import { SkeletonRows } from "../ui/Skeleton";
import { ConversationAvatar } from "./ConversationAvatar";

const ROLE_LABELS: Record<string, string> = {
  owner: "Սեփականատեր",
  admin: "Ադմին",
  member: "Անդամ",
};

/*
  "About this group" — members, pinned messages, shared files.

  Two defects of the classes this codebase keeps finding:

  - It was a hand-rolled `fixed inset-0` overlay: no role="dialog", no focus
    trap, no Escape, no focus restoration, and a close button that was an
    unlabelled <X> icon (session 4 named five of these; this was a sixth).
    ui/Modal supplies all of it, and the close control it does not supply is
    unnecessary here because Escape and the overlay both dismiss.
  - Both reads were unguarded `.then(setX)`, so a failed request left
    "Բեռնվում է..." on screen for ever with no error and no retry, and an
    unmount mid-flight set state on a dead component. They are
    useAsyncResource now — the same fix, with skeletons shaped like the rows
    they replace rather than a line of muted text.
*/
function PanelSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Pin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-[var(--space-4)]">
      <p className="mb-[var(--space-1)] flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-semibold text-text-muted">
        <Icon size={13} strokeWidth={1.75} aria-hidden /> {label}
      </p>
      {children}
    </section>
  );
}

export function GroupInfoPanel({ conversation, onClose }: { conversation: Conversation; onClose: () => void }) {
  const { user } = useAuth();
  const pinnedResource = useAsyncResource(() => chatApi.listPinnedMessages(conversation.id), [conversation.id]);
  const filesResource = useAsyncResource(() => chatApi.listConversationFiles(conversation.id), [conversation.id]);

  const myRole = conversation.participants.find((p) => p.user.id === user?.id)?.role;
  const isManager = myRole === "owner" || myRole === "admin";

  async function handleUnpin(messageId: number) {
    await chatApi.unpinMessage(messageId);
    pinnedResource.setData((pinnedResource.data ?? []).filter((m) => m.id !== messageId));
  }

  const pinned = pinnedResource.data;
  const files = filesResource.data;

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Խմբի մասին"
      className="max-w-md"
    >
      <div className="max-h-[65vh] overflow-y-auto">
        <div className="mb-[var(--space-4)] flex flex-col items-center text-center">
          <ConversationAvatar conversation={conversation} size="h-16 w-16" />
          <p className="mt-[var(--space-2)] text-[length:var(--text-base)] font-semibold text-text">
            {conversation.name}
          </p>
          {(conversation.subject || conversation.grade) && (
            <p className="text-[length:var(--text-xs)] text-text-muted">
              {[conversation.subject, conversation.grade ? `${conversation.grade}-րդ դասարան` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <p className="mt-[var(--space-1)] flex items-center gap-[var(--space-1)] text-[length:var(--text-xs)] text-text-muted">
            {conversation.privacy === "public" ? (
              <>
                <Globe size={13} strokeWidth={1.75} aria-hidden /> Բաց խումբ
              </>
            ) : (
              <>
                <Lock size={13} strokeWidth={1.75} aria-hidden /> Փակ խումբ
              </>
            )}
          </p>
          {conversation.description && (
            <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted">
              {conversation.description}
            </p>
          )}
        </div>

        <PanelSection icon={Pin} label="Ամրակցված հաղորդագրություններ">
          {pinnedResource.isLoading && <SkeletonRows count={2} trailing={false} />}
          {pinnedResource.error !== null && (
            <ErrorState
              size="sm"
              title="Չհաջողվեց բեռնել ամրակցվածները։"
              onRetry={pinnedResource.retry}
            />
          )}
          {pinned?.length === 0 && (
            <p className="text-[length:var(--text-sm)] text-text-muted">Ամրակցված հաղորդագրություններ չկան։</p>
          )}
          <div className="flex flex-col gap-[var(--space-1)]">
            {pinned?.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-[var(--space-2)] rounded-[var(--radius-md)] border border-border p-[var(--space-2)]"
              >
                <p className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-text">
                  {messagePreviewText(m)}
                </p>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => handleUnpin(m.id)}
                    className="shrink-0 rounded-[var(--radius-sm)] text-[length:var(--text-xs)] text-text-muted transition-colors hover:text-incorrect"
                  >
                    Հանել
                  </button>
                )}
              </div>
            ))}
          </div>
        </PanelSection>

        <PanelSection icon={Users} label={`Անդամներ (${conversation.participants.length})`}>
          <div className="flex flex-col gap-[var(--space-1)]">
            {conversation.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-[var(--space-2)] px-1 py-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-[length:var(--text-xs)] font-semibold text-text-muted">
                  {p.user.avatar ? (
                    <img src={p.user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.user.first_name || p.user.username).slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-text">
                  {[p.user.first_name, p.user.last_name].filter(Boolean).join(" ") || p.user.username}
                </span>
                <span className="shrink-0 text-[length:var(--text-xs)] text-text-muted">
                  {ROLE_LABELS[p.role] ?? p.role}
                </span>
              </div>
            ))}
          </div>
        </PanelSection>

        <PanelSection icon={File} label="Ֆայլեր">
          {filesResource.isLoading && <SkeletonRows count={2} trailing={false} />}
          {filesResource.error !== null && (
            <ErrorState size="sm" title="Չհաջողվեց բեռնել ֆայլերը։" onRetry={filesResource.retry} />
          )}
          {files?.length === 0 && <p className="text-[length:var(--text-sm)] text-text-muted">Ֆայլեր չկան։</p>}
          <div className="flex flex-col gap-[var(--space-1)]">
            {files?.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => downloadAuthenticatedFile(f.download_url, f.original_filename)}
                className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-1 py-1.5 text-left transition-colors hover:bg-surface-muted"
              >
                <File size={18} strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] text-text">
                  {f.original_filename}
                </span>
                <span className="shrink-0 text-[length:var(--text-xs)] text-text-muted">
                  {formatBytes(f.file_size)}
                </span>
              </button>
            ))}
          </div>
        </PanelSection>
      </div>
    </Modal>
  );
}
