import { cn } from "../../lib/cn";
import { isNativeApp } from "../../lib/platform";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-contrast shadow-sm hover:bg-primary-hover hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm",
  secondary:
    "border border-border bg-surface text-text hover:border-primary hover:bg-surface-muted active:bg-surface-muted",
  ghost: "bg-transparent text-text hover:bg-surface-muted active:bg-surface-muted",
  danger: "bg-incorrect text-white shadow-sm hover:brightness-95 hover:-translate-y-px active:translate-y-0 active:brightness-90",
};

export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3.5 text-sm",
  md: "h-11 gap-2 px-5 text-[15px]",
  lg: "h-12 gap-2.5 px-6 text-base",
};

/** Thumb-sized equivalents for the app build. Apple's 44pt minimum is a floor,
 *  not a target, so even "sm" clears it and the primary sizes go taller. */
const NATIVE_BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-11 gap-1.5 px-4 text-[14px]",
  md: "h-12 gap-2 px-5 text-[16px]",
  lg: "h-14 gap-2.5 px-6 text-[17px]",
};

/** Press feedback replaces the hover lift, which a finger can never trigger
 *  and which iOS then latches on after the tap. */
const NATIVE_BUTTON_BASE = "rounded-2xl font-semibold active:scale-[0.97]";

/** Shared visual classes so non-<button> elements (e.g. router Links) can look
 * identical to a real Button without duplicating the style rules. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "sm", className?: string) {
  const native = isNativeApp();
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius)] font-medium",
    "transition-[transform,box-shadow,background-color,border-color,filter,opacity] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    BUTTON_VARIANT_CLASSES[variant],
    native ? NATIVE_BUTTON_SIZE_CLASSES[size] : BUTTON_SIZE_CLASSES[size],
    native && NATIVE_BUTTON_BASE,
    className,
  );
}
