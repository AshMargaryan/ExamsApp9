import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getTodayPlan,
  submitTaskCheckIn,
  type CheckInFeeling,
  type DailyStudyPlan,
  type StudyTask,
  type StudyTaskType,
} from "../api/studyPlan";
import { fetchHomeInsight, fetchProfile, type HomeInsight, type Profile } from "../api/profile";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { StatTile } from "../components/ui/StatTile";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { HaygitInsightCard } from "../components/HaygitInsightCard";

const TASK_ICON: Record<StudyTaskType, string> = {
  flashcard_review: "🗂️",
  practice_weak_topic: "📚",
  mistake_retry: "📓",
  mock_exam_retake: "📝",
};

const WEAKNESS_BAR_COLORS = ["bg-primary", "bg-purple", "bg-pink"];

const CHECK_IN_OPTIONS: { feeling: CheckInFeeling; icon: string; label: string }[] = [
  { feeling: "great", icon: "😄", label: "Հեշտ էր" },
  { feeling: "ok", icon: "🙂", label: "Նորմալ" },
  { feeling: "struggled", icon: "😓", label: "Դժվար էր" },
];

const CHECK_IN_LABEL: Record<CheckInFeeling, string> = {
  great: "😄 Նշեցիր՝ հեշտ էր",
  ok: "🙂 Նշեցիր՝ նորմալ էր",
  struggled: "😓 Նշեցիր՝ դժվար էր",
};

function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}ժ ${rest}ր` : `${hours}ժ`;
  }
  return `${minutes} ր`;
}

type TaskStatus = "completed" | "active" | "upcoming";

function taskStatuses(tasks: StudyTask[]): TaskStatus[] {
  const firstNotDone = tasks.findIndex((t) => !t.done);
  return tasks.map((t, i) => {
    if (t.done) return "completed";
    if (i === firstNotDone) return "active";
    return "upcoming";
  });
}

function TaskRow({
  task,
  status,
  onCheckIn,
}: {
  task: StudyTask;
  status: TaskStatus;
  onCheckIn: (taskId: number, feeling: CheckInFeeling) => void;
}) {
  const navigate = useNavigate();

  const style = {
    completed: {
      bg: "linear-gradient(226deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-bg)), color-mix(in srgb, var(--color-purple) 10%, var(--color-bg)), color-mix(in srgb, var(--color-pink) 10%, var(--color-bg)))",
      border: "color-mix(in srgb, var(--color-purple) 30%, transparent)",
      icon: "var(--gradient-hero)",
      iconColor: "#fff",
      textColor: "var(--color-purple)",
      label: "✓ Ավարտված",
    },
    active: {
      bg: "linear-gradient(226deg, color-mix(in srgb, var(--color-primary) 16%, var(--color-bg)), color-mix(in srgb, var(--color-purple) 16%, var(--color-bg)), color-mix(in srgb, var(--color-pink) 16%, var(--color-bg)))",
      border: "color-mix(in srgb, var(--color-purple) 45%, transparent)",
      icon: "var(--gradient-hero)",
      iconColor: "#fff",
      textColor: "var(--color-purple)",
      label: "● Ընթացիկ",
    },
    upcoming: {
      bg: "var(--color-surface-muted)",
      border: "var(--color-border)",
      icon: "transparent",
      iconColor: "var(--color-text-muted)",
      textColor: "var(--color-text-muted)",
      label: task.progress ? `○ ${task.progress}` : "○ Հաջորդը",
    },
  }[status];

  const clickableWhenNotActive = status !== "active";

  return (
    <div
      role={clickableWhenNotActive ? "button" : undefined}
      tabIndex={clickableWhenNotActive ? 0 : undefined}
      onClick={clickableWhenNotActive ? () => navigate(task.link_path) : undefined}
      onKeyDown={
        clickableWhenNotActive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(task.link_path);
              }
            }
          : undefined
      }
      className={`rounded-[var(--radius)] border p-5 transition-colors duration-[var(--motion-normal)] ${
        clickableWhenNotActive ? "cursor-pointer hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : ""
      }`}
      style={{ background: style.bg, borderColor: style.border }}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${status === "active" ? "animate-pulse" : ""}`}
          style={{ background: style.icon, color: style.iconColor }}
        >
          {status === "completed" ? "✓" : status === "active" ? "●" : "○"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-text-muted">{TASK_ICON[task.task_type]}</span>
            <span className="text-base font-bold text-text">{task.title}</span>
          </div>
          <div className="text-[13px] text-text-muted">
            {task.subject_name}
            {task.topic_label && ` · ${task.topic_label}`} · ~{task.estimated_minutes} րոպե
          </div>
          {status !== "active" && task.blurb && (
            <div className="mt-1.5 text-[13px] leading-relaxed text-text-muted">🤖 {task.blurb}</div>
          )}
        </div>
        <div className="shrink-0 text-[13px] font-semibold" style={{ color: style.textColor }}>
          {style.label}
        </div>
        {clickableWhenNotActive && (
          <div className="shrink-0 text-text-muted" aria-hidden>→</div>
        )}
      </div>

      {status === "active" && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: "color-mix(in srgb, var(--color-purple) 20%, transparent)" }}>
          {task.blurb && (
            <div className="mb-4 rounded-[var(--radius)] bg-bg p-3.5 text-sm leading-relaxed">
              <p className="mb-1 font-bold text-text">🤖 Ինչու՞ հենց սա</p>
              <p className="text-text-muted">{task.blurb}</p>
            </div>
          )}
          <Button onClick={() => navigate(task.link_path)}>▶ Սկսել</Button>
        </div>
      )}

      {status === "completed" && (
        <div
          className="mt-4 border-t pt-4"
          style={{ borderColor: "color-mix(in srgb, var(--color-purple) 20%, transparent)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {task.check_in_feeling ? (
            <p className="text-[13px] text-text-muted">
              {CHECK_IN_LABEL[task.check_in_feeling]} — շնորհակալ ենք արձագանքի համար, հաշվի ենք առնում վաղվա պլանում։
            </p>
          ) : (
            <div>
              <p className="mb-2 text-[13px] font-medium text-text">Ինչպե՞ս անցավ այս առաջադրանքը</p>
              <div className="flex gap-2">
                {CHECK_IN_OPTIONS.map((opt) => (
                  <button
                    key={opt.feeling}
                    type="button"
                    onClick={() => onCheckIn(task.id, opt.feeling)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:border-primary"
                  >
                    <span aria-hidden>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StudyPlanPage() {
  const [plan, setPlan] = useState<DailyStudyPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insight, setInsight] = useState<HomeInsight | null>(null);
  const [summaryDismissed, setSummaryDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getTodayPlan(), fetchProfile(), fetchHomeInsight()]).then(
      ([planData, profileData, insightData]) => {
        setPlan(planData);
        setProfile(profileData);
        setInsight(insightData);
      },
    );
  }, []);

  if (!plan || !profile || !insight) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-2/3 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          <div className="h-40 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  async function handleCheckIn(taskId: number, feeling: CheckInFeeling) {
    setPlan((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, check_in_feeling: feeling } : t)) } : prev,
    );
    try {
      await submitTaskCheckIn(taskId, feeling);
    } catch {
      setPlan((prev) =>
        prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, check_in_feeling: null } : t)) } : prev,
      );
    }
  }

  const { coach } = plan;
  const statuses = taskStatuses(plan.tasks);
  const missionHref =
    insight.next_mission.available && insight.next_mission.cta.type === "practice_subtopic"
      ? `/practice/subtopic/${insight.next_mission.cta.subtopic_id}/${insight.next_mission.cta.tier}`
      : "/mock-exams";
  const donePct = plan.tasks.length ? (coach.today.done_count / coach.today.total_count) * 100 : 0;
  const hasGoal = Boolean(profile.university || profile.target_major || profile.target_exam_date);
  const applicationYear = profile.target_exam_date ? new Date(profile.target_exam_date).getFullYear() : null;
  const allDone = plan.tasks.length > 0 && coach.today.done_count === coach.today.total_count;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="mb-2 text-3xl font-semibold text-text sm:text-4xl">
            Բարի վերադարձ, {profile.first_name || profile.username}
          </h1>
          <p className="text-lg leading-relaxed text-text-muted">{plan.headline}</p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-3">
          {profile.streak && (
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
              style={{ background: "color-mix(in srgb, var(--color-primary) 14%, var(--color-bg))", color: "var(--color-primary)" }}
            >
              🔥 {profile.streak.current_streak} օր
            </div>
          )}
          {profile.days_until_exam !== null ? (
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
              style={{ background: "color-mix(in srgb, var(--color-purple) 14%, var(--color-bg))", color: "var(--color-purple)" }}
            >
              ⏳ {profile.days_until_exam} օր մինչև քննություն
            </div>
          ) : (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2.5 text-sm font-semibold text-text-muted hover:border-primary hover:text-primary"
            >
              Սահմանել քննության ամսաթիվը
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1.65fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-2xl font-semibold text-text">🎯 Այսօրվա պլանը</h2>
              <Badge tone={coach.today.priority === "high" ? "primary" : "neutral"}>
                Առաջնահերթություն. {coach.today.priority === "high" ? "Բարձր" : "Կանոնավոր"}
              </Badge>
            </div>

            {plan.tasks.length === 0 ? (
              <EmptyState
                icon="🎉"
                title="Դեռ բավարար տվյալներ չկան անհատական պլան կազմելու համար"
                hint="Փորձիր լուծել մի քանի վարժություն, և պլանը կհայտնվի հաջորդ անգամ։"
              />
            ) : (
              <>
                <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-[var(--radius)] bg-surface-muted px-4 py-4">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted">ԸՆԴԱՄԵՆԸ ԺԱՄԱՆԱԿ</p>
                    <p className="text-lg font-bold text-text">{formatMinutes(coach.today.minutes_total)}</p>
                  </div>
                  <div className="rounded-[var(--radius)] bg-surface-muted px-4 py-4">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted">ԱԿՆԿԱԼՎՈՂ ԱՐԴՅՈՒՆՔ</p>
                    <p className="text-sm font-semibold leading-snug text-text">{coach.today.expected_result}</p>
                  </div>
                  <div className="rounded-[var(--radius)] bg-surface-muted px-4 py-4">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted">ԿԱՐԳԱՎԻՃԱԿ</p>
                    <p className="text-lg font-bold text-text">
                      {coach.today.done_count} / {coach.today.total_count}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {plan.tasks.map((task, i) => (
                    <TaskRow key={task.id} task={task} status={statuses[i]} onCheckIn={handleCheckIn} />
                  ))}
                </div>
              </>
            )}
          </Card>

          {plan.tasks.length > 0 && (
            <Card className="p-6 sm:p-7">
              <h3 className="mb-4 text-lg font-semibold text-text">Այսօրվա առաջընթացը</h3>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
                role="progressbar"
                aria-valuenow={Math.round(donePct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Այսօրվա առաջընթաց"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, donePct))}%`, background: "var(--gradient-hero)" }}
                />
              </div>
              <div className="mb-6 mt-2 flex justify-between text-sm text-text-muted">
                <span>
                  {coach.today.done_count} / {coach.today.total_count} առաջադրանք
                </span>
                <span>
                  {formatMinutes(coach.today.minutes_done)} / {formatMinutes(coach.today.minutes_total)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold text-text">{coach.today.accuracy}%</p>
                  <p className="text-xs text-text-muted">Ճշտություն</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text">{coach.today.questions}</p>
                  <p className="text-xs text-text-muted">Հարցեր</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{coach.today.correct}</p>
                  <p className="text-xs text-text-muted">Ճիշտ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-pink">{coach.today.mistakes}</p>
                  <p className="text-xs text-text-muted">Սխալ</p>
                </div>
              </div>
            </Card>
          )}

          {insight.coach.available && (
            <Card className="p-6 sm:p-7">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="text-lg text-incorrect" aria-hidden>⚠️</span>
                <h3 className="text-lg font-semibold text-text">Սխալների օրինաչափություն</h3>
              </div>
              <p className="mb-1.5 text-[15px] leading-relaxed text-text-muted">
                {insight.coach.evidence.incorrect_count} անգամ սխալվել ես «{insight.coach.evidence.topic}» թեմայում։
              </p>
              <p className="mb-4 text-sm text-text-muted">
                Այս սխալները կազմում են քո վերջին սխալների {insight.coach.evidence.mistake_share_percent}%-ը։
              </p>
              <Button variant="secondary" onClick={() => navigate(missionHref)}>
                Կիրառել այս օրինաչափությունը
              </Button>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <HaygitInsightCard coach={insight.coach} mission={insight.next_mission} personalizedMessage={plan.coach_message} />

          <Card className="p-6">
            <h3 className="mb-3 text-lg font-semibold text-text">Քո նպատակը</h3>
            {hasGoal ? (
              <>
                <div className="mb-3.5 flex flex-col gap-2.5 text-[14.5px]">
                  {profile.target_major && (
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted">Մասնագիտություն</span>
                      <span className="text-right font-semibold text-text">{profile.target_major}</span>
                    </div>
                  )}
                  {profile.university && (
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted">Համալսարան</span>
                      <span className="text-right font-semibold text-text">{profile.university.name}</span>
                    </div>
                  )}
                  {applicationYear && (
                    <div className="flex justify-between gap-3">
                      <span className="text-text-muted">Ընդունելության տարի</span>
                      <span className="text-right font-semibold text-text">{applicationYear}</span>
                    </div>
                  )}
                </div>
                <p className="text-[13.5px] leading-relaxed text-text-muted">
                  Այս շաբաթվա պլանը կառուցված է այս նպատակին համապատասխան։
                </p>
              </>
            ) : (
              <EmptyState
                icon="🎯"
                title="Սահմանիր քո նպատակային բուհը"
                hint="Այդպես պլանը կհարմարեցվի հենց քո նպատակին։"
                cta={{ label: "Սահմանել նպատակ", onClick: () => navigate("/profile") }}
              />
            )}
          </Card>

          {coach.strategy && (
            <Card className="p-6">
              <h3 className="mb-3 text-lg font-semibold text-text">Քննության ռազմավարություն</h3>
              <p className="mb-4 text-[14.5px] leading-relaxed text-text-muted">
                Քննությանը մնացել է {coach.strategy.days_left} օր։ Այս շաբաթ սովորել ես{" "}
                {coach.strategy.current_pace_days} օր, ինչը{" "}
                {coach.strategy.is_behind ? "բավարար չէ" : "լավ տեմպ է"}, եթե ցանկանում ես հասցնել բոլոր
                թույլ թեմաները։
              </p>
              <div className="flex justify-between gap-3 rounded-[var(--radius)] bg-surface-muted px-4 py-3.5 text-sm">
                <div>
                  <p className="mb-1 text-xs text-text-muted">ԱՌԱՋԱՐԿՎՈՂ ՌԵԺԻՄ</p>
                  <p className="font-bold text-text">{coach.strategy.recommended_days_per_week} օր / շաբաթ</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-text-muted">ՏԵՎՈՂՈՒԹՅՈՒՆ</p>
                  <p className="font-bold text-text">{coach.strategy.recommended_minutes_per_day} րոպե / օր</p>
                </div>
              </div>
            </Card>
          )}

          {coach.weakness.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-text">Ուժեղ և թույլ կողմեր</h3>
              {coach.weakness.map((w, i) => (
                <div key={w.label} className="mb-3.5 last:mb-0">
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-text">{w.label}</span>
                    <span className="text-text-muted">{w.pct}%</span>
                  </div>
                  <ProgressBar percent={w.pct} heightClassName="h-2" colorClassName={WEAKNESS_BAR_COLORS[i % WEAKNESS_BAR_COLORS.length]} />
                </div>
              ))}
            </Card>
          )}

          {coach.review && (
            <Card className="p-6">
              <div className="mb-3.5 flex items-center gap-2.5">
                <span aria-hidden>⏱️</span>
                <h3 className="text-lg font-semibold text-text">Ժամանակն է վերանայել</h3>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] bg-surface-muted px-4 py-3.5">
                <div className="min-w-0">
                  <p className="mb-0.5 truncate text-[14.5px] font-semibold text-text">{coach.review.topic_label}</p>
                  <p className="text-xs text-text-muted">Վերջին սխալ. {coach.review.days_since} օր առաջ</p>
                </div>
                {coach.review.link_path && (
                  <Button variant="secondary" size="sm" onClick={() => navigate(coach.review!.link_path!)}>
                    Վերանայել
                  </Button>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-text">📈 Այս շաբաթ</h3>
            <div className="mb-4 grid grid-cols-2 gap-3.5">
              <div>
                <p className="text-xl font-bold text-text">{coach.week.days_studied} / 7</p>
                <p className="text-xs text-text-muted">Ուսումնական օրեր</p>
              </div>
              <div>
                <p className="text-xl font-bold text-text">{formatMinutes(coach.week.minutes)}</p>
                <p className="text-xs text-text-muted">Ուսումնական ժամանակ</p>
              </div>
              <div>
                <p className="text-xl font-bold text-text">{coach.week.questions}</p>
                <p className="text-xs text-text-muted">Հարցեր</p>
              </div>
              <div>
                <p className="text-xl font-bold text-text">{coach.week.accuracy !== null ? `${coach.week.accuracy}%` : "—"}</p>
                <p className="text-xs text-text-muted">Ճշտություն</p>
              </div>
            </div>
            <p className="text-[13.5px] leading-relaxed text-text-muted">
              {coach.weekly_report ? coach.weekly_report.text : coach.week.narrative}
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={allDone && !summaryDismissed}
        onOpenChange={(open) => !open && setSummaryDismissed(true)}
        title="🎉 Այսօրվա պլանը ավարտված է"
        footer={
          <Button className="w-full" onClick={() => setSummaryDismissed(true)}>
            Փակել
          </Button>
        }
      >
        <div className="mb-2 grid grid-cols-2 gap-3">
          <StatTile label="Ժամանակ" value={formatMinutes(coach.today.minutes_done)} />
          <StatTile label="Հարցեր" value={String(coach.today.questions)} />
          <StatTile label="Ճիշտ" value={String(coach.today.correct)} />
          <StatTile label="Ճշտություն" value={`${coach.today.accuracy}%`} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Հիանալի աշխատանք էր։ Վաղը կշարունակենք հենց այնտեղից, որտեղ կանգ առար։
        </p>
      </Modal>
    </div>
  );
}
