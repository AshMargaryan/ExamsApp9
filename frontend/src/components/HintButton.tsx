import { useState } from "react";
import { MathText } from "./MathText";

export function HintButton({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false);

  if (!hint) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
