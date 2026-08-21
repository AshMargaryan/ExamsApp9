import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { fieldInputClass } from "./ui/Field";

interface Option {
  id: number;
  label: string;
  sublabel?: string;
}

export function SearchSelect({
  placeholder,
  value,
  onChange,
  search,
}: {
  placeholder: string;
  value: Option | null;
  onChange: (option: Option | null) => void;
  search: (q: string) => Promise<Option[]>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await search(query);
        setResults(data);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  function handleFocus() {
    setOpen(true);
    setQuery("");
  }

  function handlePick(option: Option) {
    onChange(option);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      {value && !open ? (
        <button
          type="button"
          onClick={handleFocus}
          className={cn(fieldInputClass, "flex items-center justify-between text-left")}
        >
          <span className="truncate">{value.label}</span>
          <span className="ml-2 shrink-0 text-xs text-text-muted hover:text-primary">Փոխել</span>
        </button>
      ) : (
        <input
          className={fieldInputClass}
          placeholder={placeholder}
          value={query}
          onFocus={handleFocus}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-[var(--radius)] border border-border bg-surface shadow-lg">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-[var(--space-2)] px-3 py-2 text-left text-sm text-text-muted hover:bg-surface-muted"
            >
              <X size={14} strokeWidth={2} aria-hidden /> Չընտրել
            </button>
          )}
          {loading && <div className="px-3 py-2 text-sm text-text-muted">Բեռնվում է...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-muted">Ոչինչ չի գտնվել</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handlePick(r)}
                className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                {r.label}
                {r.sublabel && <span className="ml-2 text-xs text-text-muted">{r.sublabel}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
