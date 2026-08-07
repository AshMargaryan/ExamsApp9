import { useRef, useState, type DragEvent } from "react";
import { uploadAttachment, type Attachment, type EducationalContext } from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv";

export function MessageInput({
  conversationId,
  disabled,
  onSend,
}: {
  conversationId: number;
  disabled?: boolean;
  onSend: (content: string, attachmentIds: number[], educationalContext?: EducationalContext) => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const hasImage = attachments.some((a) => a.attachment_type === "image");

  function handleSend() {
    const content = text.trim();
    if ((!content && attachments.length === 0) || uploading) return;

    const finalContent = content || "Կցեցի տնային աշխատանքի նկարը։ Օգնի՛ր ինձ քայլ առ քայլ լուծել։";
    const educationalContext: EducationalContext | undefined = hasImage
      ? { conversation_mode: "homework_solver" }
      : undefined;

    onSend(finalContent, attachments.map((a) => a.id), educationalContext);
    setText("");
    setAttachments([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
      className={`rounded-[var(--radius)] border p-3 transition-colors ${
        dragOver ? "border-primary bg-surface-muted" : "border-border bg-surface"
      }`}
    >
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

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={hasImage ? "Նկարագրեք հարցը (կամ պարզապես ուղարկեք նկարը)..." : "Գրեք ձեր հարցը..."}
          rows={1}
          disabled={disabled}
          className="max-h-40 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-[15px] text-text focus:border-primary focus:outline-none"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || uploading || (!text.trim() && attachments.length === 0)}
          title="Ուղարկել"
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-lg text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
