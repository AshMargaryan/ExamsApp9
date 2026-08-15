interface Props {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

/** Generic single-arc SVG progress ring — same arc math as
 * flashcards/DeckProgressRing.tsx, generalized to one value/max pair instead
 * of a fixed known/learning/total split. Used for goal progress and XP. */
export function ProgressRing({ value, max, size = 56, strokeWidth = 6, color = "var(--color-primary)", label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const percent = max > 0 ? Math.min(1, value / max) : 0;
  const arcLen = percent * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-surface-muted)" strokeWidth={strokeWidth} />
        {max > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${circumference - arcLen}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text">
        {label ?? `${Math.round(percent * 100)}%`}
      </span>
    </div>
  );
}
