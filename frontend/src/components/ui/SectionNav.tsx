import { useEffect, useState } from "react";
import { cn } from "../../lib/cn";

/*
  Scroll-spy section navigation for long single-column pages.

  A page made of six tall sections is unnavigable without one: you can only
  find things by scrolling past everything else. This gives the page a table of
  contents that tracks where you actually are.

  Two presentations over one hook: `SectionNav` is the desktop sticky rail,
  `SectionNavBar` is the mobile sticky strip. Both drive the same ids, so a
  page declares its outline once.
*/

export interface SectionNavItem {
  /** DOM id of the section element. */
  id: string;
  label: string;
}

/** Tracks which section is currently in the reading zone (the upper third of
 *  the viewport), so the highlight moves with the eye rather than with the
 *  top edge of the screen. */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  // Effect identity must follow the ids' *values*, not the array's identity —
  // callers pass a fresh array literal on every render.
  const key = ids.join("|");

  useEffect(() => {
    // Without IntersectionObserver the nav degrades to a plain jump list —
    // every button still scrolls, only the active highlight stops tracking.
    if (typeof IntersectionObserver === "undefined") return;

    const sectionIds = key ? key.split("|") : [];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/** Scroll a page section into view and move focus to it. Exported so a CTA
 *  elsewhere on the page ("finish setting up your schedule") can jump to the
 *  same place the section nav would. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Move focus too, so keyboard and screen-reader users land where sighted
  // users just scrolled. tabIndex=-1 is set on the section by the page.
  el.focus({ preventScroll: true });
}

export function SectionNav({
  items,
  active,
  className,
}: {
  items: SectionNavItem[];
  active: string | null;
  className?: string;
}) {
  return (
    <nav aria-label="Բաժիններ" className={className}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToSection(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "relative w-full rounded-md py-1.5 pl-4 pr-2 text-left text-[13px] transition-colors",
                  "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive ? "font-semibold text-text" : "text-text-muted hover:text-text",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 top-1/2 w-[2px] -translate-y-1/2 rounded-full transition-all",
                    "duration-[var(--motion-normal)] ease-[var(--ease-out)]",
                    isActive ? "h-4 bg-primary" : "h-0 bg-transparent",
                  )}
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SectionNavBar({
  items,
  active,
  className,
}: {
  items: SectionNavItem[];
  active: string | null;
  className?: string;
}) {
  return (
    <nav
      aria-label="Բաժիններ"
      className={cn(
        "-mx-4 overflow-x-auto border-b border-border bg-bg/85 px-4 backdrop-blur",
        "no-scrollbar",
        className,
      )}
    >
      <ul className="flex w-max gap-1.5 py-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToSection(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
                  "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border text-text-muted hover:border-primary hover:text-text",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
