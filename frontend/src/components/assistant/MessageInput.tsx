import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { GraduationCap, Lightbulb } from "lucide-react";
import {
  transcribeVoice, uploadAttachment, type Attachment, type ConversationMode, type EducationalContext,
} from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";
import { CodeIcon, ImageIcon, MicIcon, SendIcon, StopIcon } from "./icons";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv";

const PICKABLE_MODES: { key: Extract<ConversationMode, "explain_mode" | "teach_it_to_me">; label: string; icon: ReactNode }[] = [
  { key: "explain_mode", label: "Բացատրիր", icon: <Lightbulb size={14} strokeWidth={1.75} /> },
  { key: "teach_it_to_me", label: "Սովորեցրու ինձ", icon: <GraduationCap size={14} strokeWidth={1.75} /> },
];

// Chrome/Firefox record audio/webm; Safari only supports audio/mp4. Picking
// whatever MediaRecorder actually supports beats hardcoding one mime type
// that silently fails to record on half of desktop browsers (same approach
// as the chat app's voice messages).
const VOICE_MIME_CANDIDATES = ["audio/webm", "audio/mp4", "audio/ogg"];

function pickVoiceMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return VOICE_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MIN_VOICE_SECONDS = 1;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  async function startRecording() {
    setVoiceError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Ձայնագրումն այս սարքում հասանելի չէ։");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      cancelledRef.current = false;
      recordedChunksRef.current = [];

      const mimeType = pickVoiceMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.start();
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setRecording(true);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((Date.now() - recordingStartRef.current) / 1000);
      }, 200);
    } catch {
      setVoiceError("Խնդրում ենք թույլատրել մուտք դեպի խոսափողը։");
    }
  }

  function cancelRecording() {
    cancelledRef.current = true;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
  }

  // Stop recording and transcribe, but don't auto-send: unlike a casual chat
  // voice message, this fills the text box so the user can review/edit what
  // Whisper heard before it goes to the AI (STT isn't perfect, especially on
  // math vocabulary — see voice_benchmark's README).
  function stopAndTranscribe() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const finalDuration = (Date.now() - recordingStartRef.current) / 1000;
    recorder.onstop = async () => {
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;

      if (cancelledRef.current) return;
      if (finalDuration < MIN_VOICE_SECONDS || recordedChunksRef.current.length === 0) {
        setVoiceError("Ձայնագրությունը չափազանց կարճ է։");
        return;
      }

      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-input.${ext}`, { type: mimeType });

      setTranscribing(true);
      setVoiceError(null);
      try {
        const transcript = await transcribeVoice(file);
        setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      } catch {
        setVoiceError("Ձայնը չհաջողվեց ճանաչել։");
      } finally {
        setTranscribing(false);
      }
    };

    recorder.stop();
    setRecording(false);
    setRecordingSeconds(0);
  }

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
      {voiceError && <p className="mb-2 text-sm text-incorrect">{voiceError}</p>}

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
        {recording ? (
          <div className="flex items-center gap-3 px-1 py-1.5">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-incorrect" />
            <span className="flex-1 text-sm text-text-muted">Ձայնագրվում է... {formatDuration(recordingSeconds)}</span>
            <button
              type="button"
              onClick={cancelRecording}
              title="Չեղարկել ձայնագրումը"
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-text-muted hover:text-text"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={stopAndTranscribe}
              title="Ավարտել և ճանաչել"
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-contrast hover:bg-primary-hover"
            >
              ✓
            </button>
          </div>
        ) : (
          <>
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
                  onClick={startRecording}
                  disabled={disabled || uploading || transcribing}
                  className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:opacity-50"
                >
                  {transcribing ? "…" : <MicIcon className="h-[18px] w-[18px]" />}
                </button>
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
          </>
        )}
      </div>
    </div>
  );
}
