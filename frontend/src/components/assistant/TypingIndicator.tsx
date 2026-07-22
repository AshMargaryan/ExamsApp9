export function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-[var(--radius)] bg-surface-muted px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-text-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
