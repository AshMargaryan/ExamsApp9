import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Logo } from "../Logo";
import { Button } from "../ui/Button";
import { useIsNativeApp } from "../../lib/platform";

/*
  Shared frame for the logged-out screens (login, register). On the web it's the
  centred card those pages have always used; inside the native shell it becomes
  a full-bleed screen with a back chevron and a large title, because a floating
  8-point card on a phone reads as a web page rendered in an app.

  Only the frame changes — the form fields inside are the same markup on both
  platforms.
*/

/* One element, 90 stars, no images — the same seeded box-shadow trick the
   landing page's universe uses, so the two grounds are literally the same sky.
   Seeded so it never shifts between renders. */
const AUTH_STARS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 90 }, () => {
    const x = (rand() * 42).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const o = (0.2 + rand() * 0.6).toFixed(2);
    return `${x}vw ${y}vh 0 rgba(255,255,255,${o})`;
  }).join(",");
})();

interface Props {
  title: string;
  subtitle?: string;
  /** Right-aligned control next to the title (e.g. register's "change role"). */
  headerAction?: ReactNode;
  /** Native only. When given, the back chevron runs this instead of navigating. */
  onBack?: () => void;
  /** Native only: where the back chevron goes when `onBack` isn't given. */
  backTo?: string;
  /** When provided the body is a <form> that submits with this handler. */
  onSubmit?: (e: FormEvent) => void;
  children: ReactNode;
  /** Rendered outside the card/scroll area — modals, which shouldn't be clipped. */
  overlay?: ReactNode;
}

export function AuthScreen({
  title,
  subtitle,
  headerAction,
  onBack,
  backTo = "/",
  onSubmit,
  children,
  overlay,
}: Props) {
  const isNative = useIsNativeApp();
  const navigate = useNavigate();

  const Body = onSubmit ? "form" : "div";
  const bodyProps = onSubmit ? { onSubmit, noValidate: true } : {};

  if (!isNative) {
    return (
      <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,42%)_1fr]">
        {/*
          The left half is the landing page's ground, continued.

          Before this, a visitor who had just scrolled a near-black knowledge
          universe and pressed «Կառուցել իմ ուղին» landed on an unbranded card
          floating on warm paper — a different product, one click after the
          strongest thing the marketing page does. This keeps the world they
          came from on screen while they fill the form in.

          The form itself deliberately stays on paper. Every control inside it
          comes from the `ui/` kit, which is built against `--color-surface`
          and `--color-border`; those follow the theme, `--color-night` does
          not, and putting theme-following inputs on a fixed dark ground is
          how a light-mode user ends up typing into white boxes on black.
          Splitting the screen gets the continuity without that fight.
        */}
        <aside className="relative hidden overflow-hidden bg-night p-10 text-night-ink lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute h-0.5 w-0.5 rounded-full" style={{ boxShadow: AUTH_STARS }} />
          </div>

          <div className="relative flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-display text-[length:var(--text-lg)] font-bold tracking-[var(--tracking-tight)]">
              Gitus
            </span>
          </div>

          <div className="relative">
            <p className="font-display text-[length:var(--text-3xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)]">
              Ամեն օր գիտես՝<br />ինչ սովորել։
            </p>
            <p className="mt-4 max-w-sm text-[length:var(--text-base)] leading-[var(--leading-body)] text-night-ink-muted">
              Gitus-ը հետևում է, թե որ թեմաներում ես սխալվում, և ամեն օր ասում է՝
              կոնկրետ ինչ պարապել հաջորդը։
            </p>
          </div>

          {/* Counted from the question bank in
              backend/apps/mock_exams/data/exams/. Hardcoded rather than
              imported from subjectUniverseData: these screens are eagerly
              loaded, and that module lives in the lazy LandingPage chunk. */}
          <p className="relative text-[length:var(--text-sm)] text-night-ink-dim">
            <span className="tabular-nums text-night-ink">229</span> փորձնական քննություն ·{" "}
            <span className="tabular-nums text-night-ink">16,070</span> հարց
          </p>
        </aside>

        <div className="flex flex-col">
          {/* Phones get a slim band rather than the full panel: half a screen
              of branding is half a screen not spent on the form. */}
          <div className="flex items-center gap-2 bg-night px-5 py-4 text-night-ink lg:hidden">
            <Logo className="h-6 w-6" />
            <span className="font-display text-[length:var(--text-base)] font-bold tracking-[var(--tracking-tight)]">
              Gitus
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
            <Body {...bodyProps} className="w-full max-w-sm">
              <div className="mb-6">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="font-display text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-text">
                    {title}
                  </h1>
                  {headerAction}
                </div>
                {subtitle && (
                  <p className="mt-2 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                    {subtitle}
                  </p>
                )}
              </div>
              {children}
            </Body>
          </div>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-bg"
      style={{
        minHeight: "100dvh",
        paddingTop: "calc(var(--safe-top) + 0.5rem)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(backTo))}
          aria-label="Հետ"
          className="flex h-11 w-11 items-center justify-center rounded-full text-text active:bg-surface-muted"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        {headerAction}
      </div>

      <Body
        {...bodyProps}
        // pb clears the home indicator plus room for the keyboard's accessory bar.
        className="flex-1 overflow-y-auto px-6 pt-2"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 2rem)" }}
      >
        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </Body>
      {overlay}
    </div>
  );
}

/*
  Full-width primary action sized for a thumb.

  `loading` rather than a `disabled` button whose label becomes "..." — the
  old version replaced the verb with three dots, which tells a screen reader
  nothing and tells a sighted user only that something is different. ui/Button
  already renders a spinner and keeps the label, so the submit state is
  announced and readable.
*/
export function AuthSubmitButton({
  children,
  loading,
  disabled,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isNative = useIsNativeApp();
  return (
    <Button
      type="submit"
      loading={loading}
      disabled={disabled}
      size={isNative ? "lg" : "md"}
      className={isNative ? "w-full rounded-[var(--radius-xl)] py-4 text-[17px]" : "w-full"}
    >
      {children}
    </Button>
  );
}
