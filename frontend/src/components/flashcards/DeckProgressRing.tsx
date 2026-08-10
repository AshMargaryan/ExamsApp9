interface Props {
  known: number;
  learning: number;
  total: number;
  size?: number;
}

// Small donut showing known/learning/new distribution at a glance — known
// arc from 12 o'clock, learning picks up right after it, whatever's left
// (implicitly "new") is the muted background ring underneath both.
export function DeckProgressRing({ known, learning, total, size = 56 }: Props) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const knownLen = total > 0 ? (known / total) * circumference : 0;
  const learningLen = total > 0 ? (learning / total) * circumference : 0;
  const knownPct = total > 0 ? Math.round((known / total) * 100) : null;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-surface-muted)" strokeWidth={strokeWidth} />
        {total > 0 && (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--color-primary)"
              strokeOpacity={0.4}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${learningLen} ${circumference - learningLen}`}
              strokeDashoffset={-knownLen}
              className="transition-[stroke-dasharray,stroke-dashoffset] duration-500 ease-out"
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${knownLen} ${circumference - knownLen}`}
              className="transition-[stroke-dasharray] duration-500 ease-out"
            />
          </g>
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-text-muted">
        {knownPct !== null ? `${knownPct}%` : "–"}
      </span>
    </div>
  );
}
