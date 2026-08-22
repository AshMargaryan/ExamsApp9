import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

/*
  Anchored floating panel — the shared base for Select, DatePicker and
  TimePicker.

  Rendered in a portal with fixed positioning rather than absolutely inside the
  trigger's parent: every one of these controls lives inside a card, and cards
  clip (`overflow-hidden`, `rounded`), which would cut a dropdown in half. A
  portal also keeps the panel above sticky section navs without a z-index war.

  Owns the behaviour every dropdown needs and nobody remembers to write:
  reposition on scroll/resize, close on outside pointerdown, close on Escape,
  and return focus to the trigger on close so keyboard users don't get dumped
  at the top of the document.
*/

const VIEWPORT_MARGIN = 8;

export function usePopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const [style, setStyle] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 320,
  });

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      const panelWidth = Math.max(panelRef.current?.offsetWidth ?? 0, rect.width);

      const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const spaceAbove = rect.top - VIEWPORT_MARGIN;
      // Flip above only when below genuinely can't hold the panel and above
      // has more room — flipping eagerly makes the panel jump around as its
      // content changes height (e.g. a calendar switching months).
      const flip = panelHeight > spaceBelow && spaceAbove > spaceBelow;

      const top = flip ? Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - 6) : rect.bottom + 6;
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
      );

      setStyle({
        top,
        left,
        width: rect.width,
        maxHeight: Math.max(160, flip ? spaceAbove : spaceBelow),
      });
    }

    place();
    // `true` captures scrolls on any ancestor, not just the window — these
    // controls live inside scrollable cards and sticky layouts.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, triggerRef, panelRef]);

  return style;
}

export function Popover({
  open,
  onClose,
  triggerRef,
  children,
  className,
  labelledBy,
  role = "dialog",
  minWidthFromTrigger = true,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  role?: "dialog" | "listbox";
  /** Match the trigger's width (dropdowns) vs. size to content (calendars). */
  minWidthFromTrigger?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const position = usePopoverPosition(triggerRef, panelRef, open);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-labelledby={labelledBy}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        minWidth: minWidthFromTrigger ? position.width : undefined,
        maxHeight: position.maxHeight,
      }}
      className={cn(
        "z-[80] overflow-auto rounded-[var(--radius)] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]",
        "animate-[dropdown-in_var(--motion-fast)_var(--ease-out)]",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
