import {
  createContext,
  useContext,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/*
  Accessible tab set.

  The app had three hand-rolled pill-tab bars (teacher dashboard, rankings,
  mistake notebook) built from plain <button>s — no role="tab", no
  aria-selected, no arrow-key navigation, so screen readers announced them as
  a row of unrelated buttons. This is the shared replacement; it keeps the
  existing pill look so nothing visually regresses.

  Follows the WAI-ARIA tabs pattern: roving tabindex (only the selected tab is
  in the tab order), arrow keys move between tabs, Home/End jump to the ends.
*/

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional leading icon — prefer a lucide-react icon over an emoji. */
  icon?: ReactNode;
  badge?: number;
}

const TabsCtx = createContext<{ baseId: string; value: string } | null>(null);

function ids(baseId: string, value: string) {
  return { tab: `${baseId}-tab-${value}`, panel: `${baseId}-panel-${value}` };
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  children,
  className = "",
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list, e.g. "Վահանակի բաժիններ". */
  label: string;
  /** `TabPanel`s for each value. */
  children?: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  // Keyed by tab value rather than looked up by selector: useId() emits
  // characters that aren't valid in a CSS selector without escaping.
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = items.findIndex((i) => i.value === value);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;

    e.preventDefault();
    const next = items[nextIndex];
    onChange(next.value);
    // Follow focus, per the ARIA tabs pattern — the newly selected tab is the
    // only one in the tab order, so focus has to move with the selection.
    tabRefs.current.get(next.value)?.focus();
  }

  return (
    <TabsCtx.Provider value={{ baseId, value }}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className={`flex flex-wrap gap-2 ${className}`}
      >
        {items.map((item) => {
          const active = item.value === value;
          const { tab, panel } = ids(baseId, item.value);
          return (
            <button
              key={item.value}
              id={tab}
              ref={(el) => {
                if (el) tabRefs.current.set(item.value, el);
                else tabRefs.current.delete(item.value);
              }}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={panel}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
                active
                  ? "border-primary bg-surface-muted text-primary"
                  : "border-border text-text-muted hover:border-primary hover:text-text"
              }`}
            >
              {item.icon && <span className="flex-none">{item.icon}</span>}
              {item.label}
              {!!item.badge && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {children}
    </TabsCtx.Provider>
  );
}

/** Renders its children only when `value` is the selected tab. */
export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("TabPanel must be used within a Tabs");
  if (ctx.value !== value) return null;
  const { tab, panel } = ids(ctx.baseId, value);
  return (
    <div id={panel} role="tabpanel" aria-labelledby={tab} tabIndex={0} className="focus-visible:outline-none">
      {children}
    </div>
  );
}
