import { cn } from "../../lib/cn";
import { DURATION_PRESETS } from "../../api/mockExams";

const RECOMMENDED_MINUTES = 120;

const PRESET_META: Record<string, { icon: string; hint: string }> = {
  "60": { icon: "⏱", hint: "Արագ փորձ" },
  "90": { icon: "⏱", hint: "Կենտրոնացված" },
  "120": { icon: "⭐", hint: "Առաջարկվող" },
  "150": { icon: "⏱", hint: "" },
  "null": { icon: "∞", hint: "Պարապմունք" },
};

interface Props {
  value: number | null;
  onChange: (minutes: number | null) => void;
}

export function TimeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {DURATION_PRESETS.map((preset) => {
        const meta = PRESET_META[String(preset.minutes)] ?? { icon: "⏱", hint: "" };
        const isSelected = value === preset.minutes;
        const isRecommended = preset.minutes === RECOMMENDED_MINUTES;

        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.minutes)}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-[var(--radius)] border p-4 text-center",
              "transition-[transform,border-color,box-shadow,background-color] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              isSelected
                ? "border-primary bg-surface-muted shadow-sm scale-[1.02]"
                : "border-border bg-surface hover:border-primary/60",
              isRecommended && !isSelected && "border-primary/40",
            )}
          >
            <span className="text-xl" aria-hidden="true">{meta.icon}</span>
            <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-text")}>
              {preset.label}
            </span>
            {meta.hint && (
              <span className={cn("text-xs", isRecommended ? "font-medium text-primary" : "text-text-muted")}>
                {meta.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
