import { useRef, useState } from "react";
import { MathText } from "./MathText";
import { Lightbulb } from "lucide-react";

interface HintButtonProps {
  hint: string;
  /** Fired the first time this hint is opened (not on every toggle). Used
   * to record a HINT_REQUESTED learning event — best-effort, never blocks
   * or affects the UI if it fails. */
  onOpen?: () => void;
}

export function HintButton({ hint, onOpen }: HintButtonProps) {
  const [open, setOpen] = useState(false);
  const reportedRef = useRef(false);

  if (!hint) return null;

  function handleClick() {
    setOpen((o) => !o);
    if (!reportedRef.current) {
      reportedRef.current = true;
      onOpen?.();
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-border bg-surface-muted px-4 py-2 text-base text-text-muted transition-colors hover:text-primary"
      >
        <Lightbulb size={16} strokeWidth={1.75} aria-hidden /> Հուշում
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-2 w-96 max-w-[90vw] rounded-[var(--radius)] border border-border bg-surface p-4 text-base leading-relaxed text-text shadow-lg">
          <MathText text={hint} />
        </div>
      )}
    </div>
  );
}
