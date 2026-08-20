import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Logo } from "../../Logo";

/*
  When the keyboard opens, WKWebView pans the *visual* viewport up to reveal the
  focused input. That pan is invisible to CSS: `sticky` and `fixed` both anchor
  to the layout viewport, so the header slides up behind the status bar and the
  Dynamic Island no matter how it's positioned.

  visualViewport.offsetTop is exactly how far the pan moved, so translating the
  header back down by that amount re-pins it to what the user actually sees.
*/
function useVisualViewportOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setOffset(viewport.offsetTop);
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}

interface Props {
  /** Back chevron; omitted entirely when there's nowhere to go back to. */
  onBack?: () => void;
  /** Segmented progress for multi-step flows. 1-based `step`. */
  progress?: { step: number; total: number };
  title: string;
  subtitle?: string;
  /** Small brand mark above the title — used on the entry screens. */
  showLogo?: boolean;
  children: ReactNode;
  /** Pinned action area (primary button, secondary links). */
  footer?: ReactNode;
}

export function AuthShell({ onBack, progress, title, subtitle, showLogo, children, footer }: Props) {
  const viewportOffset = useVisualViewportOffset();

  return (
    <div
      // Normal document flow with sticky header/footer, deliberately not a
      // fixed-position box. WKWebView's "scroll assist" pans to reveal a
      // focused input; with a fixed root the document has no scroll range, so
      // that pan becomes an overscroll that drags the header up behind the
      // status bar. Letting the document scroll keeps the pan in range, where
      // `sticky` holds the header and footer against the viewport edges.
      className="relative flex min-h-[100dvh] flex-col bg-bg"
      style={{
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      {/* Brand backdrop: one soft light source top-left, one accent bloom
          top-right. Fixed to the top so it doesn't travel with the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[340px] opacity-[0.16]"
        style={{
          background:
            "radial-gradient(60% 70% at 15% 0%, var(--color-primary) 0%, transparent 70%), radial-gradient(50% 60% at 90% 10%, var(--color-pink) 0%, transparent 70%)",
        }}
      />

      <header
        className="sticky top-0 z-10 flex-none bg-bg/85 px-2 pt-1 backdrop-blur-md"
        style={{
          paddingTop: "calc(var(--safe-top) + 0.25rem)",
          transform: viewportOffset ? `translateY(${viewportOffset}px)` : undefined,
        }}
      >
        <div className="flex h-11 items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Հետ"
              className="flex h-11 w-11 items-center justify-center rounded-full text-text transition-transform active:scale-90 active:bg-surface-muted"
            >
              <ChevronLeft size={26} strokeWidth={2} />
            </button>
          ) : (
            <span className="h-11 w-11" />
          )}

          {progress && (
            <div className="mr-4 flex flex-1 items-center gap-1.5" aria-hidden>
              {Array.from({ length: progress.total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < progress.step ? "bg-primary" : "bg-border"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        {progress && (
          <p className="sr-only" aria-live="polite">
            Քայլ {progress.step} / {progress.total}
          </p>
        )}
      </header>

      {/* `my-auto` on the inner block (not justify-center on the flex parent)
          centres short steps without the flexbox bug where centred content
          taller than its container gets clipped at the top and can't scroll. */}
      <div className="relative flex flex-1 flex-col px-6">
        <div className="my-auto w-full py-2">
          {showLogo && (
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-primary shadow-lg shadow-black/25">
              <Logo className="h-8 w-8 text-primary-contrast" />
            </span>
          )}
          <h1 className="text-[30px] leading-[1.15] font-bold tracking-tight text-balance text-text">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed text-text-muted">{subtitle}</p>}
          <div className="mt-8 pb-4">{children}</div>
        </div>
      </div>

      {footer && (
        <div
          className="sticky bottom-0 z-10 flex-none border-t border-border/60 bg-bg/85 px-6 pt-4 backdrop-blur-md"
          style={{ paddingBottom: "calc(var(--safe-bottom) + 1rem)" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

/** Full-width thumb-sized primary action with a press response and a spinner
 *  that replaces the label in place, so the button never changes size. */
export function AuthPrimaryButton({
  children,
  loading,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="bg-primary flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-primary-contrast shadow-lg shadow-violet-600/25 transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
    >
      {loading ? (
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-primary-contrast/35 border-t-primary-contrast"
          aria-label="Բեռնվում է"
        />
      ) : (
        children
      )}
    </button>
  );
}
