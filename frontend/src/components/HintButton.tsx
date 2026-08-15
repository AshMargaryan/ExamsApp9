import { useRef, useState } from "react";
import { MathText } from "./MathText";

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
        className="rounded-md border border-border bg-surface-muted px-4 py-2 text-base text-text-muted transition-colors hover:text-primary"
      >
        💡 Հուշում
      </button>
      {open && (
        <div className="absolute left-0 z-10 mt-2 w-96 max-w-[90vw] rounded-md border border-border bg-surface p-4 text-base leading-relaxed text-text shadow-lg">
          <MathText text={hint} />
        </div>
      )}
    </div>
  );
}
