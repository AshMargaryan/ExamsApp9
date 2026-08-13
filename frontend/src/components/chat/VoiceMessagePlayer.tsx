import { useEffect, useRef, useState } from "react";
import type { Attachment } from "../../api/chat";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceMessagePlayer({ attachment, own }: { attachment: Attachment; own: boolean }) {
  // useAuthenticatedImageUrl is generic despite the name: it just fetches
  // the URL through apiClient (auth header attached) and hands back an
  // object URL, which works equally well as an <audio> src.
  const { src, error } = useAuthenticatedImageUrl(attachment.download_url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(attachment.duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    // Duration comes from the server-finalized WebM container (see
    // apps.chat.validators._finalize_webm_container — every voice message
    // is remuxed with ffmpeg on upload, which writes a real Segment
    // Duration), so audio.duration is reliably finite here. Deliberately
    // NOT seeking to force a duration calculation if it somehow isn't
    // (Chrome bug workaround that used to live here): on a blob: URL,
    // Chrome's FFmpegDemuxer can throw a fatal, unrecoverable
    // "demuxer seek failed" read error on an out-of-range seek, which
    // permanently breaks playback for that element. attachment.duration
    // (captured client-side while recording, used as this state's initial
    // value) is a perfectly good fallback if audio.duration is ever
    // unavailable — no seek gymnastics needed.
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    // TEMPORARY diagnostic, round 2 — the seek-hack that caused the fatal
    // "demuxer seek failed" MediaError is gone, but playback is reportedly
    // still silent, so something else is wrong. This surfaces whatever
    // MediaError Chrome raises now (or confirms there isn't one, which
    // would point at something outside this component, e.g. actual bytes
    // being served, not decode failure).
    const onError = () => {
      const err = audio.error;
      console.error("[voice-message] audio error", {
        src: audio.currentSrc,
        code: err?.code,
        message: err?.message,
        networkState: audio.networkState,
        readyState: audio.readyState,
        duration: audio.duration,
      });
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      // play() rejects (AbortError) if something else — a re-render tearing
      // down this element, another pause() racing in — interrupts it before
      // it resolves. That's a real possibility here because the surrounding
      // page reconnects two WebSockets on mount; without this catch it's an
      // unhandled promise rejection that also leaves `playing` stuck true
      // with audio actually paused (button shows ⏸ but nothing is playing).
      audio.play().catch((err) => {
        console.error("[voice-message] play() rejected", err);
        setPlaying(false);
      });
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrentTime(value);
  }

  if (error) {
    return (
      <div
        className={`flex h-11 w-64 max-w-full items-center rounded-full border px-3 text-sm ${
          own ? "border-primary-contrast/30 text-primary-contrast/80" : "border-border text-text-muted"
        }`}
      >
        Ձայնագրությունը հասանելի չէ
      </div>
    );
  }

  return (
    <div
      className={`flex h-11 w-64 max-w-full items-center gap-2 rounded-full border px-2 ${
        own ? "border-primary-contrast/30" : "border-border"
      }`}
    >
      {src && <audio ref={audioRef} src={src} preload="metadata" />}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!src}
        aria-label={playing ? "Դադարեցնել" : "Նվագարկել"}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm disabled:opacity-50 ${
          own ? "bg-primary-contrast/20 text-primary-contrast" : "bg-surface text-text"
        }`}
      >
        {src ? (playing ? "⏸" : "▶") : "…"}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={handleSeek}
        disabled={!src || !duration}
        className={`h-1 flex-1 accent-current ${own ? "text-primary-contrast" : "text-primary"}`}
      />
      <span className={`w-10 shrink-0 text-right text-xs tabular-nums ${own ? "text-primary-contrast/80" : "text-text-muted"}`}>
        {formatTime(playing || currentTime > 0 ? currentTime : duration)}
      </span>
    </div>
  );
}
