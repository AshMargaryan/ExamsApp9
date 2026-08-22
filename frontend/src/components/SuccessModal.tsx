import { X, CircleCheck } from "lucide-react";

interface Props {
  message: string;
  onClose: () => void;
}

export function SuccessModal({ message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
        <CircleCheck size={36} strokeWidth={1.5} aria-hidden className="mx-auto text-correct" />
        <p className="mt-4 text-lg text-text">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[var(--radius)] bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Լավ
        </button>
      </div>
    </div>
  );
}
