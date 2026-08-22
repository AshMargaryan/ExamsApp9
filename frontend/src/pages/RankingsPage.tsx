import { useCallback, useEffect, useState } from "react";
import { Award, Building2, History, TrendingUp } from "lucide-react";
import * as profileApi from "../api/profile";
import type { PersonalRecords, PrivacySettings } from "../api/profile";
import * as rankingsApi from "../api/rankings";
import type { RankingAward, RankingBoard, RankHistoryPoint, SchoolComparisonBoard } from "../api/rankings";
import { useAuth } from "../auth/AuthContext";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { PersonalRecordsCard } from "../components/rankings/PersonalRecordsCard";
import { Podium } from "../components/rankings/Podium";
import { RankBadge } from "../components/ui/RankBadge";
import { RankingList } from "../components/rankings/RankingList";
import {
  RankingTabs,
  subjectOf,
  type MainTab,
  type RankingScopeKey,
} from "../components/rankings/RankingTabs";
import { RankProgressChart } from "../components/rankings/RankProgressChart";
import { SeasonHeader } from "../components/rankings/SeasonHeader";
import { SeasonHistoryList } from "../components/rankings/SeasonHistoryList";
import { StickyOwnRow } from "../components/rankings/StickyOwnRow";
import { YourPositionCard } from "../components/rankings/YourPositionCard";
import { DataCard } from "../components/ui/DataCard";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { SkeletonRows, SkeletonText } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

/*
  THE LEADERBOARD

  The control came after the thing it controlled. Reading order was:
  season header → your position → podium → the whole top-50 list → **the
  tabs that choose which list that was** → the sticky "my row" → a footnote.
  A student wanting "Իմ դասարանը" had to scroll past an entire leaderboard
  they had not asked for to find the switch, then scroll back up to read the
  result. When the "Դպրոցներ" tab was active the board block was skipped
  entirely, so the page's layout order changed depending on the tab —
  the one thing a tab strip must never do.

  The scope selector is now the first thing under the title, and the board
  follows it.

  The other structural problem was that scope was two pieces of state
  pretending to be one control — see RankingTabs.

  And every one of the nine reads shared a single `error` string with no
  retry, so a failed season-history call printed "Չհաջողվեց բեռնել
  դասակարգումը։" under a leaderboard that had loaded perfectly.
*/

function SchoolComparisonList({ board, mySchoolId }: { board: SchoolComparisonBoard; mySchoolId: number | undefined }) {
  if (board.results.length === 0) {
    return (
      <EmptyState
        icon={<Building2 size={24} strokeWidth={1.75} />}
        title="Այս ամիս դեռ ոչ մի դպրոց միավոր չի վաստակել"
        hint="Առաջին իսկ լուծված հարցից հետո քո դպրոցը կհայտնվի այստեղ։"
      />
    );
  }

  return (
    <ul className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      {board.results.map((entry) => {
        const isMySchool = entry.school.id === mySchoolId;
        const avgXp = Math.round(entry.total_xp / entry.student_count);
        return (
          <li
            key={entry.school.id}
            className={cn(
              "grid grid-cols-[1.75rem_2rem_1fr_auto] items-center gap-[var(--space-3)]",
              "border-b border-border px-[var(--space-4)] py-[var(--space-3)] last:border-b-0",
              isMySchool && "bg-primary-bg",
            )}
          >
            <RankBadge rank={entry.rank} size="sm" />
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-surface-muted text-text-muted"
            >
              <Building2 size={14} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[length:var(--text-sm)] font-medium text-text">
                {entry.school.name}
                {isMySchool && (
                  <span className="ml-1 text-[length:var(--text-xs)] font-semibold text-primary">(Քո դպրոցը)</span>
                )}
              </p>
              <p className="truncate text-[length:var(--text-xs)] text-text-muted">
                {entry.school.marz || "—"} · {entry.student_count} սովորող · միջինը {avgXp} XP
              </p>
            </div>
            <p className="shrink-0 font-mono text-[length:var(--text-sm)] font-bold tabular-nums text-text">
              {entry.total_xp} XP
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const MAIN_FETCHERS: Record<MainTab, () => Promise<RankingBoard | null>> = {
  global: rankingsApi.fetchGlobalRanking,
  school: rankingsApi.fetchSchoolRanking,
  class: rankingsApi.fetchClassRanking,
  friends: rankingsApi.fetchFriendsRanking,
  schools: () => Promise.resolve(null),
};

export function RankingsPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScopeKey>("global");
  const subject = subjectOf(scope);
  const isSchoolsView = scope === "schools";

  // One resource per view, keyed on the scope: switching tabs re-fetches the
  // board you actually asked for, and a failure is scoped to that board
  // rather than to a page-wide error string.
  const boardResource = useAsyncResource<RankingBoard | null>(
    useCallback(
      () => (subject ? rankingsApi.fetchSubjectRanking(subject) : MAIN_FETCHERS[scope as MainTab]()),
      [scope, subject],
    ),
    [scope],
  );
  const schoolsResource = useAsyncResource<SchoolComparisonBoard | null>(
    useCallback(() => (isSchoolsView ? rankingsApi.fetchSchoolComparison() : Promise.resolve(null)), [isSchoolsView]),
    [isSchoolsView],
  );

  const board = boardResource.data;
  const schools = schoolsResource.data;

  /*
    The boards themselves are useful to any role — a teacher watching their
    class, for instance — but "your position", "your records" and "your season
    history" only mean something for a student who competes on them. For
    everyone else they'd be three permanently empty cards, so they aren't
    rendered and their requests are never made.
  */
  const isCompetitor = user?.role === "student";

  const [rankHistory, setRankHistory] = useState<RankHistoryPoint[] | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecords | null>(null);
  const [awards, setAwards] = useState<RankingAward[] | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [sideFailed, setSideFailed] = useState(false);

  const loadSidePanel = useCallback(() => {
    if (!isCompetitor) return;
    setSideFailed(false);
    Promise.allSettled([
      rankingsApi.fetchRankHistory("global"),
      rankingsApi.fetchMyRankingAwards(),
      profileApi.fetchAnalytics(),
      profileApi.fetchPrivacySettings(),
    ]).then(([history, myAwards, analytics, privacySettings]) => {
      if (history.status === "fulfilled") setRankHistory(history.value);
      if (myAwards.status === "fulfilled") setAwards(myAwards.value);
      if (analytics.status === "fulfilled") setPersonalRecords(analytics.value.personal_records);
      if (privacySettings.status === "fulfilled") setPrivacy(privacySettings.value);
      setSideFailed([history, myAwards, analytics, privacySettings].every((r) => r.status === "rejected"));
    });
  }, [isCompetitor]);

  useEffect(loadSidePanel, [loadSidePanel]);

  const top3 = board?.results.filter((e) => e.rank <= 3) ?? [];
  const activeResource = isSchoolsView ? schoolsResource : boardResource;

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-bg px-4 py-8">
      <div className="mb-[var(--space-4)] flex flex-wrap items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0 flex-1">
          <SeasonHeader
            monthLabel={board?.month_label ?? schools?.month_label ?? ""}
            year={board?.year ?? schools?.year ?? new Date().getFullYear()}
            month={board?.month ?? schools?.month ?? new Date().getMonth() + 1}
          />
        </div>
        {/* The back link was `shrink-0` beside a heading that could not
            shrink, so at 375px it hung off the right edge of the document. */}
        <LinkButton to="/" className="mt-1 shrink-0">
          ← Գլխավոր
        </LinkButton>
      </div>

      {/* The switch comes before the thing it switches. */}
      <RankingTabs scope={scope} onScopeChange={setScope} className="mb-[var(--space-5)]" />

      <div className={cn("grid gap-[var(--space-6)]", isCompetitor && "lg:grid-cols-[1fr_320px]")}>
        <div className="min-w-0">
          {activeResource.isLoading ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-[var(--space-5)]">
              <SkeletonRows count={6} />
            </div>
          ) : activeResource.error !== null ? (
            <ErrorState
              title="Չհաջողվեց բեռնել այս դասակարգումը։"
              hint="Մյուս դասակարգումները մնում են հասանելի։"
              onRetry={activeResource.retry}
            />
          ) : isSchoolsView ? (
            schools && <SchoolComparisonList board={schools} mySchoolId={user?.school?.id} />
          ) : (
            board && (
              <>
                <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
                  {isCompetitor && (
                    <YourPositionCard
                      board={board}
                      meId={user?.id}
                      hidden={privacy ? !privacy.show_on_leaderboard : false}
                    />
                  )}
                  <Podium top3={top3} meId={user?.id} />
                  <RankingList board={board} meId={user?.id} />
                </div>
                <StickyOwnRow board={board} meId={user?.id} />
              </>
            )
          )}

          <p className="mt-[var(--space-6)] flex items-center justify-center gap-[var(--space-2)] text-center text-[length:var(--text-xs)] text-text-muted">
            <Award size={14} strokeWidth={1.75} aria-hidden="true" />
            Ամսվա վերջում թոփ 3 սովորողները ստանում են մեդալ և կոչում իրենց պրոֆիլում։
          </p>
        </div>

        {isCompetitor && (
          <div className="flex min-w-0 flex-col gap-[var(--space-5)]">
            {sideFailed ? (
              <ErrorState size="sm" title="Չհաջողվեց բեռնել քո վիճակագրությունը։" onRetry={loadSidePanel} />
            ) : (
              <>
                <DataCard icon={TrendingUp} title="Սեզոնի առաջընթաց">
                  {rankHistory ? <RankProgressChart points={rankHistory} /> : <SkeletonText lines={4} />}
                </DataCard>

                <DataCard icon={Award} title="Անձնական ռեկորդներ">
                  {personalRecords ? <PersonalRecordsCard records={personalRecords} /> : <SkeletonText lines={4} />}
                </DataCard>

                <DataCard icon={History} title="Սեզոնների պատմություն">
                  {awards ? <SeasonHistoryList awards={awards} /> : <SkeletonText lines={3} />}
                </DataCard>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
