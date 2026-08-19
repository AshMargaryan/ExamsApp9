import { Sparkles } from "lucide-react";
import type { ProfileCompletion } from "../../api/profile";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { ProfileCard } from "./ProfileCard";

export function ProfileCompletionCard({
  completion,
  onEdit,
}: {
  completion: ProfileCompletion;
  onEdit: () => void;
}) {
  if (completion.percent >= 100) return null;

  return (
    <ProfileCard
      icon={Sparkles}
      title="Լրացրեք պրոֆիլը"
      description={`Մնացել է՝ ${completion.missing.join(", ")}`}
      action={<span className="text-[length:var(--text-sm)] font-semibold tabular-nums text-text">{completion.percent}%</span>}
    >
      <ProgressBar percent={completion.percent} label="Պրոֆիլի լրացվածություն" />
      <Button variant="secondary" size="sm" onClick={onEdit} className="mt-[var(--space-4)]">
        Լրացնել հիմա →
      </Button>
    </ProfileCard>
  );
}
