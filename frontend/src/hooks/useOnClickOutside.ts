import { useEffect, type RefObject } from "react";

/** Calls `handler` on any pointerdown outside of `ref`'s element. Used by Dropdown/Tooltip
 * to dismiss on outside click, matching the pattern AppSidebar's drawer already hand-rolls
 * for its backdrop. */
export function useOnClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function onPointerDown(event: PointerEvent) {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler();
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ref, handler, enabled]);
}
