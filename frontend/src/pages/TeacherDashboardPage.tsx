import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Inbox,
  Plus,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import * as teachingApi from "../api/teaching";
import type { DashboardSummary, StudentAttention, StudentRosterEntry } from "../api/teaching";
import { ActivityFeed } from "../components/teaching/ActivityFeed";
import { AssignmentPicker } from "../components/teaching/AssignmentPicker";
import { ClassLeaderboard } from "../components/teaching/ClassLeaderboard";
import { ClassTrendsPanel } from "../components/teaching/ClassTrendsPanel";
import { DashboardStatCards } from "../components/teaching/DashboardStatCards";
import { NeedsAttentionPanel } from "../components/teaching/NeedsAttentionPanel";
import { PendingReviewQueue } from "../components/teaching/PendingReviewQueue";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { WeakSpotsPanel } from "../components/teaching/WeakSpotsPanel";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { LoadingRegion, Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { TabPanel, Tabs, type TabItem } from "../components/ui/Tabs";

type TeacherTab = "overview" | "roster" | "leaderboard";

const TABS: TabItem<TeacherTab>[] = [
  { value: "overview", label: "Ակնարկ", icon: <BarChart3 size={15} strokeWidth={1.75} /> },
  { value: "roster", label: "Աշակերտներ", icon: <Users size={15} strokeWidth={1.75} /> },
  { value: "leaderboard", label: "Դասակարգում", icon: <Trophy size={15} strokeWidth={1.75} /> },
];

function StudentBox({ entry, onClick }: { entry: StudentRosterEntry; onClick: () => void }) {
  const { student, has_pending_review } = entry;
  const name = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.username;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      {has_pending_review && (
        <span
          title="Աշակերտն ուղարկել է առաջադրանք՝ սպասում է հաստատման"
          className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary"
        />
      )}
      <Avatar src={student.avatar} name={name} size="lg" />
      <span className="w-full truncate text-sm font-medium text-text">{name}</span>
      <span className="w-full truncate text-xs text-text-muted">@{student.username}</span>
    </button>
  );
}

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [roster, setRoster] = useState<StudentRosterEntry[] | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attention, setAttention] = useState<StudentAttention[] | null>(null);
  const [tab, setTab] = useState<TeacherTab>("overview");
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  function refreshRoster() {
    teachingApi.fetchStudentRoster().then(setRoster);
  }

  function refreshSummary() {
    teachingApi.fetchDashboardSummary().then(setSummary);
    teachingApi.fetchNeedsAttention().then(setAttention);
  }

  useEffect(() => {
    refreshRoster();
    refreshSummary();
  }, []);

  function handleTeachingClose() {
    setTeachingOpen(false);
    refreshRoster();
    refreshSummary();
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text">Ուսուցչի վահանակ</h1>
            <p className="mt-0.5 text-sm text-text-muted">
              Ձեր դասարանի վիճակը մեկ հայացքով
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<UserPlus size={16} strokeWidth={1.75} />}
              onClick={() => setTeachingOpen(true)}
            >
              Հրավիրել
            </Button>
            <Button
              size="sm"
              iconLeft={<Plus size={16} strokeWidth={1.75} />}
              onClick={() => setAssignOpen(true)}
              disabled={!roster || roster.length === 0}
            >
              Նոր առաջադրանք
            </Button>
          </div>
        </div>

        <Tabs items={TABS} value={tab} onChange={setTab} label="Վահանակի բաժիններ" className="mb-6">
          <TabPanel value="overview">
            <div className="flex flex-col gap-8">
              {summary ? (
                <DashboardStatCards stats={summary.stats} attentionCount={attention?.length ?? null} />
              ) : (
                <LoadingRegion className="grid gap-3 lg:grid-cols-3">
                  <Skeleton className="h-32" />
                  <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-[74px]" />
                    ))}
                  </div>
                </LoadingRegion>
              )}

              <section>
                <SectionHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Target size={18} strokeWidth={1.75} className="text-text-muted" />
                      Ուշադրության կարիք ունեն
                    </span>
                  }
                />
                {attention ? (
                  <NeedsAttentionPanel rows={attention} />
                ) : (
                  <LoadingRegion>
                    <SkeletonRows count={2} trailing={false} />
                  </LoadingRegion>
                )}
              </section>

              <section>
                <SectionHeader
                  title={
                    <span className="flex items-center gap-2">
                      <BarChart3 size={18} strokeWidth={1.75} className="text-text-muted" />
                      Դասարանի առաջընթաց
                    </span>
                  }
                />
                <ClassTrendsPanel />
              </section>

              <section>
                <SectionHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Inbox size={18} strokeWidth={1.75} className="text-text-muted" />
                      Ստուգման սպասող
                    </span>
                  }
                />
                {summary ? (
                  <PendingReviewQueue items={summary.pending_review} />
                ) : (
                  <LoadingRegion>
                    <SkeletonRows count={2} />
                  </LoadingRegion>
                )}
              </section>

              <div className="grid gap-8 lg:grid-cols-2">
                <section>
                  <SectionHeader
                    title={
                      <span className="flex items-center gap-2">
                        <Target size={18} strokeWidth={1.75} className="text-text-muted" />
                        Դասարանի թույլ կողմերը
                      </span>
                    }
                  />
                  {summary ? (
                    <WeakSpotsPanel spots={summary.weak_spots} />
                  ) : (
                    <LoadingRegion>
                      <SkeletonRows count={3} trailing={false} />
                    </LoadingRegion>
                  )}
                </section>

                <section>
                  <SectionHeader
                    title={
                      <span className="flex items-center gap-2">
                        <Activity size={18} strokeWidth={1.75} className="text-text-muted" />
                        Վերջին ակտիվությունը
                      </span>
                    }
                  />
                  {summary ? (
                    <ActivityFeed events={summary.activity_feed} />
                  ) : (
                    <LoadingRegion>
                      <SkeletonRows count={3} trailing={false} />
                    </LoadingRegion>
                  )}
                </section>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="roster">
            <SectionHeader title={`Աշակերտներ (${roster?.length ?? 0})`} />
            {!roster ? (
              <LoadingRegion className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </LoadingRegion>
            ) : roster.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {roster.map((entry) => (
                  <StudentBox
                    key={entry.student.id}
                    entry={entry}
                    onClick={() => navigate(`/profile/${entry.student.id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users size={26} strokeWidth={1.5} />}
                title="Դեռ կապակցված աշակերտներ չկան"
                hint="Հրավիրեք ձեր առաջին աշակերտին՝ նրա առաջընթացը տեսնելու համար։"
                cta={{ label: "Հրավիրել աշակերտ", onClick: () => setTeachingOpen(true) }}
              />
            )}
          </TabPanel>

          <TabPanel value="leaderboard">
            <SectionHeader title="Դասարանի դասակարգում (այս ամիս)" />
            <ClassLeaderboard onSelectStudent={(id) => navigate(`/profile/${id}`)} />
          </TabPanel>
        </Tabs>
      </div>

      <AssignmentPicker
        open={assignOpen}
        onOpenChange={setAssignOpen}
        roster={roster ?? []}
        onAssigned={refreshSummary}
      />

      {teachingOpen && (
        <TeachingModal role="teacher" onClose={handleTeachingClose} onChange={refreshRoster} />
      )}
    </div>
  );
}
