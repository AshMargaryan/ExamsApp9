import type { ComponentType, ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  One analytics card on the profile.

  Why this exists
  ---------------
  The profile is composed of sixteen modules, and every one of them opened
  with its own hand-rolled header:

      <p className="mb-3 text-sm font-semibold text-text">🔥 1-օրյա շարք</p>
      <p className="mb-1 text-sm font-semibold text-text">⚡ Ակադեմիական հզորություն</p>
      <p className="mb-3 text-xs text-text-muted">Gitus-ի ներքին ցուցանիշ…</p>

  Two problems followed. The spacing disagreed (`mb-3` when there was no
  subtitle, `mb-1` when there was, `mb-0` in two places), and — more visibly —
  the icon was an emoji in all sixteen. Fifteen coloured, platform-rendered
  glyphs on one page, with 📈 used for two different modules and 🏆 for two
  more, against a `lucide-react` icon language that is otherwise consistent
  everywhere else in the product.

  So the header is defined once, takes a lucide component, and the emoji are
  gone. `action` is the trailing control some cards need (a range switch, a
  "see all" link) and sits on the header row rather than being invented
  separately by each card.
*/

export function ProfileCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  padded = true,
}: {
  /** A lucide icon component. Never an emoji. */
  icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: ReactNode;
  /** One line qualifying the number — what it means, what it is not. */
  description?: ReactNode;
  /** Trailing control on the header row. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Off for a card whose body must reach the card's own edges. */
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        // min-w-0 is load-bearing, not cosmetic. A grid/flex item defaults to
        // `min-width: auto`, so a card containing something intrinsically wide
        // — the 365-day activity heatmap, a wide table — stretches to that
        // content's min-content width and pushes the whole document sideways
        // instead of letting the inner `overflow-x-auto` do its job. Measured
        // at 375px: the heatmap card rendered 886px wide and gave the page a
        // 902px scrollWidth.
        "min-w-0 rounded-[var(--radius)] border border-border bg-surface",
        padded && "p-[var(--space-5)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-[var(--space-3)]",
          !padded && "px-[var(--space-5)] pt-[var(--space-5)]",
        )}
      >
        <div className="min-w-0">
          <h3 className="flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold leading-[var(--leading-heading)] text-text">
            {Icon && <Icon size={15} strokeWidth={2} className="shrink-0 text-text-muted" />}
            <span className="min-w-0">{title}</span>
          </h3>
          {description && (
            <p className="mt-[var(--space-1)] max-w-[var(--measure-base)] text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("mt-[var(--space-4)]", !padded && "px-[var(--space-5)] pb-[var(--space-5)]")}>
        {children}
      </div>
    </section>
  );
}
