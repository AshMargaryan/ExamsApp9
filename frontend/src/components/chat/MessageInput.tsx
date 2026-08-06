import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { uploadAttachment, type Attachment, type Message } from "../../api/chat";
import { messagePreviewText } from "../../lib/chatLabels";
import { AttachmentChip } from "./AttachmentChip";
import { EmojiPicker } from "./EmojiPicker";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.txt,.md,.csv";

export function MessageInput({
  conversationId,
  disabled,
  onSend,
  replyingTo,
  onCancelReply,
}: {
  conversationId: number;
  disabled?: boolean;
  onSend: (text: string, attachmentIds: number[]) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
  }, [replyingTo]);

  async function handleFiles(files: FileList | File[]) {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const attachment = await uploadAttachment(conversationId, file);
        setAttachments((prev) => [...prev, attachment]);
      }
    } catch {
      setUploadError("Ֆայլը չհաջողվեց վերբեռնել։ Ստուգեք ձևաչափը և չափսը։");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  function handleSend() {
    const content = text.trim();
    if ((!content && attachments.length === 0) || uploading) return;
    onSend(content, attachments.map((a) => a.id));
    setText("");
    setAttachments([]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-md border p-2 transition-colors ${
        dragOver ? "border-primary bg-surface-muted" : "border-transparent"
      }`}
    >
      {replyingTo && (
        <div className="mb-2 flex items-start gap-2 rounded-md border-l-4 border-primary bg-surface-muted px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-primary">
              {replyingTo.sender
                ? [replyingTo.sender.first_name, replyingTo.sender.last_name].filter(Boolean).join(" ")
                  || replyingTo.sender.username
                : "Ջնջված օգտատեր"}
            </p>
            <p className="truncate text-sm text-text-muted">{messagePreviewText(replyingTo)}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 text-text-muted hover:text-text"
            title="Չեղարկել"
          >
            ✕
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              attachment={a}
              onRemove={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
            />
          ))}
        </div>
      )}

      {uploadError && <p className="mb-2 text-sm text-incorrect">{uploadError}</p>}

      <div className="flex items-end gap-2">
        <button
          type="button"
          title="Կցել ֆայլ"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="shrink-0 rounded-md border border-border px-3 py-2 text-lg text-text-muted hover:text-text disabled:opacity-50"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="relative shrink-0">
          {emojiOpen && (
            <EmojiPicker
              onSelect={(emoji) => {
                setText((prev) => prev + emoji);
                setEmojiOpen(false);
              }}
              onClose={() => setEmojiOpen(false)}
            />
          )}
          <button
            type="button"
            title="Էմոջի"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={disabled}
            className="rounded-md border border-border px-3 py-2 text-lg text-text-muted hover:text-text disabled:opacity-50"
          >
            🙂
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Գրեք հաղորդագրություն..."
          rows={1}
          disabled={disabled}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || uploading || (!text.trim() && attachments.length === 0)}
          className="shrink-0 rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          Ուղարկել
        </button>
      </div>
    </div>
  );
}
