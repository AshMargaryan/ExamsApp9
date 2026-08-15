import type { ReactNode } from "react";
import { Building2, Globe, School, UserCheck, Users } from "lucide-react";
import type { SubjectKey } from "../../api/rankings";
import { SUBJECT_LABELS } from "../../api/rankings";

export type MainTab = "global" | "school" | "class" | "friends" | "schools";

const iconProps = { size: 14, strokeWidth: 1.75 };

const MAIN_TABS: { key: MainTab; label: string; icon: ReactNode }[] = [
  { key: "global", label: "Համադպրոցական", icon: <Globe {...iconProps} /> },
  { key: "school", label: "Իմ դպրոցը", icon: <School {...iconProps} /> },
  { key: "class", label: "Իմ դասարանը", icon: <Users {...iconProps} /> },
  { key: "friends", label: "Ընկերներ", icon: <UserCheck {...iconProps} /> },
  { key: "schools", label: "Դպրոցներ", icon: <Building2 {...iconProps} /> },
];

const SUBJECT_KEYS = Object.keys(SUBJECT_LABELS) as SubjectKey[];

function tabButtonClass(active: boolean) {
  return `flex shrink-0 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
    active ? "bg-primary text-primary-contrast" : "border border-border text-text-muted hover:bg-surface-muted"
  }`;
}

export function RankingTabs({
  active,
  onChange,
  activeSubject,
  onSubjectChange,
}: {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  activeSubject: SubjectKey | null;
  onSubjectChange: (subject: SubjectKey | null) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              onChange(tab.key);
              onSubjectChange(null);
            }}
            className={tabButtonClass(active === tab.key && activeSubject === null)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">Ըստ առարկայի</span>
        {SUBJECT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onSubjectChange(key)}
            className={tabButtonClass(activeSubject === key)}
          >
            {SUBJECT_LABELS[key]}
          </button>
        ))}
      </div>
    </div>
  );
}
