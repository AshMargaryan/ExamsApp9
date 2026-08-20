import { RotateCw } from "lucide-react";

/*
  A floating "reload the page" control, pinned beside the sidebar toggle.

  The emoji it used to draw (🔄) was the last one left in the web app shell,
  and the odd one out against a monochrome lucide set — but the more
  interesting question about this button is left open deliberately.

  `AppChrome` renders it only in the **web** branch, which is the one context
  where the browser already provides reload in its own chrome; the native
  Capacitor shell, where there is no browser UI and a reload affordance would
  genuinely earn its place, does not render it. That looks inverted, and
  removing it from the web would take a fourth permanent overlay off every
  page. It is a product call rather than a design one, so it is recorded in
  docs/DESIGN.md instead of decided here.
*/
export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      aria-label="Թարմացնել էջը"
      title="Թարմացնել էջը"
      className="fixed left-20 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-[var(--shadow-md)] transition-colors hover:border-primary hover:text-text lg:left-[calc(var(--rail-w)+1rem)]"
    >
      <RotateCw size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
