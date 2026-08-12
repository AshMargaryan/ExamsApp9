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
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
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
