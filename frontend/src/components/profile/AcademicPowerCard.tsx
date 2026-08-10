import type { AcademicPower } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";

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
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-text">⚡ Ակադեմիական հզորություն</p>
        <EmptyState icon="⚡" title="Սկսեք սովորել՝ ձեր ցուցանիշը հաշվարկելու համար" />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 text-sm font-semibold text-text">⚡ Ակադեմիական հզորություն</p>
      <p className="mb-3 text-xs text-text-muted">Gitus-ի ներքին ցուցանիշ, ոչ պաշտոնական գնահատական</p>

      <p className="text-3xl font-bold text-text">
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
    </div>
  );
}
