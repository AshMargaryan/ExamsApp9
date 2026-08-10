import type { ProfileCompletion } from "../../api/profile";
import { ProgressBar } from "../ui/ProgressBar";

export function ProfileCompletionCard({
  completion,
  onEdit,
}: {
  completion: ProfileCompletion;
  onEdit: () => void;
}) {
  if (completion.percent >= 100) return null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-text">✨ Լրացրեք պրոֆիլը</p>
        <span className="text-sm text-text-muted">{completion.percent}%</span>
      </div>
      <div className="mt-2">
        <ProgressBar percent={completion.percent} label="Պրոֆիլի լրացվածություն" />
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Մնացել է՝ {completion.missing.join(", ")}
      </p>
      <button type="button" onClick={onEdit} className="mt-3 text-sm font-medium text-primary hover:underline">
        Լրացնել հիմա →
      </button>
    </div>
  );
}
