export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-[42px] shrink-0 items-center rounded-full border-none p-0.5 transition-colors disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-surface-muted"
      }`}
    >
      <span
        className="block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}
