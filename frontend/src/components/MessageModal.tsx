import { X } from "lucide-react";

interface Props {
  message: string;
  onClose: () => void;
  suggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
}

export function MessageModal({ message, onClose, suggestions, onSelectSuggestion }: Props) {
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
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
        <p className="text-4xl">⚠️</p>
        <p className="mt-4 whitespace-pre-line text-lg text-text">{message}</p>

        {suggestions && suggestions.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-sm text-text-muted">Փորձեք այս ազատ օգտանուններից մեկը՝</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSelectSuggestion?.(suggestion)}
                  className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

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