import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Mic, Paperclip, Send, Smile, X } from "lucide-react";
import { uploadAttachment, type Attachment, type Message } from "../../api/chat";
import { messagePreviewText } from "../../lib/chatLabels";
import { AttachmentChip } from "./AttachmentChip";
import { EmojiPicker } from "./EmojiPicker";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.txt,.md,.csv";
const TYPING_THROTTLE_MS = 2000;

const VOICE_MIME_CANDIDATES: { mimeType: string; ext: string }[] = [
  { mimeType: "audio/webm", ext: "webm" },
  { mimeType: "audio/ogg", ext: "ogg" },
  { mimeType: "audio/mp4", ext: "mp4" },
];

function pickVoiceMimeType(): { mimeType: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  return VOICE_MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c.mimeType)) ?? null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MessageInput({
  conversationId,
  disabled,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
}: {
  conversationId: number;
  disabled?: boolean;
  onSend: (text: string, attachmentIds: number[]) => void;
  onTyping?: () => void;
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
  const lastTypingSentRef = useRef(0);

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceSending, setVoiceSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingExtRef = useRef("webm");
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function handleTextChange(value: string) {
    setText(value);
    if (!onTyping) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      onTyping();
    }
  }

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

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function startRecording() {
    const picked = pickVoiceMimeType();
    if (!picked) {
      setUploadError("Ձայնագրումը չի աջակցվում այս բրաուզերում։");
      return;
    }
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordingExtRef.current = picked.ext;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: picked.mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setUploadError("Խնդրում ենք թույլատրել մուտք դեպի խոսափող։");
    }
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    stopStream();
    setRecording(false);
  }

  async function sendRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    setRecording(false);
    stopStream();

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(recordedChunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
    });
    mediaRecorderRef.current = null;

    if (blob.size === 0) return;
    setVoiceSending(true);
    try {
      const file = new File([blob], `voice-message.${recordingExtRef.current}`, { type: blob.type });
      const attachment = await uploadAttachment(conversationId, file);
      onSend("", [attachment.id]);
    } catch {
      setUploadError("Ձայնագրությունը չհաջողվեց ուղարկել։");
    } finally {
      setVoiceSending(false);
    }
  }

  useEffect(() => stopStream, []);

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

      {recording ? (
        <div className="flex items-center gap-3 rounded-md border border-incorrect/40 bg-incorrect/5 px-3 py-2">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-incorrect" />
          <span className="text-sm font-medium text-text">{formatDuration(recordingSeconds)}</span>
          <span className="flex-1 text-xs text-text-muted">Ձայնագրվում է...</span>
          <button
            type="button"
            onClick={cancelRecording}
            title="Չեղարկել"
            className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-muted"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={sendRecording}
            disabled={voiceSending}
            title="Ուղարկել"
            className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            <Send size={16} strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <button
            type="button"
            title="Կցել ֆայլ"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="shrink-0 rounded-md border border-border px-3 py-2 text-lg text-text-muted hover:text-text disabled:opacity-50"
          >
            <Paperclip size={18} strokeWidth={1.75} />
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
              <Smile size={18} strokeWidth={1.75} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Գրեք հաղորդագրություն..."
            rows={1}
            disabled={disabled}
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary disabled:opacity-50"
          />

          {!text.trim() && attachments.length === 0 ? (
            <button
              type="button"
              title="Ձայնային հաղորդագրություն"
              onClick={startRecording}
              disabled={disabled || uploading}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-lg text-text-muted hover:text-text disabled:opacity-50"
            >
              <Mic size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || uploading}
              className="shrink-0 rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Ուղարկել
            </button>
          )}
        </div>
      )}
    </div>
  );
}
