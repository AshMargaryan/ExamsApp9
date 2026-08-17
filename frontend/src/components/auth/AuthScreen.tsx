import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
        <Body
          {...bodyProps}
          className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm"
        >
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-semibold text-text">{title}</h1>
              {headerAction}
            </div>
            {subtitle && <p className="mt-2 text-sm text-text-muted">{subtitle}</p>}
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

/** Full-width primary action sized for a thumb — used by the auth screens so
 *  the button doesn't have to be restyled per platform at each call site. */
export function AuthSubmitButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const isNative = useIsNativeApp();
  return (
    <button
      type="submit"
      disabled={disabled}
      className={
        isNative
          ? "bg-primary w-full rounded-2xl py-4 text-[17px] font-semibold text-primary-contrast disabled:opacity-60"
          : "w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      }
    >
      {children}
    </button>
  );
}
