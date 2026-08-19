import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

/*
  The top of a page: where am I, what is this, how do I get back, what can I do.

  Why this exists
  ---------------
  Every page hand-rolled this block, and they disagreed on all four parts:

    - the back affordance was a `LinkButton`, a bare `<Link className="text-sm
      text-primary hover:underline">`, or a `<button onClick={navigate(...)}>`
      styled as a link — three different things that look different and sit at
      three different distances from the title;
    - the title was `text-3xl` on some pages, `text-2xl` on others, with
      `mt-2 mb-6`, `mb-8`, or `mb-1` beneath it;
    - the subtitle was sometimes a `<p className="text-lg text-text-muted">`
      big enough to compete with the title itself.

  So the same page furniture rendered at a different size and rhythm depending
  on which page you were on, which is exactly the kind of inconsistency that
  reads as unfinished without a user being able to name why.

  `back` takes a route and a label because a back control that only says "←"
  makes the student guess where it goes. Armenian labels are long, so the
  label truncates rather than wrapping the row.
*/

export function PageHeader({
  title,
  description,
  back,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  /** One line of context. Stays visibly subordinate to the title. */
  description?: ReactNode;
  /** Where "back" goes, and what it's called. Omit on top-level pages. */
  back?: { to: string; label: string };
  /** Page-level actions, e.g. a primary CTA. Wraps below the title on mobile. */
  actions?: ReactNode;
  /** Small label above the title — breadcrumb trail, subject name, category. */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-[var(--space-7)]", className)}>
      {back && (
        <Link
          to={back.to}
          className={cn(
            "mb-[var(--space-3)] inline-flex max-w-full items-center gap-[var(--space-2)]",
            "rounded-[var(--radius-md)] text-[length:var(--text-sm)] text-text-muted",
            "transition-colors hover:text-text",
          )}
        >
          <ArrowLeft size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{back.label}</span>
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-[var(--space-1)] text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
              {eyebrow}
            </p>
          )}
          {/* The display face is what makes a page title read as a title
              rather than as larger body text. Noto Serif Armenian is loaded
              already and has full Armenian coverage, so this costs nothing. */}
          <h1 className="font-display text-[length:var(--text-3xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)] text-text">
            {title}
          </h1>
          {description && (
            <p className="mt-[var(--space-2)] max-w-[var(--measure-base)] text-[length:var(--text-base)] leading-[var(--leading-body)] text-text-muted">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-[var(--space-2)]">{actions}</div>}
      </div>
    </header>
  );
}
