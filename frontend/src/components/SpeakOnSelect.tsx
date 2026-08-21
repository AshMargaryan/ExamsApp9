import { useEffect, useRef, useState } from "react";
import { isSpeechSupported, speak, stop } from "../lib/speech";
import { translateToArmenian } from "../lib/translate";
import { Languages, Play, Volume2, VolumeX } from "lucide-react";

interface Widget {
  x: number;
  y: number;
  text: string;
}

// The learning material mixes Armenian explanations with English examples —
// only the latter should be voicable, since reading Armenian through the
// English TTS voice comes out wrong. A selection counts as English when it
// has a Latin letter and no Armenian one.
const ARMENIAN_LETTER = /[Ա-Ֆա-և]/;
const LATIN_LETTER = /[A-Za-z]/;
function isEnglishText(text: string): boolean {
  return LATIN_LETTER.test(text) && !ARMENIAN_LETTER.test(text);
}

const SPEEDS: { rate: number; label: string }[] = [
  { rate: 0.25, label: "0.25×" },
  { rate: 0.5, label: "0.5×" },
  { rate: 1, label: "1×" },
];

// Wraps its children so that selecting any text inside pops up a small
// speaker button near the selection — click it to hear the selection read
// aloud, click again (or press Escape/Q) to stop mid-playback. Used to let
// students hear the pronunciation of any word or sentence in English
// practice content.
export function SpeakOnSelect({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widget, setWidget] = useState<Widget | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const speakingRef = useRef(false);
  speakingRef.current = speaking;

  // Every widget change (new selection, or the widget closing) drops any
  // translation from the previous word — otherwise a stale Armenian chip
  // would linger under an unrelated new selection.
  function showWidget(w: Widget | null) {
    setWidget(w);
    setTranslation(null);
    setTranslating(false);
  }

  function handleStop() {
    stop();
    setSpeaking(false);
    showWidget(null);
  }

  async function handleTranslate() {
    if (!widget || translating) return;
    if (translation !== null) {
      setTranslation(null);
      return;
    }
    setTranslating(true);
    const result = await translateToArmenian(widget.text);
    setTranslating(false);
    setTranslation(result ?? "Չհաջողվեց թարգմանել");
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
        showWidget(null);
        return;
      }
      if (!containerRef.current?.contains(selection.anchorNode)) {
        showWidget(null);
        return;
      }
      if (!isEnglishText(text)) {
        showWidget(null);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      showWidget({ x: rect.left + rect.width / 2, y: rect.top, text });
    }

    // Read the selection on the next tick — mouseup/touchend can fire
    // slightly before the browser finishes updating window.getSelection().
    // Clicks on the widget's own buttons (speed/translate) also bubble a
    // mouseup up to document — ignore those, or every button click would
    // re-run this against the still-active selection and wipe out whatever
    // state that click's own handler just set (e.g. a fetched translation).
    function handlePointerUp(e: Event) {
      if (widgetRef.current?.contains(e.target as Node)) return;
      setTimeout(updateFromSelection, 0);
    }

    function handleSelectionChange() {
      if (speakingRef.current) return;
      if (window.getSelection()?.isCollapsed !== false) showWidget(null);
    }

    // A button inside the widget stealing focus can nudge the page into an
    // auto "scroll into view" — that's not the user scrolling away, so it
    // shouldn't dismiss the widget they're actively clicking on.
    function handleScroll() {
      if (speakingRef.current) return;
      if (widgetRef.current?.contains(document.activeElement)) return;
      showWidget(null);
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

  function handleSpeak(rate: number) {
    if (!widget) return;
    setSpeaking(true);
    speak(
      widget.text,
      () => {
        setSpeaking(false);
        showWidget(null);
      },
      rate,
    );
  }

  if (!isSpeechSupported()) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="relative">
      {children}

      {widget && (
        <div
          ref={widgetRef}
          style={{
            position: "fixed",
            left: widget.x,
            top: widget.y,
            transform: "translate(-50%, calc(-100% - 10px))",
          }}
          // Clicking a button here would otherwise collapse the browser's
          // text selection on mousedown (default browser behavior for any
          // mousedown outside the current range) — which fires our own
          // selectionchange listener and hides the whole widget before the
          // click even registers. Blocking mousedown's default keeps the
          // selection (and this widget) alive through the click.
          onMouseDown={(e) => e.preventDefault()}
          className="z-40 flex flex-col items-center gap-1"
        >
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-lg">
            {speaking ? (
              <button
                type="button"
                onClick={handleStop}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-incorrect bg-incorrect-bg text-incorrect transition-colors"
                aria-label="Կանգնեցնել (Esc կամ Q)"
                title="Կանգնեցնել (Esc կամ Q)"
              >
                <VolumeX size={16} strokeWidth={1.75} aria-hidden />
              </button>
            ) : (
              <>
                {SPEEDS.map((s) => (
                  <button
                    key={s.rate}
                    type="button"
                    onClick={() => handleSpeak(s.rate)}
                    className="flex h-9 items-center gap-1 rounded-full border border-border px-2 text-xs font-medium text-text transition-colors hover:border-primary hover:text-primary"
                    aria-label={`Լսել՝ ${s.label} արագությամբ`}
                    title={`Լսել՝ ${s.label} արագությամբ`}
                  >
                    {s.rate === 1 ? (
                      <Volume2 size={13} strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Play size={13} strokeWidth={2} aria-hidden />
                    )}{" "}
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleTranslate}
                  disabled={translating}
                  className={`flex h-9 items-center gap-1 rounded-full border px-2 text-xs font-medium transition-colors ${
                    translation !== null
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border text-text hover:border-primary hover:text-primary"
                  }`}
                  aria-label="Ցույց տալ հայերեն թարգմանությունը"
                  title="Ցույց տալ հայերեն թարգմանությունը"
                >
                  {translating ? <span aria-hidden>…</span> : <Languages size={13} strokeWidth={1.75} aria-hidden />}{" "}
                  Թարգմանել
                </button>
              </>
            )}
          </div>

          {translation !== null && (
            <div className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-1 text-sm font-medium text-primary shadow-lg">
              {translation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
