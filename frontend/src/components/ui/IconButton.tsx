import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";
import type { ButtonVariant } from "./buttonStyles";
import { ICON_BUTTON_SIZE_CLASSES, ICON_BUTTON_VARIANT_CLASSES, type IconButtonSize } from "./iconButtonStyles";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode;
  /** Required, not optional — an icon-only control with no accessible name is a dead end
   * for screen-reader users (spec section 107: "never make tiny mysterious icons"). */
  "aria-label": string;
  variant?: Extract<ButtonVariant, "secondary" | "ghost" | "primary">;
  size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = "ghost", size = "md", disabled, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "transition-[transform,box-shadow,background-color,border-color] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-px active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-40",
        ICON_BUTTON_VARIANT_CLASSES[variant],
        ICON_BUTTON_SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
});
