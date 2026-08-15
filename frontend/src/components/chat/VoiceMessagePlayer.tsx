import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Attachment } from "../../api/chat";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";

const SPEEDS = [1, 1.5, 2];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceMessagePlayer({ attachment, own }: { attachment: Attachment; own: boolean }) {
  // Reuses the image hook's fetch-as-blob logic — the download endpoint
  // needs an Authorization header a plain <audio src> can't send, and the
  // hook itself is blob-type-agnostic despite the name.
  const { src, error } = useAuthenticatedImageUrl(attachment.download_url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
  }, [src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrent(value);
  }

  if (error) {
    return (
      <div className="flex h-10 w-56 items-center justify-center rounded-full border border-border bg-surface-muted text-xs text-text-muted">
        Ձայնագրությունը հասանելի չէ
      </div>
    );
  }

  return (
    <div className={`flex w-64 max-w-full items-center gap-2 rounded-full px-2 py-1.5 ${own ? "" : ""}`}>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <button
        type="button"
        onClick={togglePlay}
        disabled={!src}
        title={playing ? "Դադարեցնել" : "Նվագարկել"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm disabled:opacity-50 ${
          own ? "bg-primary-contrast/20 hover:bg-primary-contrast/30" : "bg-primary/15 text-primary hover:bg-primary/25"
        }`}
      >
        {playing ? <Pause size={15} strokeWidth={1.75} /> : <Play size={15} strokeWidth={1.75} />}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={current}
        onChange={seek}
        disabled={!src}
        className="h-1 min-w-0 flex-1 accent-current"
      />
      <span className="w-9 shrink-0 text-right text-[10px] tabular-nums opacity-80">
        {formatTime(playing || current > 0 ? current : duration)}
      </span>
      <button
        type="button"
        onClick={cycleSpeed}
        title="Նվագարկման արագություն"
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
          own ? "bg-primary-contrast/20" : "bg-primary/15 text-primary"
        }`}
      >
        {SPEEDS[speedIndex]}x
      </button>
    </div>
  );
}
