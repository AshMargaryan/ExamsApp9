import { useRef, useState, type ReactElement } from "react";
import { cn } from "../../lib/cn";

interface TooltipProps {
  label: string;
  children: ReactElement;
  side?: "top" | "bottom";
}

/** Hand-rolled per Phase 1's dependency decision — shows after a short delay (not
 * immediately on every hover, per spec section 108), dismisses on mouse-leave/blur, and
 * triggers on focus too so it's reachable by keyboard. */
export function Tooltip({ label, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  function show() {
    timeoutRef.current = window.setTimeout(() => setVisible(true), 400);
  }
  function hide() {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-md)] border border-border bg-surface px-2.5 py-1.5",
            "text-xs font-medium text-text shadow-lg animate-[fade-in_var(--motion-micro)_var(--ease-out)]",
            side === "top" ? "bottom-full left-1/2 mb-2 -translate-x-1/2" : "top-full left-1/2 mt-2 -translate-x-1/2",
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
