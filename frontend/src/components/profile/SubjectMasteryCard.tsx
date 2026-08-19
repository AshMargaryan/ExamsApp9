import { useState } from "react";
import { Library } from "lucide-react";
import type { SubjectMastery } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";
import { DataCard } from "../ui/DataCard";
import { SkillMapDrilldown } from "./SkillMapDrilldown";

const SOURCE_LABELS: Record<string, string> = {
  practice: "Պարապանք",
  mock_exam: "Փորձնական քննություն",
  flashcards: "Ֆլեշքարտեր",
};

function TrendBadge({ trend }: { trend: SubjectMastery["trend"] }) {
  if (!trend) return null;
  const positive = trend.delta > 0;
  const flat = trend.delta === 0;
  return (
    <span className={`text-xs font-medium ${flat ? "text-text-muted" : positive ? "text-correct" : "text-incorrect"}`}>
      {flat ? "→" : positive ? "↑" : "↓"} {trend.delta > 0 ? "+" : ""}
      {trend.delta}%
    </span>
  );
}

export function SubjectMasteryCard({ subjects }: { subjects: SubjectMastery[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const withData = subjects.filter((s) => s.has_data);

  return (
    <DataCard
      icon={Library}
      title="Առարկաների տիրապետում"
      description="Բացեք առարկան՝ թեմա առ թեմա տեսնելու համար"
    >
      {withData.length === 0 ? (
        <EmptyState
          icon={<Library size={22} strokeWidth={1.75} />}
          title="Սկսեք սովորել՝ ձեր տիրապետումը հետևելու համար"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {withData.map((s) => {
            const isOpen = expanded === s.key;
            return (
              <div key={s.key} className="rounded-[var(--radius)] border border-border bg-bg p-3">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.key)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="text-sm font-medium text-text">{s.label}</span>
                  <span className="flex items-center gap-2">
                    <TrendBadge trend={s.trend} />
                    <span className="text-sm text-text-muted">{s.mastery}%</span>
                  </span>
                </button>
                <div className="mt-2">
                  <ProgressBar percent={s.mastery ?? 0} />
                </div>
                {Object.keys(s.sources).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                    {Object.entries(s.sources).map(([key, value]) => (
                      <span key={key}>
                        {SOURCE_LABELS[key] ?? key}՝ {value}%
                      </span>
                    ))}
                  </div>
                )}
                {isOpen && <SkillMapDrilldown subjectKey={s.key} />}
              </div>
            );
          })}
        </div>
      )}
    </DataCard>
  );
}
