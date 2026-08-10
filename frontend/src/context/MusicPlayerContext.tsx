import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

// https://youtu.be/NBVDGnilVY4
const VIDEO_ID = "NBVDGnilVY4";
const STORAGE_KEY = "bg_music_enabled";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type MusicPlayerContextValue = {
  isPlaying: boolean;
  toggle: () => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

// The IFrame API script is shared global state (YouTube attaches itself to
// `window`), so we only ever inject the <script> tag once no matter how many
// times this provider mounts.
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });
}

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // Remembers the user's own stop/play choice across the loop restarting.
  const wantsPlaying = useRef(localStorage.getItem(STORAGE_KEY) !== "off");

  useEffect(() => {
    if (!user || playerRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          // Looping a single video via the IFrame API requires it to also be
          // named as its own one-item "playlist".
          loop: 1,
          playlist: VIDEO_ID,
          playsinline: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (e: any) => {
            if (wantsPlaying.current) e.target.playVideo();
          },
          onStateChange: (e: any) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      wantsPlaying.current = false;
      localStorage.setItem(STORAGE_KEY, "off");
    } else {
      player.playVideo();
      wantsPlaying.current = true;
      localStorage.setItem(STORAGE_KEY, "on");
    }
  }, [isPlaying]);

  if (!user) return <>{children}</>;

  return (
    <MusicPlayerContext.Provider value={{ isPlaying, toggle }}>
      {children}
      {/* The YouTube IFrame API replaces its target element with an <iframe>,
       * bypassing React entirely. That target must be an only-child leaf with
       * no siblings of its own — otherwise, once swapped, React's next commit
       * that needs this node as an insertBefore/removeChild reference (e.g. a
       * route change swapping the page directly after this in the tree) throws
       * NotFoundError and crashes the whole app. This wrapper absorbs that: the
       * wrapper itself is never touched by the YouTube API, so it stays a valid
       * sibling reference for React. */}
      <div className="fixed -left-full -top-full h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <div ref={containerRef} />
      </div>
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return ctx;
}
