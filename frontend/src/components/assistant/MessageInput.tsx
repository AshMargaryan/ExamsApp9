import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  transcribeVoice, uploadAttachment, type Attachment, type EducationalContext,
} from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md,.csv";

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
      {voiceError && <p className="mb-2 text-sm text-incorrect">{voiceError}</p>}

      {recording ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-bg px-3 py-2">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-incorrect" />
          <span className="flex-1 text-sm text-text-muted">Ձայնագրվում է... {formatDuration(recordingSeconds)}</span>
          <button
            type="button"
            onClick={cancelRecording}
            title="Չեղարկել ձայնագրումը"
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-text-muted hover:text-text"
          >
            ✕
          </button>
          <button
            type="button"
            onClick={stopAndTranscribe}
            title="Ավարտել և ճանաչել"
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-contrast hover:bg-primary-hover"
          >
            ✓
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <button
            type="button"
            title="Կցել ֆայլ"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading || transcribing}
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

          <button
            type="button"
            title="Ձայնով հարցում"
            onClick={startRecording}
            disabled={disabled || uploading || transcribing}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-lg text-text-muted hover:text-text disabled:opacity-50"
          >
            {transcribing ? "…" : "🎤"}
          </button>

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
      )}
    </div>
  );
}
