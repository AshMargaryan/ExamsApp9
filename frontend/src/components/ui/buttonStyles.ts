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

/*
  `min-h`, not `h`, and no `whitespace-nowrap` — see the note on
  `buttonClasses` below. The minimum heights are the old fixed ones, so a
  button with a short label renders at exactly the size it always did; only a
  label too long for its container behaves differently.
*/
export const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-1.5 px-3.5 py-1.5 text-sm",
  md: "min-h-11 gap-2 px-5 py-2 text-[15px]",
  lg: "min-h-12 gap-2.5 px-6 py-2.5 text-base",
};

/** Thumb-sized equivalents for the app build. Apple's 44pt minimum is a floor,
 *  not a target, so even "sm" clears it and the primary sizes go taller. */
const NATIVE_BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-11 gap-1.5 px-4 py-2 text-[14px]",
  md: "min-h-12 gap-2 px-5 py-2.5 text-[16px]",
  lg: "min-h-14 gap-2.5 px-6 py-3 text-[17px]",
};

/** Press feedback replaces the hover lift, which a finger can never trigger
 *  and which iOS then latches on after the tap. */
const NATIVE_BUTTON_BASE = "rounded-2xl font-semibold active:scale-[0.97]";

/*
  Shared visual classes so non-<button> elements (e.g. router Links) can look
  identical to a real Button without duplicating the style rules.

  Why this no longer sets `whitespace-nowrap` on a fixed height
  ------------------------------------------------------------
  Together those two made a long label push the whole document sideways
  instead of wrapping. Measured on the study plan at 375px: the hero CTA
  rendered 468px wide inside a 343px column and gave the page a 484px
  scrollWidth — the entire app scrolled horizontally on a phone.

  Armenian is where this bites, because Armenian labels run considerably
  longer than their English equivalents and the product is Armenian-first.
  "Never solve an Armenian layout problem by shrinking the type" applies to
  clipping it too, so the button wraps: `min-h` keeps every short label at
  exactly its old height, and only a label that cannot fit takes a second
  line. A call site that genuinely needs a single line (a compact toolbar
  where wrapping would break a row) can still pass `whitespace-nowrap`.
*/
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "sm", className?: string) {
  const native = isNativeApp();
  return cn(
    "inline-flex max-w-full items-center justify-center rounded-[var(--radius)] text-center font-medium",
    "transition-[transform,box-shadow,background-color,border-color,filter,opacity] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    BUTTON_VARIANT_CLASSES[variant],
    native ? NATIVE_BUTTON_SIZE_CLASSES[size] : BUTTON_SIZE_CLASSES[size],
    native && NATIVE_BUTTON_BASE,
    className,
  );
}
