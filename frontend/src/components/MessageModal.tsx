interface Props {
  message: string;
  onClose: () => void;
}

export function MessageModal({ message, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-xl"
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
        <p className="text-4xl">⚠️</p>
        <p className="mt-4 text-lg text-text">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-md bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Լավ
        </button>
      </div>
    </div>
  );
}