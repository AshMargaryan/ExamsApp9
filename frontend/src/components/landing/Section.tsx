import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/*
  The page alternates between two grounds — warm paper for the movements that
  explain, near-black night for the two that are cinematic — and that
  alternation is the visual system. There is deliberately no third surface
  treatment, and no section paints its own one-off background.

  Spacing is a `tone` decision too. Every section on this page used to be
  `py-16 sm:py-24` regardless of what it contained, which is the
  "undifferentiated stack of identically-spaced blocks" theme.css warns about
  beside `--section-gap`.
*/
export function Section({
  id,
  tone = "paper",
  className = "",
  children,
}: {
  id?: string;
  tone?: "paper" | "night";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 ${tone === "night" ? "lp-night" : ""} ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">{children}</div>
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
  tone = "paper",
  align = "center",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: "paper" | "night";
  align?: "center" | "left";
}) {
  const isNight = tone === "night";
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left"}>
      {kicker && (
        <p
          className={`mb-3 text-[length:var(--text-sm)] font-semibold ${
            isNight ? "text-night-ink-dim" : "text-primary"
          }`}
        >
          {kicker}
        </p>
      )}
      {/* The display face is what makes a heading read as a different *level*
          rather than merely a larger size — see theme.css's typography note. */}
      <h2
        className={`font-display text-balance text-[length:var(--text-3xl)] leading-[var(--leading-heading)] font-medium sm:text-[length:var(--text-4xl)] ${
          isNight ? "text-night-ink" : "text-text"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-[length:var(--text-lg)] leading-[var(--leading-body)] ${
            isNight ? "text-night-ink-muted" : "text-text-muted"
          }`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

/**
 * Every fabricated number on this page carries one of these.
 *
 * The page shows a lot of product surface that cannot be real for a visitor
 * with no account, and the honest move is to say so rather than to imply a
 * screenshot. This is the one wording, in one component, so a section cannot
 * quietly ship a statistic without it — before this, one section out of six
 * that invented numbers actually labelled them.
 */
export function DemoNote({
  children = "Ցուցադրական տվյալներ։ Իրական հաշվում սա կառուցվում է քո սեփական պատասխաններից։",
  tone = "paper",
  className = "",
}: {
  children?: ReactNode;
  tone?: "paper" | "night";
  className?: string;
}) {
  return (
    <p
      className={`text-[length:var(--text-xs)] leading-[var(--leading-body)] ${
        tone === "night" ? "text-night-ink-dim" : "text-text-muted"
      } ${className}`}
    >
      {children}
    </p>
  );
}
