import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "center",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={`mx-auto max-w-2xl ${align === "center" ? "text-center" : "text-left"}`}>
      {kicker && (
        <p className="mb-3 text-sm font-semibold tracking-wide text-primary">{kicker}</p>
      )}
      <h2 className="text-balance text-3xl font-semibold text-text sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-text-muted">{subtitle}</p>}
    </Reveal>
  );
}
