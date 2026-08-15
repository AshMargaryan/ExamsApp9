import { useState } from "react";
import { speak, stop } from "../../lib/speech";

const SPEEDS: { rate: number; label: string }[] = [
  { rate: 0.25, label: "0.25×" },
  { rate: 0.5, label: "0.5×" },
  { rate: 1, label: "1×" },
];

interface Props {
  text: string;
  translation?: string;
  // In quiz mode, seeing the Armenian translation before answering gives the
  // question away (it narrows down the English-definition choices) — the
  // parent passes false until the card is answered. Flip-mode study is
  // untimed self-review, so it always passes true there.
  allowTranslate?: boolean;
}

// Per-word controls placed next to a flashcard's front_text: three playback
// speeds (0.25x / 0.5x / 1x) plus a toggle to reveal the Armenian
// translation. Speaking state and the reveal toggle live here, not in the
// parent — the parent resets both for free by remounting with `key={cardId}`
// when the card changes.
export function WordPronounce({ text, translation, allowTranslate = true }: Props) {
  const [speakingRate, setSpeakingRate] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speakError, setSpeakError] = useState(false);

  if (!text.trim()) return null;

  function handleToggleSpeak(rate: number) {
    if (speakingRate === rate) {
      stop();
      setSpeakingRate(null);
      return;
    }
    setSpeakError(false);
    setSpeakingRate(rate);
    speak(
      text,
      () => setSpeakingRate(null),
      rate,
      () => setSpeakError(true),
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {SPEEDS.map((s) => {
          const active = speakingRate === s.rate;
          return (
            <button
              key={s.rate}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSpeak(s.rate);
              }}
              title={active ? "Կանգնեցնել" : `Լսել՝ ${s.label} արագությամբ`}
              className={`btn-fx flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-muted hover:border-primary hover:text-primary"
              }`}
            >
              {active ? "⏹" : s.rate === 1 ? "🔊" : "▶"} {s.label}
              {active && (
                <span className="flex h-2.5 items-end gap-[2px]" aria-hidden>
                  <span className="eq-bar h-full w-[2px] rounded-full bg-primary" style={{ animationDelay: "0s" }} />
                  <span className="eq-bar h-full w-[2px] rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
                  <span className="eq-bar h-full w-[2px] rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
                </span>
              )}
            </button>
          );
        })}
        {translation && (
          <button
            type="button"
            disabled={!allowTranslate}
            onClick={(e) => {
              e.stopPropagation();
              setShowTranslation((v) => !v);
            }}
            title={
              allowTranslate
                ? "Ցույց տալ/թաքցնել թարգմանությունը"
                : "Հասանելի կլինի պատասխանելուց հետո"
            }
            className={`btn-fx flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              !allowTranslate
                ? "cursor-not-allowed border-border text-text-muted opacity-40"
                : showTranslation
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-border text-text-muted hover:border-primary hover:text-primary"
            }`}
          >
            🌐 Թարգմանել
          </button>
        )}
      </div>
      {speakError && <p className="text-xs text-incorrect">🔇 ձայնը հասանելի չէ</p>}
      {translation && (
        <div
          className={`grid transition-all duration-300 ease-out ${
            showTranslation && allowTranslate ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <p className="overflow-hidden text-base text-primary">{translation}</p>
        </div>
      )}
    </div>
  );
}
