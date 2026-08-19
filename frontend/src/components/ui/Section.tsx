import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  One page section: heading, optional description, optional trailing action,
  and the vertical rhythm between it and the section before it.

  Why this exists
  ---------------
  Pages were composing sections by hand as
  `<section className="mt-6"><h2 className="mb-3 text-lg font-semibold">…`,
  repeated per section, per page. Two problems followed:

  1. Every top-level block on a page ended up separated by the same `mt-6`,
     so a page read as an undifferentiated stack with no grouping and no pause
     between "what to do now" and "how I've been doing".
  2. Section headings were `text-lg` against `text-base` body — a 12% step,
     which is not a large enough difference to register as a level change.

  `spacing` is the lever for (1): `tight` keeps a block with the one above it
  (they are the same idea), `default` is a normal sibling section, and `loose`
  marks a real change of subject. Using proximity to signal grouping is the
  point — related things sit closer than unrelated things.

  `level` controls the heading tag independently of its size, so a section
  nested inside another can stay correct for screen readers without shrinking
  visually (and vice versa).
*/

export type SectionSpacing = "none" | "tight" | "default" | "loose";

const SPACING: Record<SectionSpacing, string> = {
  none: "",
  tight: "mt-[var(--space-6)]",
  default: "mt-[var(--section-gap)]",
  loose: "mt-[var(--section-gap-lg)]",
};

export function Section({
  title,
  description,
  action,
  level = 2,
  spacing = "default",
  children,
  className,
  headingClassName,
}: {
  /** Omit for an unlabelled section — spacing still applies. */
  title?: ReactNode;
  /** One line of context under the heading. Keep it useful, not decorative. */
  description?: ReactNode;
  /** Trailing control, e.g. a "see all" link. Sits on the heading row. */
  action?: ReactNode;
  level?: 2 | 3;
  spacing?: SectionSpacing;
  children: ReactNode;
  className?: string;
  headingClassName?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <section className={cn(SPACING[spacing], className)}>
      {(title || action) && (
        <div className="mb-[var(--space-4)] flex items-start justify-between gap-[var(--space-4)]">
          <div className="min-w-0">
            {title && (
              <Heading
                className={cn(
                  "font-semibold text-text",
                  // A clear step above body text. Armenian headings are long,
                  // so the size increase is paired with tighter tracking and
                  // display leading rather than pushed further up in size.
                  level === 2 ? "text-[length:var(--text-xl)]" : "text-[length:var(--text-lg)]",
                  "leading-[var(--leading-heading)] tracking-[var(--tracking-tight)]",
                  headingClassName,
                )}
              >
                {title}
              </Heading>
            )}
            {description && (
              <p className="mt-[var(--space-1)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
