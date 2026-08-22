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
  size = "page",
  description,
  back,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode;
  /*
    `page` is a name someone chose for a screen — two or three words, and it
    can carry the full display size. `prose` is for a title that is really a
    sentence the *student* wrote: a support ticket's subject (auto-derived
    from the first 60 characters of their description), a note's first line,
    a conversation's name.

    The distinction is not cosmetic. A 60-character Armenian sentence at
    `--text-3xl` measured six lines and 550px tall at 375px — the entire
    first screen of a support thread was the student's own opening sentence,
    set as a banner, with the answer they came for below the fold. Prose
    keeps the display face, because it is still the title of the thing; it
    just stops being a headline.
  */
  size?: "page" | "prose";
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
        {/*
          `min-w-0 flex-1` alone lets this column shrink to nothing, so
          `flex-wrap` never fires and the actions simply crush the title
          instead of dropping below it. Measured on a subtopic page at 375px:
          a 213px action button beside an **82px** title column, in which
          every word of the breadcrumb, the title and the description wrapped
          onto its own line — one word per row, for six rows.

          A real minimum is what makes the row wrap. `min()` keeps it safe if
          the container is ever narrower than the minimum itself, in which
          case the column simply takes the full width.
        */}
        <div className="min-w-[min(100%,15rem)] flex-1">
          {eyebrow && (
            <p className="mb-[var(--space-1)] text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
              {eyebrow}
            </p>
          )}
          {/* The display face is what makes a page title read as a title
              rather than as larger body text. Noto Serif Armenian is loaded
              already and has full Armenian coverage, so this costs nothing. */}
          <h1
            className={cn(
              "font-display font-semibold tracking-[var(--tracking-tight)] text-text",
              size === "page"
                ? "text-[length:var(--text-3xl)] leading-[var(--leading-display)]"
                : "max-w-[var(--measure-base)] text-[length:var(--text-xl)] leading-[var(--leading-heading)]",
            )}
          >
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
