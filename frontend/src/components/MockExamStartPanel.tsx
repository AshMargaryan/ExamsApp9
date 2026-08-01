import { useState } from "react";
import { DURATION_PRESETS } from "../api/mockExams";

interface Props {
  examTitle: string;
  onStart: (durationMinutes: number | null, hintsEnabled: boolean) => void;
  onClose: () => void;
  busy?: boolean;
}

export function MockExamStartPanel({ examTitle, onStart, onClose, busy }: Props) {
  const [durationMinutes, setDurationMinutes] = useState<number | null>(120);
  const [hintsEnabled, setHintsEnabled] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել"
          className="absolute top-3 right-3 text-lg text-text-muted transition-colors hover:text-text"
        >
          ✕
        </button>

        <h2 className="mb-1 text-xl font-semibold text-text">{examTitle}</h2>
        <p className="mb-6 text-sm text-text-muted">65 հարց</p>

        <p className="mb-2 text-base font-medium text-text">Ժամանակի սահմանաչափ</p>
        <div className="mb-6 flex flex-col gap-2">
          {DURATION_PRESETS.map((preset) => (
            <label
              key={preset.label}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2 transition-colors ${
                durationMinutes === preset.minutes
                  ? "border-primary bg-surface-muted"
                  : "border-border hover:border-primary"
              }`}
            >
              <input
                type="radio"
                name="duration"
                checked={durationMinutes === preset.minutes}
                onChange={() => setDurationMinutes(preset.minutes)}
              />
              <span className="text-text">{preset.label}</span>
            </label>
          ))}
        </div>

        <label className="mb-6 flex items-center justify-between rounded-md border border-border px-4 py-2">
          <span className="text-base font-medium text-text">Հուշումներ</span>
          <input
            type="checkbox"
            checked={hintsEnabled}
            onChange={(e) => setHintsEnabled(e.target.checked)}
            className="h-5 w-5"
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={() => onStart(durationMinutes, hintsEnabled)}
          className="w-full rounded-md bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          Սկսել
        </button>
      </div>
    </div>
  );
}
