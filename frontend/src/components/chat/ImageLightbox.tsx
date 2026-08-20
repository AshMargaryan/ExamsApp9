import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";

export function ImageLightbox({
  src, filename, onClose, onSave,
}: {
  src: string;
  filename: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            title="Ընտրանքներ"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSave();
                }}
                className="flex w-full items-center gap-[var(--space-2)] px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                <Download size={14} strokeWidth={1.75} aria-hidden /> Պահպանել
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել"
          title="Փակել"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <img
        src={src}
        alt={filename}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
      />
    </div>
  );
}
