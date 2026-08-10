import { useEffect, useState } from "react";
import * as profileApi from "../../api/profile";
import type { TimelineEntry } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";

type Filter = "all" | "study_day" | "achievement" | "ranking_award";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Բոլորը",
  study_day: "Ուսումնական",
  achievement: "Նվաճումներ",
  ranking_award: "Դասակարգում",
};

function EntryRow({ entry }: { entry: TimelineEntry }) {
  if (entry.type === "achievement") {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-xl">{entry.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text">{entry.title}</p>
          <p className="text-xs text-text-muted">{entry.date}</p>
        </div>
        <span className="text-xs font-medium text-primary">+{entry.xp_reward} XP</span>
      </div>
    );
  }
  if (entry.type === "ranking_award") {
    return (
      <div className="flex items-center gap-3 py-2">
        <span className="text-xl">🏅</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text">{entry.title}</p>
          <p className="text-xs text-text-muted">{entry.date}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-xl">📚</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">
          {entry.minutes} րոպե ուսումնառություն
          {entry.questions_solved > 0 && ` · ${entry.questions_solved} հարց (${entry.correct_answers} ճիշտ)`}
          {entry.tests_completed > 0 && ` · ${entry.tests_completed} թեստ`}
        </p>
        <p className="text-xs text-text-muted">{entry.date}</p>
      </div>
    </div>
  );
}

export function ActivityTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    profileApi.fetchTimeline().then(setEntries);
  }, []);

  const filtered = entries?.filter((e) => filter === "all" || e.type === filter) ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-3 text-sm font-semibold text-text">🕓 Վերջին ակտիվություն</p>

      <div className="mb-2 flex flex-wrap gap-1">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              filter === f ? "border-primary text-primary" : "border-border text-text-muted"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {entries === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}

      {entries !== null && filtered.length === 0 && (
        <EmptyState icon="📚" title="Ձեր ճամփորդությունն սկսվում է այստեղ" hint="Ավարտեք ձեր առաջին ուսումնական պարապմունքը։" />
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {filtered.map((entry, i) => (
            <EntryRow key={`${entry.type}-${entry.date}-${i}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
