import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

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
 * AppSidebar's drawer already hand-rolls for its own backdrop/Escape handling.
 *
 * The menu itself is portaled to document.body and positioned with `fixed` coordinates
 * derived from the trigger's rect, instead of `absolute`-inside-the-trigger — callers often
 * sit inside an `overflow-hidden` card (e.g. a rounded list container), which would silently
 * clip an absolutely-positioned menu. */
export function Dropdown({ renderTrigger, items, align = "end" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition(
      align === "end"
        ? { top: rect.bottom + 8, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 8, left: rect.left },
    );
  }, [open, align]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={triggerRef} className="relative inline-block">
      {renderTrigger({ onClick: () => setOpen((o) => !o), "aria-haspopup": "menu", "aria-expanded": open })}
      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, right: position.right }}
            className={cn(
              // z-50, above AppChrome's persistent z-40 overlays (ReloadButton)
              // so an open dropdown never paints underneath them.
              "fixed z-50 min-w-[13rem] overflow-hidden rounded-[var(--radius)] border border-border bg-surface py-1.5 shadow-xl",
              "animate-[dropdown-in_var(--motion-fast)_var(--ease-out)]",
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
          </div>,
          document.body,
        )}
    </div>
  );
}
