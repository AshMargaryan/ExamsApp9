import { useCallback, useState } from "react";
import { Award, BookOpen, History, Medal } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { TimelineEntry } from "../../api/profile";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { FilterChips } from "../ui/FilterChips";
import { SkeletonRows } from "../ui/Skeleton";
import { DataCard } from "../ui/DataCard";

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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-primary-bg text-primary">
          <Award size={16} strokeWidth={2} aria-hidden="true" />
        </span>
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
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-accent-bg text-accent">
          <Medal size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-text">{entry.title}</p>
          <p className="text-xs text-text-muted">{entry.date}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-surface-muted text-text-muted">
        <BookOpen size={16} strokeWidth={2} aria-hidden="true" />
      </span>
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
  const [filter, setFilter] = useState<Filter>("all");
  // Was a bare `.then(setEntries)` with no catch and no cleanup: a failed
  // request left this card reading "Բեռնվում է..." forever.
  const timeline = useAsyncResource<TimelineEntry[]>(useCallback(() => profileApi.fetchTimeline(), []));
  const entries = timeline.data;

  const filtered = entries?.filter((e) => filter === "all" || e.type === filter) ?? [];

  return (
    <DataCard icon={History} title="Վերջին ակտիվություն">
      <FilterChips
        label="Ակտիվության զտիչ"
        size="sm"
        className="mb-[var(--space-4)]"
        options={(Object.keys(FILTER_LABELS) as Filter[]).map((f) => ({ value: f, label: FILTER_LABELS[f] }))}
        value={filter}
        onChange={setFilter}
      />

      {timeline.isLoading && <SkeletonRows count={4} />}

      {timeline.error !== null && !timeline.isLoading && (
        <ErrorState
          size="sm"
          title="Չհաջողվեց բեռնել ակտիվությունը։"
          onRetry={timeline.retry}
        />
      )}

      {entries !== null && timeline.error === null && filtered.length === 0 && (
        <EmptyState
          icon={<BookOpen size={22} strokeWidth={1.75} />}
          title={filter === "all" ? "Քո ճամփորդությունն սկսվում է այստեղ" : "Այս զտիչով գրառումներ չկան"}
          hint={
            filter === "all"
              ? "Ավարտիր քո առաջին ուսումնական պարապմունքը։"
              : "Փոխիր զտիչը՝ մնացած գրառումները տեսնելու համար։"
          }
          size="sm"
        />
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {filtered.map((entry, i) => (
            <EntryRow key={`${entry.type}-${entry.date}-${i}`} entry={entry} />
          ))}
        </div>
      )}
    </DataCard>
  );
}
