import { Zap } from "lucide-react";
import type { AcademicPower } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";
import { ProfileCard } from "./ProfileCard";

const COMPONENT_LABELS: Record<string, string> = {
  accuracy: "Ճշգրտություն",
  consistency: "Կայունություն",
  difficulty: "Բարդություն",
  knowledge: "Գիտելիք",
  growth: "Աճ",
};

export function AcademicPowerCard({ power }: { power: AcademicPower }) {
  if (!power.available) {
    return (
      <ProfileCard icon={Zap} title="Ակադեմիական հզորություն">
        <EmptyState
          icon={<Zap size={22} strokeWidth={1.75} />}
          title="Սկսեք սովորել՝ ձեր ցուցանիշը հաշվարկելու համար"
        />
      </ProfileCard>
    );
  }

  return (
    <ProfileCard
      icon={Zap}
      title="Ակադեմիական հզորություն"
      description="Gitus-ի ներքին ցուցանիշ, ոչ պաշտոնական գնահատական"
    >
      <p className="font-display text-[length:var(--text-3xl)] font-semibold leading-[var(--leading-display)] text-text">
        {power.power} <span className="text-base font-normal text-text-muted">/ 1000</span>
      </p>
      <div className="mt-2">
        <ProgressBar percent={power.power / 10} heightClassName="h-2" />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {Object.entries(power.components).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-text-muted">{COMPONENT_LABELS[key] ?? key}</span>
              <span className="font-medium text-text">{Math.round(value)}</span>
            </div>
            <ProgressBar percent={value} />
          </div>
        ))}
      </div>
    </ProfileCard>
  );
}
