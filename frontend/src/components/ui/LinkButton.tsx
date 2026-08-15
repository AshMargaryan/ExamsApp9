import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/** A react-router Link styled identically to Button — for navigation actions
 * (back links, nav items, "see all") that should look and feel like buttons. */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = "secondary", size = "sm", iconLeft, iconRight, className, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={buttonClasses(variant, size, className)} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
});

interface ExternalLinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/** Same as LinkButton, for plain <a> elements (external links). */
export const ExternalLinkButton = forwardRef<HTMLAnchorElement, ExternalLinkButtonProps>(function ExternalLinkButton(
  { variant = "secondary", size = "sm", iconLeft, iconRight, className, children, ...rest },
  ref,
) {
  return (
    <a ref={ref} className={buttonClasses(variant, size, className)} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </a>
  );
});
