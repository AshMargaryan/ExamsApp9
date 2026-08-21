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
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
        {/*
          The logged-out screens used to be an unbranded `max-w-sm` box with a
          one-word title in it. A first-time visitor arriving at /login saw a
          generic form and no indication of what they were signing in to. The
          mark and the one-line statement of what Gitus is cost 60px and are
          the only thing on this screen that says the product is real.
        */}
        <div className="mb-[var(--space-6)] flex flex-col items-center gap-[var(--space-2)] text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] text-on-brand" style={{ background: "var(--gradient-brand)" }}>
            <Logo className="h-6 w-6" />
          </span>
          <p className="font-display text-[length:var(--text-xl)] font-semibold tracking-[var(--tracking-tight)] text-text">
            Gitus
          </p>
          <p className="max-w-[18rem] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
            Միասնական քննությունների նախապատրաստում՝ պարապմունք, փորձնական քննություններ և AI օգնական
          </p>
        </div>

        <Body
          {...bodyProps}
          className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-[var(--shadow-sm)]"
        >
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
