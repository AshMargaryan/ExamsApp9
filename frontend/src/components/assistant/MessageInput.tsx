import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { GraduationCap, Lightbulb } from "lucide-react";
import { uploadAttachment, type Attachment, type ConversationMode, type EducationalContext } from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";
import { CodeIcon, ImageIcon, MicIcon, SendIcon, StopIcon } from "./icons";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv";

const PICKABLE_MODES: { key: Extract<ConversationMode, "explain_mode" | "teach_it_to_me">; label: string; icon: ReactNode }[] = [
  { key: "explain_mode", label: "Բացատրիր", icon: <Lightbulb size={14} strokeWidth={1.75} /> },
  { key: "teach_it_to_me", label: "Սովորեցրու ինձ", icon: <GraduationCap size={14} strokeWidth={1.75} /> },
];

export function MessageInput({
  conversationId,
  disabled,
  streaming,
  onStop,
  variant = "docked",
  onSend,
}: {
  conversationId: number;
  disabled?: boolean;
  /** A turn is actively generating — the send-button slot becomes an
   * always-enabled Stop control instead of a disabled Send button. */
  streaming?: boolean;
  onStop?: () => void;
  variant?: "hero" | "docked";
  onSend: (content: string, attachmentIds: number[], educationalContext?: EducationalContext) => void;
}) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ConversationMode | null>(null);
  const [voiceHint, setVoiceHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    // An explicit mode pick wins over the auto-detected homework_solver —
    // the student's deliberate choice takes priority over an inference.
    const mode = selectedMode ?? (hasImage ? "homework_solver" : undefined);
    const educationalContext: EducationalContext | undefined = mode ? { conversation_mode: mode } : undefined;

    onSend(finalContent, attachments.map((a) => a.id), educationalContext);
    setText("");
    setAttachments([]);
    setSelectedMode(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function insertCodeFence() {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    const next = `${before}\n\`\`\`\n${selected}\n\`\`\`\n${after}`;
    setText(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      const caret = before.length + 4 + selected.length; // after opening fence + selection
      textarea?.setSelectionRange(caret, caret);
    });
  }

  function handleVoiceClick() {
    setVoiceHint(true);
    setTimeout(() => setVoiceHint(false), 2500);
  }

  const isHero = variant === "hero";

  return (
    <div className={isHero ? "mx-auto w-full max-w-2xl" : ""}>
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

      <div className="mb-2 flex flex-wrap gap-1.5">
        {PICKABLE_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelectedMode((prev) => (prev === m.key ? null : m.key))}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedMode === m.key
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border text-text-muted hover:border-primary"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-3xl border p-3 transition-colors ${
          dragOver ? "border-primary bg-surface-muted" : "border-border bg-surface"
        } ${isHero ? "shadow-lg" : ""}`}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasImage
              ? "Նկարագրեք հարցը (կամ պարզապես ուղարկեք նկարը)..."
              : isHero
                ? "Ի՞նչ եք ուզում իմանալ..."
                : "Գրեք ձեր հարցը..."
          }
          rows={1}
          disabled={disabled}
          className="max-h-40 w-full appearance-none resize-none border-none bg-surface px-2 py-1.5 text-[15px] text-text placeholder:text-text-muted focus:outline-none"
        />

        <div className="mt-1 flex items-center justify-between">
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              title="Կցել նկար կամ ֆայլ"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
            >
              <ImageIcon className="h-[18px] w-[18px]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />

            <button
              type="button"
              title="Ավելացնել կոդի բլոկ"
              onClick={insertCodeFence}
              disabled={disabled}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
            >
              <CodeIcon className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              title="Ձայնային մուտք"
              onClick={handleVoiceClick}
              disabled={disabled}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
            >
              <MicIcon className="h-[18px] w-[18px]" />
            </button>

            {voiceHint && (
              <div className="absolute -top-9 left-0 whitespace-nowrap rounded-md bg-text px-2.5 py-1 text-xs text-bg shadow-md">
                Ձայնային մուտքը շուտով կլինի
              </div>
            )}
          </div>

          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Կանգնեցնել"
              className="rounded-full bg-primary p-2 text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              <StopIcon className="h-6 w-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || uploading || (!text.trim() && attachments.length === 0)}
              title="Ուղարկել"
              className={`rounded-full p-2 transition-colors ${
                disabled || uploading || (!text.trim() && attachments.length === 0)
                  ? "bg-surface-muted text-text-muted"
                  : "bg-primary text-primary-contrast hover:bg-primary-hover"
              }`}
            >
              <SendIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
