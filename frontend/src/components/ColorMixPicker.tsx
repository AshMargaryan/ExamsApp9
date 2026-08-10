import { useState } from "react";

export interface ColorMix {
  colors: string[];
  angle: number;
}

const EXTRA_COLORS = ["#7f24b0", "#ff5c8d"];

interface ColorMixPickerProps {
  title: string;
  description: string;
  initial: ColorMix;
  defaults: ColorMix;
  onApply: (mix: ColorMix) => void;
  onReset: () => void;
  previewLabel: string;
  previewClassName?: string;
}

export function ColorMixPicker({
  title,
  description,
  initial,
  defaults,
  onApply,
  onReset,
  previewLabel,
  previewClassName = "flex h-16 items-center justify-center rounded-[var(--radius)] font-medium text-white",
}: ColorMixPickerProps) {
  const [{ colors, angle }, setState] = useState<ColorMix>(initial);

  function setColorCount(count: 1 | 2 | 3) {
    setState((s) => {
      if (count === s.colors.length) return s;
      const next = s.colors.slice(0, count);
      while (next.length < count) next.push(EXTRA_COLORS[next.length - 1] ?? defaults.colors[0]);
      return { ...s, colors: next };
    });
  }

  function setColorAt(index: number, value: string) {
    setState((s) => {
      const next = [...s.colors];
      next[index] = value;
      return { ...s, colors: next };
    });
  }

  function setAngle(value: number) {
    setState((s) => ({ ...s, angle: value }));
  }

  function handleApply() {
    onApply({ colors, angle });
  }

  function handleReset() {
    setState(defaults);
    onReset();
  }

  const gradientCss = `linear-gradient(${angle}deg, ${colors.join(", ")})`;

  return (
    <section className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{description}</p>

      <div className="mt-4 flex gap-2">
        {[1, 2, 3].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => setColorCount(count as 1 | 2 | 3)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              colors.length === count
                ? "bg-primary text-primary-contrast"
                : "border border-border text-text hover:bg-surface-muted"
            }`}
          >
            {count} գույն
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {colors.map((color, i) => (
          <label key={i} className="flex flex-col items-center gap-1.5 text-xs text-text-muted">
            Գույն {i + 1}
            <input
              type="color"
              value={color}
              onChange={(e) => setColorAt(i, e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
            />
            <span className="font-mono uppercase">{color}</span>
          </label>
        ))}
      </div>

      {colors.length > 1 && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-text">Աստիճան (degree)</span>
            <span className="text-text-muted">{angle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      )}

      <div className="mt-5">
        <p className="mb-2 text-xs text-text-muted">Նախադիտում</p>
        <div className={previewClassName} style={{ backgroundImage: gradientCss }}>
          {previewLabel}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={handleApply}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Կիրառել
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-border px-5 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
        >
          Վերականգնել կանխադրվածը
        </button>
      </div>
    </section>
  );
}
