import { useEffect, useState } from "react";
import { Award, History, TrendingUp } from "lucide-react";
import * as profileApi from "../api/profile";
import type { PersonalRecords, PrivacySettings } from "../api/profile";
import * as rankingsApi from "../api/rankings";
import type { RankingAward, RankingBoard, RankHistoryPoint, SchoolComparisonBoard, SubjectKey } from "../api/rankings";
import { useAuth } from "../auth/AuthContext";
import { PersonalRecordsCard } from "../components/rankings/PersonalRecordsCard";
import { Podium } from "../components/rankings/Podium";
import { RankBadge } from "../components/rankings/RankBadge";
import { RankingList } from "../components/rankings/RankingList";
import type { MainTab } from "../components/rankings/RankingTabs";
import { RankingTabs } from "../components/rankings/RankingTabs";
import { RankProgressChart } from "../components/rankings/RankProgressChart";
import { SeasonHeader } from "../components/rankings/SeasonHeader";
import { SeasonHistoryList } from "../components/rankings/SeasonHistoryList";
import { StickyOwnRow } from "../components/rankings/StickyOwnRow";
import { YourPositionCard } from "../components/rankings/YourPositionCard";
import { LinkButton } from "../components/ui/LinkButton";

function SidePanelSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
      {children}
    </div>
  );
}

function SchoolComparisonList({ board, mySchoolId }: { board: SchoolComparisonBoard; mySchoolId: number | undefined }) {
  if (board.results.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center text-text-muted">
        Այս ամիս դեռ ոչ մի դպրոց միավոր չի վաստակել։
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      {board.results.map((entry) => {
        const isMySchool = entry.school.id === mySchoolId;
        const avgXp = Math.round(entry.total_xp / entry.student_count);
        return (
          <div
            key={entry.school.id}
            className={`grid grid-cols-[1.75rem_2rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 ${
              isMySchool ? "bg-primary/10" : ""
            }`}
          >
            <RankBadge rank={entry.rank} size="sm" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm text-text-muted">
              🏫
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {entry.school.name}
                {isMySchool && <span className="ml-1 text-xs text-primary">(Ձեր դպրոցը)</span>}
              </p>
              <p className="truncate text-xs text-text-muted">
                {entry.school.marz || "—"} · {entry.student_count} սովորող · միջինը {avgXp} XP
              </p>
            </div>
            <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-text">{entry.total_xp} XP</p>
          </div>
        );
      })}
    </div>
  );
}

export function RankingsPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<MainTab>("global");
  const [activeSubject, setActiveSubject] = useState<SubjectKey | null>(null);

  const [global, setGlobal] = useState<RankingBoard | null>(null);
  const [school, setSchool] = useState<RankingBoard | null>(null);
  const [classBoard, setClassBoard] = useState<RankingBoard | null>(null);
  const [friends, setFriends] = useState<RankingBoard | null>(null);
  const [schools, setSchools] = useState<SchoolComparisonBoard | null>(null);
  const [subjectBoards, setSubjectBoards] = useState<Partial<Record<SubjectKey, RankingBoard>>>({});

  const [rankHistory, setRankHistory] = useState<RankHistoryPoint[] | null>(null);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecords | null>(null);
  const [awards, setAwards] = useState<RankingAward[] | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fail = () => setError("Չհաջողվեց բեռնել դասակարգումը։");
    rankingsApi.fetchGlobalRanking().then(setGlobal).catch(fail);
    rankingsApi.fetchSchoolRanking().then(setSchool).catch(fail);
    rankingsApi.fetchClassRanking().then(setClassBoard).catch(fail);
    rankingsApi.fetchFriendsRanking().then(setFriends).catch(fail);
    rankingsApi.fetchSchoolComparison().then(setSchools).catch(fail);
    rankingsApi.fetchRankHistory("global").then(setRankHistory).catch(fail);
    rankingsApi.fetchMyRankingAwards().then(setAwards).catch(fail);
    profileApi.fetchAnalytics().then((a) => setPersonalRecords(a.personal_records)).catch(fail);
    profileApi.fetchPrivacySettings().then(setPrivacy).catch(fail);
  }, []);

  useEffect(() => {
    if (!activeSubject || subjectBoards[activeSubject]) return;
    rankingsApi
      .fetchSubjectRanking(activeSubject)
      .then((board) => setSubjectBoards((prev) => ({ ...prev, [activeSubject]: board })))
      .catch(() => setError("Չհաջողվեց բեռնել դասակարգումը։"));
  }, [activeSubject, subjectBoards]);

  const board = activeSubject
    ? subjectBoards[activeSubject] ?? null
    : mainTab === "global"
      ? global
      : mainTab === "school"
        ? school
        : mainTab === "class"
          ? classBoard
          : mainTab === "friends"
            ? friends
            : null;

  const top3 = board?.results.filter((e) => e.rank <= 3) ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-bg px-4 py-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <SeasonHeader
          monthLabel={board?.month_label ?? schools?.month_label ?? ""}
          year={board?.year ?? schools?.year ?? new Date().getFullYear()}
          month={board?.month ?? schools?.month ?? new Date().getMonth() + 1}
        />
        <LinkButton to="/" className="mt-1 shrink-0">← Գլխավոր</LinkButton>
      </div>

      {mainTab !== "schools" && board && (
        <div className="mb-6 overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          <YourPositionCard board={board} meId={user?.id} hidden={privacy ? !privacy.show_on_leaderboard : false} />
          <Podium top3={top3} meId={user?.id} />
          <RankingList board={board} meId={user?.id} />
        </div>
      )}

      <RankingTabs
        active={mainTab}
        onChange={setMainTab}
        activeSubject={activeSubject}
        onSubjectChange={setActiveSubject}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {mainTab === "schools" && !activeSubject ? (
            schools ? (
              <SchoolComparisonList board={schools} mySchoolId={user?.school?.id} />
            ) : (
              <p className="text-text-muted">Բեռնվում է...</p>
            )
          ) : board ? (
            <StickyOwnRow board={board} meId={user?.id} />
          ) : (
            <p className="text-text-muted">Բեռնվում է...</p>
          )}

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <p className="mt-6 text-center text-xs text-text-muted">
            🥇🥈🥉 Ամսվա վերջում թոփ 3 սովորողները ստանում են մեդալ և կոչում իրենց պրոֆիլում։
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <SidePanelSection title={<><TrendingUp size={13} strokeWidth={1.75} /> Սեզոնի առաջընթաց</>}>
            <RankProgressChart points={rankHistory ?? []} />
          </SidePanelSection>

          <SidePanelSection title={<><Award size={13} strokeWidth={1.75} /> Անձնական ռեկորդներ</>}>
            {personalRecords ? (
              <PersonalRecordsCard records={personalRecords} />
            ) : (
              <p className="text-sm text-text-muted">Բեռնվում է...</p>
            )}
          </SidePanelSection>

          <SidePanelSection title={<><History size={13} strokeWidth={1.75} /> Սեզոնների պատմություն</>}>
            {awards ? <SeasonHistoryList awards={awards} /> : <p className="text-sm text-text-muted">Բեռնվում է...</p>}
          </SidePanelSection>
        </div>
      </div>
    </div>
  );
}
