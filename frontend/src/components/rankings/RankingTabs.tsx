import type { ReactNode } from "react";
import { Building2, Globe, School, UserCheck, Users } from "lucide-react";
import type { SubjectKey } from "../../api/rankings";
import { SUBJECT_LABELS } from "../../api/rankings";
import { cn } from "../../lib/cn";

/*
  Which leaderboard am I looking at.

  This used to be two rows presenting one choice as if it were two.
  A main row (Համադպրոցական / Իմ դպրոցը / Իմ դասարանը / Ընկերներ / Դպրոցներ)
  and, beneath it, "Ըստ առարկայի" with five subject buttons — but the subject
  boards are not a filter *across* the main scopes, they are five more
  scopes, and picking one silently un-highlighted the main row. So the
  student saw a control with nothing selected in it, and no way to tell that
  the two rows were mutually exclusive rather than combined.

  It is one row now, with the subject scopes after a divider. One selection,
  one highlight, and `aria-checked` so it is announced as a choice rather
  than as five buttons that happen to change colour.
*/

export type MainTab = "global" | "school" | "class" | "friends" | "schools";

/** A subject scope is encoded in the same value space as the main scopes, so
 *  the page holds one selection instead of two that can disagree. */
export type RankingScopeKey = MainTab | `subject:${SubjectKey}`;

export function isSubjectScope(scope: RankingScopeKey): scope is `subject:${SubjectKey}` {
  return scope.startsWith("subject:");
}

export function subjectOf(scope: RankingScopeKey): SubjectKey | null {
  return isSubjectScope(scope) ? (scope.slice("subject:".length) as SubjectKey) : null;
}

const iconProps = { size: 14, strokeWidth: 1.75 };

const MAIN_TABS: { key: MainTab; label: string; icon: ReactNode }[] = [
  { key: "global", label: "Համադպրոցական", icon: <Globe {...iconProps} /> },
  { key: "school", label: "Իմ դպրոցը", icon: <School {...iconProps} /> },
  { key: "class", label: "Իմ դասարանը", icon: <Users {...iconProps} /> },
  { key: "friends", label: "Ընկերներ", icon: <UserCheck {...iconProps} /> },
  { key: "schools", label: "Դպրոցներ", icon: <Building2 {...iconProps} /> },
];

const SUBJECT_KEYS = Object.keys(SUBJECT_LABELS) as SubjectKey[];

const ALL_SCOPES: { key: RankingScopeKey; label: string; icon?: ReactNode }[] = [
  ...MAIN_TABS,
  ...SUBJECT_KEYS.map((key) => ({ key: `subject:${key}` as RankingScopeKey, label: SUBJECT_LABELS[key] })),
];

function chipClass(active: boolean) {
  return cn(
    "flex shrink-0 items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border",
    "px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] whitespace-nowrap",
    "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
    active
      ? "border-primary bg-primary-bg font-semibold text-primary"
      : "border-border font-medium text-text-muted hover:border-primary-line hover:text-text",
  );
}

export function RankingTabs({
  scope,
  onScopeChange,
  className,
}: {
  scope: RankingScopeKey;
  onScopeChange: (scope: RankingScopeKey) => void;
  className?: string;
}) {
  function move(delta: number) {
    const index = ALL_SCOPES.findIndex((s) => s.key === scope);
    if (index === -1) return;
    onScopeChange(ALL_SCOPES[(index + delta + ALL_SCOPES.length) % ALL_SCOPES.length].key);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Դասակարգման տեսակ"
      className={cn("-mx-4 overflow-x-auto px-4 no-scrollbar", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      <div className="flex w-max items-center gap-[var(--space-2)] pb-1">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="radio"
            aria-checked={scope === tab.key}
            tabIndex={scope === tab.key ? 0 : -1}
            onClick={() => onScopeChange(tab.key)}
            className={chipClass(scope === tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}

        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />
        <span className="shrink-0 text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
          Ըստ առարկայի
        </span>

        {SUBJECT_KEYS.map((key) => {
          const value: RankingScopeKey = `subject:${key}`;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={scope === value}
              tabIndex={scope === value ? 0 : -1}
              onClick={() => onScopeChange(value)}
              className={chipClass(scope === value)}
            >
              {SUBJECT_LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
