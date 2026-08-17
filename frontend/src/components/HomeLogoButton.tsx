import { Link } from "react-router-dom";
import { Logo } from "./Logo";

/** Replaces HeaderStrip on every non-home page — a single small control that
 * gets back to "/", where the full header lives. */
export function HomeLogoButton() {
  return (
    <Link
      to="/"
      aria-label="Գլխավոր էջ"
      title="Գլխավոր էջ"
      className="fixed right-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-text shadow-lg transition-colors hover:border-primary"
    >
      <Logo className="h-5 w-5" />
    </Link>
  );
}
