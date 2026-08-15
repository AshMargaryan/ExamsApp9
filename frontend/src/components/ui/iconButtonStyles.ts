export type IconButtonSize = "sm" | "md" | "lg";

export const ICON_BUTTON_VARIANT_CLASSES: Record<string, string> = {
  primary: "bg-primary text-primary-contrast shadow-sm hover:bg-primary-hover active:brightness-95",
  secondary: "border border-border bg-surface text-text hover:border-primary hover:bg-surface-muted",
  ghost: "bg-transparent text-text-muted hover:bg-surface-muted hover:text-text",
};

export const ICON_BUTTON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-lg",
  lg: "h-11 w-11 text-xl",
};
