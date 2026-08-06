import { useEffect, useRef, useState } from "react";
import { isSpeechSupported, speak, stop } from "../lib/speech";

interface Widget {
  x: number;
  y: number;
  text: string;
}

// Wraps its children so that selecting any text inside pops up a small
// speaker button near the selection — click it to hear the selection read
// aloud, click again (or press Escape/Q) to stop mid-playback. Used to let
// students hear the pronunciation of any word or sentence in English
// practice content.
export function SpeakOnSelect({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widget, setWidget] = useState<Widget | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);
  speakingRef.current = speaking;

  function handleStop() {
    stop();
    setSpeaking(false);
    setWidget(null);
  }

  useEffect(() => {
    if (!isSpeechSupported()) return;

    function updateFromSelection() {
      // Don't let a fresh selection swap out the widget mid-playback —
      // the stop control needs to stay put until the user acts on it.
      if (speakingRef.current) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !text) {
        setWidget(null);
        return;
      }
      if (!containerRef.current?.contains(selection.anchorNode)) {
        setWidget(null);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setWidget({ x: rect.left + rect.width / 2, y: rect.top, text });
    }

    // Read the selection on the next tick — mouseup/touchend can fire
    // slightly before the browser finishes updating window.getSelection().
    function handlePointerUp() {
      setTimeout(updateFromSelection, 0);
    }

    function handleSelectionChange() {
      if (speakingRef.current) return;
      if (window.getSelection()?.isCollapsed !== false) setWidget(null);
    }

    function handleScroll() {
      if (!speakingRef.current) setWidget(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (!speakingRef.current) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (e.key === "Escape" || e.key.toLowerCase() === "q") {
        e.preventDefault();
        handleStop();
      }
    }

    document.addEventListener("mouseup", handlePointerUp);
    document.addEventListener("touchend", handlePointerUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("touchend", handlePointerUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSpeak() {
    if (!widget) return;
    setSpeaking(true);
    speak(widget.text, () => {
      setSpeaking(false);
      setWidget(null);
    });
  }

  if (!isSpeechSupported()) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative">
      {children}

      {widget && (
        <button
          type="button"
          onClick={speaking ? handleStop : handleSpeak}
          style={{
            position: "fixed",
            left: widget.x,
            top: widget.y,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
          className={`z-40 flex h-11 w-11 items-center justify-center rounded-full border text-2xl shadow-lg transition-colors ${
            speaking ? "border-incorrect bg-incorrect-bg" : "border-border bg-surface hover:border-primary"
          }`}
          aria-label={speaking ? "Կանգնեցնել (Esc կամ Q)" : "Լսել արտասանությունը"}
          title={speaking ? "Կանգնեցնել (Esc կամ Q)" : "Լսել արտասանությունը"}
        >
          {speaking ? "🔇" : "🔊"}
        </button>
      )}
    </div>
  );
}
