import type { ReactNode } from "react";

/*
  Shared loading placeholders.

  Codifies the idiom that was being hand-rolled in ~14 files
  (`h-N animate-pulse rounded-[var(--radius)] bg-surface-muted` inside an
  `[...Array(n)].map`) and replaces bare "Բեռնվում է..." text, so a loading
  screen keeps the shape of the content it's about to become instead of
  collapsing to a line of muted text.

  `prefers-reduced-motion` is handled globally in index.css (it zeroes every
  animation), so none of these need their own reduced-motion branch.
*/

/** One shimmering block. Size it with `className` (e.g. "h-8 w-24"). */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[var(--radius)] bg-surface-muted ${className}`} />;
}

/** Paragraph placeholder — the last line is short, the way real text wraps. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Card-shaped placeholder matching `ui/Card`'s border/padding. */
export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-[var(--radius)] border border-border bg-surface p-5 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <SkeletonText lines={lines} className="mt-4" />
    </div>
  );
}

/** Avatar + two text lines + optional trailing block — the list-row idiom used
 *  by the leaderboard, review queue and activity feed. */
export function SkeletonRow({ trailing = true, className = "" }: { trailing?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 ${className}`}>
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {trailing && <Skeleton className="h-8 w-16 shrink-0" />}
    </div>
  );
}

/** Repeats `SkeletonRow` — the `[...Array(n)].map` boilerplate, once. */
export function SkeletonRows({ count = 3, trailing = true }: { count?: number; trailing?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} trailing={trailing} />
      ))}
    </div>
  );
}

/**
 * Announces a loading region to screen readers while showing `children` as the
 * visual placeholder. Skeletons themselves are `aria-hidden`, so without this
 * wrapper a loading view is silent to assistive tech.
 */
export function LoadingRegion({
  label = "Բեռնվում է...",
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
