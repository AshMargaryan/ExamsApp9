export function TypingIndicator({ label }: { label?: string | null }) {
  return (
    <div className="flex w-fit items-center gap-2 rounded-[var(--radius)] bg-surface-muted px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-text-muted"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </div>
  );
}
