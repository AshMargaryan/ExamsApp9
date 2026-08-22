import { RotateCw, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

/*
  The fourth data state.

  Every async region in the app needs loading / empty / success / *error*, and
  the last one was the missing link — a failed fetch used to leave a skeleton
  shimmering forever with no way back. Mirrors EmptyState's shape so the two
  read as siblings, but carries a retry affordance instead of a create CTA.

  Keep `title` about what failed in the student's terms ("we couldn't load
  today's plan"), and let `hint` carry the reassurance. Never surface a raw
  exception string here.
*/

export function ErrorState({
  title = "Չհաջողվեց բեռնել տվյալները։",
  hint = "Սա սովորաբար ժամանակավոր խնդիր է։",
  retryLabel = "Փորձել կրկին",
  onRetry,
  size = "md",
  className,
}: {
  title?: string;
  hint?: string;
  retryLabel?: string;
  onRetry?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius)] border border-dashed text-center",
        "border-[color-mix(in_srgb,var(--color-incorrect)_35%,transparent)]",
        "bg-[color-mix(in_srgb,var(--color-incorrect)_6%,var(--color-surface))]",
        size === "sm" ? "p-4" : "p-6",
        className,
      )}
    >
      <p className="flex justify-center text-incorrect">
        <TriangleAlert size={size === "sm" ? 18 : 24} strokeWidth={1.75} />
      </p>
      <p className="mt-2 text-sm font-medium text-text">{title}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-3"
          iconLeft={<RotateCw size={14} strokeWidth={2} />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
