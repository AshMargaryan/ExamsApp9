import { useMusicPlayer } from "../context/MusicPlayerContext";

export function MusicPlayerWidget() {
  const { isPlaying, toggle } = useMusicPlayer();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isPlaying ? "Կանգնեցնել երաժշտությունը" : "Միացնել երաժշտությունը"}
      title={isPlaying ? "Կանգնեցնել երաժշտությունը" : "Միացնել երաժշտությունը"}
      className={`fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-lg transition-colors hover:border-primary ${
        isPlaying ? "text-primary" : "text-text"
      }`}
    >
      {isPlaying ? "🎵" : "🔇"}
    </button>
  );
}
