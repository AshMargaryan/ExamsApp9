import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-contrast shadow-sm hover:bg-primary-hover hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm",
  secondary:
    "border border-border bg-surface text-text hover:border-primary hover:bg-surface-muted active:bg-surface-muted",
  ghost: "bg-transparent text-text hover:bg-surface-muted active:bg-surface-muted",
  danger: "bg-incorrect text-white shadow-sm hover:brightness-95 hover:-translate-y-px active:translate-y-0 active:brightness-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-[15px]",
  lg: "h-12 gap-2.5 px-6 text-base",
};

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
    />
  );
}

/** Every button in the product should render through this — see spec's "button quality
 * standard": idle/hover/focus/pressed/disabled/loading states are handled here once,
 * instead of being reinvented per call site. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, iconLeft, iconRight, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius)] font-medium",
        "transition-[transform,box-shadow,background-color,border-color,filter,opacity] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});
