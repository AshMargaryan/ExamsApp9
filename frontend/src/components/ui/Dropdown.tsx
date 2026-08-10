import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

export interface DropdownItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
}

interface DropdownProps {
  /** Render-prop so the caller supplies its own trigger element (e.g. an Avatar) and we
   * only spread the click/aria wiring onto it — avoids nesting a <button> inside whatever
   * interactive element the caller renders. */
  renderTrigger: (props: {
    onClick: () => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
  }) => ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
}

/** Hand-rolled per Phase 1's dependency decision — dismiss-on-outside-click and Escape are
 * the only real requirements here (no focus-trap need, unlike Modal), matching the pattern
 * AppSidebar's drawer already hand-rolls for its own backdrop/Escape handling. */
export function Dropdown({ renderTrigger, items, align = "end" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {renderTrigger({ onClick: () => setOpen((o) => !o), "aria-haspopup": "menu", "aria-expanded": open })}
      {open && (
        <div
          role="menu"
          className={cn(
            // z-50, above AppChrome's persistent z-40 overlays (ReloadButton, NotificationBell,
            // AssignmentSidebar toggle) so an open dropdown never paints underneath them.
            "absolute z-50 mt-2 min-w-[13rem] overflow-hidden rounded-[var(--radius)] border border-border bg-surface py-1.5 shadow-xl",
            "animate-[dropdown-in_var(--motion-fast)_var(--ease-out)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors duration-[var(--motion-micro)]",
                item.tone === "danger" ? "text-incorrect hover:bg-incorrect-bg" : "text-text hover:bg-surface-muted",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
