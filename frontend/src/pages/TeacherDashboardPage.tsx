import { useCallback, useState } from "react";
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
import { ErrorState } from "../components/ui/ErrorState";
import { Section } from "../components/ui/Section";
import { LoadingRegion, Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { TabPanel, Tabs, type TabItem } from "../components/ui/Tabs";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { cn } from "../lib/cn";

/*
  THE TEACHER'S VAHANAK

  This page had already been through a redesign and is structurally sound.
  Three things were still wrong.

  1. **Two of the five stat tiles restated a section on the same screen.**
     "Ուշադրության կարիք ունեն: 1" was a full-width hero tile whose own hint
     read "Տես ցանկը ներքևում" — and that list sat 150px below it. Likewise
     "Սպասում է հաստատման" counted the queue rendered further down. A number
     whose entire job is to label a list that is already visible is not a
     statistic; it is a heading. Both counts moved into their section
     headings, and the band is now the three figures that have no list on
     this page.

     That also thinned out a wall of zeros: on a real teacher account four of
     the five tiles read 0, which made the band look broken rather than calm.

  2. **Three unguarded `.then(setX)` calls.** Any failure left the whole
     dashboard on skeletons forever, with no error and no retry.

  3. `SectionHeader` — a `title` + `action` box with no description, no
     spacing control and no heading level — was used seven times here. The
     page is on `ui/Section` now, and `SectionHeader` is gone from the
     codebase.
*/

/** A count shown beside a section heading, so a number and the list it
 *  counts occupy one place instead of two. */
function CountBadge({ value, tone = "neutral" }: { value: number; tone?: "neutral" | "alert" }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-[var(--radius-full)] px-[var(--space-2)]",
        "text-[length:var(--text-xs)] font-semibold tabular-nums",
        tone === "alert" && value > 0
          ? "bg-incorrect-bg text-incorrect"
          : "bg-surface-muted text-text-muted",
      )}
    >
      {value}
    </span>
  );
}

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
  const [tab, setTab] = useState<TeacherTab>("overview");
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const rosterResource = useAsyncResource<StudentRosterEntry[]>(
    useCallback(() => teachingApi.fetchStudentRoster(), []),
  );
  const summaryResource = useAsyncResource<DashboardSummary>(
    useCallback(() => teachingApi.fetchDashboardSummary(), []),
  );
  const attentionResource = useAsyncResource<StudentAttention[]>(
    useCallback(() => teachingApi.fetchNeedsAttention(), []),
  );

  const roster = rosterResource.data;
  const summary = summaryResource.data;
  const attention = attentionResource.data;

  const refreshSummary = useCallback(() => {
    summaryResource.retry();
    attentionResource.retry();
  }, [summaryResource, attentionResource]);

  function handleTeachingClose() {
    setTeachingOpen(false);
    rosterResource.retry();
    refreshSummary();
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[length:var(--text-3xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-text">
              Ուսուցչի վահանակ
            </h1>
            <p className="mt-[var(--space-2)] text-[length:var(--text-base)] text-text-muted">
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
              {summaryResource.error !== null && attentionResource.error !== null ? (
                <ErrorState
                  title="Չհաջողվեց բեռնել վահանակը։"
                  hint="Ձեր աշակերտների ցանկը մնում է հասանելի «Աշակերտներ» բաժնում։"
                  onRetry={refreshSummary}
                />
              ) : summary ? (
                <DashboardStatCards stats={summary.stats} />
              ) : (
                <LoadingRegion className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-[74px]" />
                  ))}
                </LoadingRegion>
              )}

              <Section
                spacing="none"
                title={
                  <span className="flex items-center gap-2">
                    <Target size={18} strokeWidth={1.75} className="text-text-muted" />
                    Ուշադրության կարիք ունեն
                  </span>
                }
                description="Ում մոտ Gitus-ը խնդիր է նկատել, և ինչու"
                action={attention ? <CountBadge value={attention.length} tone="alert" /> : null}
              >
                {attentionResource.error !== null ? (
                  <ErrorState
                    size="sm"
                    title="Չհաջողվեց բեռնել ցանկը։"
                    onRetry={attentionResource.retry}
                  />
                ) : attention ? (
                  <NeedsAttentionPanel rows={attention} />
                ) : (
                  <LoadingRegion>
                    <SkeletonRows count={2} trailing={false} />
                  </LoadingRegion>
                )}
              </Section>

              <Section
                spacing="none"
                title={
                  <span className="flex items-center gap-2">
                    <BarChart3 size={18} strokeWidth={1.75} className="text-text-muted" />
                    Դասարանի առաջընթաց
                  </span>
                }
              >
                <ClassTrendsPanel />
              </Section>

              <Section
                spacing="none"
                title={
                  <span className="flex items-center gap-2">
                    <Inbox size={18} strokeWidth={1.75} className="text-text-muted" />
                    Ստուգման սպասող
                  </span>
                }
                description="Աշակերտների ուղարկած աշխատանքները"
                action={summary ? <CountBadge value={summary.pending_review.length} /> : null}
              >
                {summary ? (
                  <PendingReviewQueue items={summary.pending_review} />
                ) : (
                  <LoadingRegion>
                    <SkeletonRows count={2} />
                  </LoadingRegion>
                )}
              </Section>

              <div className="grid gap-8 lg:grid-cols-2">
                <Section
                  spacing="none"
                  level={3}
                  title={
                    <span className="flex items-center gap-2">
                      <Target size={18} strokeWidth={1.75} className="text-text-muted" />
                      Դասարանի թույլ կողմերը
                    </span>
                  }
                >
                  {summary ? (
                    <WeakSpotsPanel spots={summary.weak_spots} />
                  ) : (
                    <LoadingRegion>
                      <SkeletonRows count={3} trailing={false} />
                    </LoadingRegion>
                  )}
                </Section>

                <Section
                  spacing="none"
                  level={3}
                  title={
                    <span className="flex items-center gap-2">
                      <Activity size={18} strokeWidth={1.75} className="text-text-muted" />
                      Վերջին ակտիվությունը
                    </span>
                  }
                >
                  {summary ? (
                    <ActivityFeed events={summary.activity_feed} />
                  ) : (
                    <LoadingRegion>
                      <SkeletonRows count={3} trailing={false} />
                    </LoadingRegion>
                  )}
                </Section>
              </div>
            </div>
          </TabPanel>

          <TabPanel value="roster">
            <Section
              spacing="none"
              title="Աշակերտներ"
              action={roster ? <CountBadge value={roster.length} /> : null}
            >
            {rosterResource.error !== null ? (
              <ErrorState title="Չհաջողվեց բեռնել աշակերտների ցանկը։" onRetry={rosterResource.retry} />
            ) : !roster ? (
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
            </Section>
          </TabPanel>

          <TabPanel value="leaderboard">
            <Section spacing="none" title="Դասարանի դասակարգում" description="Այս ամսվա XP-ն ձեր աշակերտների միջև">
              <ClassLeaderboard onSelectStudent={(id) => navigate(`/profile/${id}`)} />
            </Section>
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
        <TeachingModal role="teacher" onClose={handleTeachingClose} onChange={rosterResource.retry} />
      )}
    </div>
  );
}
