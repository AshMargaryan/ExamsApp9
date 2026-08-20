import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "../../lib/cn";

export interface DropdownItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  /** One line of consequence under the label — e.g. that choosing this
   *  restarts the session. Menus are where a setting's cost should be stated,
   *  because that is where the person is deciding to pay it. */
  hint?: ReactNode;
  /** Present makes the item a setting rather than a command: it gets
   *  `aria-checked` and a tick — so the current choice is never carried by
   *  tint alone. */
  checked?: boolean;
  /** How the checked state should be announced. `radio` (the default) means
   *  "one of the adjacent group is on"; `checkbox` means "this one thing is
   *  on or off". A standalone toggle announced as a radio tells a screen
   *  reader there is a sibling choice that does not exist. */
  selection?: "radio" | "checkbox";
  disabled?: boolean;
  /** Draws a rule above this item. A menu that mixes settings, navigation and
   *  a destructive action needs the groups to be visible, or it reads as one
   *  undifferentiated list of eight things. */
  divider?: boolean;
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
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition(
      align === "end"
        ? { top: rect.bottom + 8, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 8, left: rect.left },
    );
  }, [open, align]);

  /** Return focus to whatever opened the menu. Without this a keyboard user
   *  who dismisses the menu loses their place entirely — the menu is portaled
   *  to the end of <body>, so focus would fall to the top of the document. */
  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.querySelector<HTMLElement>("button, [href], [tabindex]")?.focus();
  }, []);

  // The menu is portaled to document.body, so it is the *last* thing in the
  // DOM no matter where its trigger sits. Tab therefore never reaches it:
  // before this, opening the account menu with the keyboard produced a menu
  // that could only be entered by tabbing through the entire page. It now
  // follows the WAI-ARIA menu-button pattern — the first item takes focus on
  // open, arrows move between items, Escape returns to the trigger.
  const focusItemAt = useCallback((start: number, step: 1 | -1) => {
    const n = itemRefs.current.length;
    for (let i = 0; i < n; i++) {
      const el = itemRefs.current[(start + step * i + n * n) % n];
      if (el && !el.disabled) {
        el.focus();
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !position) return;
    focusItemAt(0, 1);
  }, [open, position, focusItemAt]);

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItemAt(current + 1, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItemAt(current - 1, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItemAt(0, 1);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItemAt(itemRefs.current.length - 1, -1);
    } else if (e.key === "Tab") {
      // Tabbing out of a menu dismisses it rather than walking the rest of
      // the page with an orphaned menu still painted over the content.
      closeAndRestoreFocus();
    }
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndRestoreFocus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeAndRestoreFocus]);

  itemRefs.current.length = items.length;

  return (
    <div ref={triggerRef} className="relative inline-block">
      {renderTrigger({ onClick: () => setOpen((o) => !o), "aria-haspopup": "menu", "aria-expanded": open })}
      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            style={{ top: position.top, left: position.left, right: position.right }}
            className={cn(
              // z-50, above AppChrome's persistent z-40 overlays (ReloadButton)
              // so an open dropdown never paints underneath them.
              "fixed z-50 min-w-[13rem] overflow-hidden rounded-[var(--radius)] border border-border bg-surface py-1.5 shadow-xl",
              "animate-[dropdown-in_var(--motion-fast)_var(--ease-out)]",
            )}
          >
            {items.map((item, i) => {
              const selectable = item.checked !== undefined;
              return (
                <div key={item.key} role="none">
                {item.divider && <hr role="separator" className="my-1.5 border-0 border-t border-border" />}
                <button
                  ref={(el) => { itemRefs.current[i] = el; }}
                  type="button"
                  role={selectable ? (item.selection === "checkbox" ? "menuitemcheckbox" : "menuitemradio") : "menuitem"}
                  aria-checked={selectable ? item.checked : undefined}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-[15px] font-medium transition-colors duration-[var(--motion-micro)]",
                    "disabled:pointer-events-none disabled:opacity-45",
                    item.tone === "danger"
                      ? "text-incorrect hover:bg-incorrect-bg focus-visible:bg-incorrect-bg"
                      : "text-text hover:bg-surface-muted focus-visible:bg-surface-muted",
                  )}
                >
                  {/* 1.5em is the button's own line-height, so the tick or icon
                      centres on the label's first line rather than sitting a
                      pixel above it. `min-w` rather than `w`: a caller with a
                      17px icon should not have it squeezed to fit a 16px box. */}
                  <span className="flex h-[1.5em] min-w-4 shrink-0 items-center justify-center">
                    {selectable
                      ? item.checked && <Check size={15} strokeWidth={2.25} aria-hidden />
                      : item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    {item.label}
                    {item.hint && (
                      <span className="mt-0.5 block text-[length:var(--text-xs)] font-normal text-text-muted">
                        {item.hint}
                      </span>
                    )}
                  </span>
                </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
