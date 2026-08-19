import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarDays, Circle, ClipboardCheck,
  Flame, HelpCircle, Layers, ListTodo, Sparkles, Target, TrendingUp, Trophy,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import * as profileApi from "../api/profile";
import type { HomeInsight, Profile } from "../api/profile";
import * as streaksApi from "../api/streaks";
import type { LearningStreak } from "../api/streaks";
import {
  getRecommendedExercises, getWeeklyProgress, TIER_LABELS,
  type RecommendedSubtopic, type WeeklyProgressPoint,
} from "../api/practice";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";
import { DailyProblemCard } from "../components/DailyProblemCard";
import { TodayMissionHero } from "../components/TodayMissionHero";
import { HaygitInsightCard } from "../components/HaygitInsightCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatTile } from "../components/ui/StatTile";
import { LinkButton } from "../components/ui/LinkButton";

function ExamCountdown({ profile, onUpdated }: { profile: Profile; onUpdated: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(profile.target_exam_date ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    try {
      const updated = await profileApi.setExamDate(date);
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!profile.target_exam_date || editing) {
    return (
      <Card>
        <p className="text-sm font-medium text-text">🎯 Երբ է ձեր ընդունելության քննությունը?</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !date}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "..." : "Հաստատել"}
          </button>
          {profile.target_exam_date && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted"
            >
              Չեղարկել
            </button>
          )}
        </div>
      </Card>
    );
  }

  const days = profile.days_until_exam ?? 0;
  const label = days > 0 ? `${days} օր մնացել է` : days === 0 ? "Քննությունը այսօր է" : "Քննությունն անցել է";
  const goal = [profile.target_major, profile.school?.name].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-5 text-left transition-colors hover:border-primary"
    >
      <span className="text-2xl">🎯</span>
      <span className="flex-1">
        <span className="block text-lg font-semibold text-text">{label}</span>
        <span className="block text-xs text-text-muted">
          {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { year: "numeric", month: "long", day: "numeric" })}
        </span>
        {goal && (
          <span className="mt-1 flex items-center gap-1 text-xs text-text-muted">
            <Target size={12} strokeWidth={1.75} /> {goal}
          </span>
        )}
      </span>
      <span className="text-xs text-primary">Փոխել ✎</span>
    </button>
  );
}

const quickActionIconProps = { size: 22, strokeWidth: 1.75 };

const QUICK_ACTIONS = [
  { label: "AI Օգնական", href: "/assistant", icon: <Sparkles {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))", fg: "var(--color-primary)" },
  { label: "Իմ խնդիրները", href: "/todo", icon: <ListTodo {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-accent) 16%, var(--color-surface))", fg: "var(--color-accent)" },
  { label: "Թեստեր", href: "/mock-exams", icon: <ClipboardCheck {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-purple) 14%, var(--color-surface))", fg: "var(--color-purple)" },
  { label: "Պարապել", href: "/practice", icon: <BookOpen {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-pink) 16%, var(--color-surface))", fg: "var(--color-pink)" },
  { label: "Բառաքարտեր", href: "/flashcards", icon: <Layers {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))", fg: "var(--color-primary)" },
  { label: "Վարկանիշներ", href: "/rankings", icon: <Trophy {...quickActionIconProps} />, bg: "color-mix(in srgb, var(--color-accent) 16%, var(--color-surface))", fg: "var(--color-accent)" },
];

function priorityTag(mistakeCount: number | null): { emoji: ReactNode; label: string; tone: "neutral" | "primary" | "incorrect" } {
  if (mistakeCount === null) return { emoji: <Circle size={12} strokeWidth={1.75} />, label: "Նոր", tone: "neutral" };
  if (mistakeCount >= 5) return { emoji: <AlertTriangle size={12} strokeWidth={1.75} />, label: "Աշխատիր սրա վրա", tone: "incorrect" };
  return { emoji: <ArrowRight size={12} strokeWidth={1.75} />, label: "Հաջորդը", tone: "primary" };
}

function RecommendedExerciseCard({ item }: { item: RecommendedSubtopic }) {
  const priority = priorityTag(item.mistake_count);
  return (
    <Link
      to={`/practice/subtopic/${item.subtopic_id}/${item.suggested_tier}`}
      state={{ subtopicName: item.subtopic_name }}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-muted">
          {item.subject_name} · {item.domain_name} · {item.topic_name}
        </p>
        <Badge tone={priority.tone}>
          {priority.emoji} {priority.label}
        </Badge>
      </div>
      <p className="font-medium text-text">{item.subtopic_name}</p>
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {item.mistake_count === null
            ? "Դեռ չսկսված"
            : `Սխալների քանակ՝ ${item.mistake_count}`}
        </span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-primary">
          {TIER_LABELS[item.suggested_tier]}
        </span>
      </div>
    </Link>
  );
}

/** Built from real fields only — never a generic motivational quote. */
function greetingSubtext(insight: HomeInsight | null, profile: Profile): string | null {
  if (insight?.coach.available && insight.coach.situation) return insight.coach.situation;
  if (insight?.next_mission.available) return insight.next_mission.reason;
  if (profile.days_until_exam != null && profile.days_until_exam > 0) {
    return `Ձեր քննությանը մնացել է ${profile.days_until_exam} օր։ Այսօրվա փոքր քայլը կարևոր է։`;
  }
  return null;
}

export function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [recommended, setRecommended] = useState<RecommendedSubtopic[] | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressPoint[] | null>(null);
  const [insight, setInsight] = useState<HomeInsight | null>(null);

  useEffect(() => {
    profileApi.fetchProfile().then(setProfile);
    streaksApi.fetchStreak().then(setStreak);
    getRecommendedExercises().then(setRecommended);
    getWeeklyProgress().then(setWeeklyProgress);
    profileApi.fetchHomeInsight().then(setInsight);
  }, []);

  // Parent accounts land on the family dashboard, not the student practice
  // home — this only matters for direct nav/bookmarks, since login/register
  // already route parents to /family. Placed after the hooks above so hook
  // order never changes between renders.
  if (user?.role === "parent") {
    return <Navigate to="/family" replace />;
  }

  // Teachers land straight on the full dashboard — there's no separate
  // "teacher home" content to show first, so a lighter placeholder here
  // would just be an extra click in front of what they actually want.
  if (user?.role === "teacher") {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  const xpPercent =
    profile && profile.xp_for_next_level > 0
      ? Math.min(100, Math.round((profile.xp_into_level / profile.xp_for_next_level) * 100))
      : 100;
  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";
  const firstRecommendedHref = recommended && recommended.length > 0
    ? `/practice/subtopic/${recommended[0].subtopic_id}/${recommended[0].suggested_tier}`
    : "/practice";
  const weeklyStudyHours = profile?.stats ? profile.stats.weekly_study_seconds / 3600 : 0;

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-text sm:text-3xl">
            Բարի վերադարձ{fullName ? `, ${fullName.split(" ")[0]}` : ""}
          </h1>
          {profile && (
            <p className="mt-1 text-sm text-text-muted">
              {[
                `@${profile.username}`,
                profile.grade ? `${profile.grade}-րդ դասարան` : null,
                profile.school?.name,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        {!profile ? (
          <p className="text-text-muted">Բեռնվում է...</p>
        ) : (
          <>
            {/* Greeting subtext */}
            {greetingSubtext(insight, profile) && (
              <p className="mt-3 mb-1 text-sm text-text-muted">{greetingSubtext(insight, profile)}</p>
            )}

            {/* Stat pills */}
            <div className="mt-3 mb-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 rounded-full bg-surface px-4 py-2.5">
                <Flame size={18} strokeWidth={1.75} />
                <span className="text-sm text-text">
                  <strong>{streak?.current_streak ?? 0} օրյա</strong> շարք
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-surface px-4 py-2.5">
                <span className="text-sm text-text">
                  <strong>Level {profile.level}</strong>
                </span>
                <span className="h-1.5 w-[70px] overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${xpPercent}%`, background: "var(--gradient-hero)" }}
                  />
                </span>
                <span className="text-xs text-text-muted">
                  {profile.xp_into_level}/{profile.xp_for_next_level} XP
                </span>
              </div>
              {profile.target_exam_date && (
                <div className="flex items-center gap-2.5 rounded-full bg-surface px-4 py-2.5">
                  <CalendarDays size={18} strokeWidth={1.75} />
                  <span className="text-sm text-text">
                    <strong>{Math.max(profile.days_until_exam ?? 0, 0)} օր</strong> մինչև քննությունը ·{" "}
                    {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { month: "long", day: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            {/* Today's Study Mission — hero */}
            <div className="grid grid-cols-1 gap-6">
              <TodayMissionHero insight={insight} streak={streak} />
            </div>

            {/* Daily Problem */}
            <div className="mt-6">
              <DailyProblemCard nextHref={firstRecommendedHref} />
            </div>

            {/* Haygit Insight + escape hatch */}
            {insight && (
              <div className="mt-6">
                <HaygitInsightCard coach={insight.coach} mission={insight.next_mission} />
                <div className="mt-2 flex flex-col items-center gap-1.5 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <HelpCircle size={13} strokeWidth={1.75} /> Չգիտե՞ս ինչ սովորել։
                  </span>
                  <LinkButton to={firstRecommendedHref}>Ցույց տուր ինչ անել →</LinkButton>
                </div>
              </div>
            )}

            {/* Recommended exercises */}
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-text">Առաջարկվող վարժություններ</h2>
              {recommended === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {recommended?.length === 0 && (
                <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
                  Հիանալի է! Դուք յուրացրել եք բոլոր հասանելի թեմաները։
                </div>
              )}
              {recommended && recommended.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.map((item) => (
                    <RecommendedExerciseCard key={item.subtopic_id} item={item} />
                  ))}
                </div>
              )}
            </section>

            {/* Exam countdown */}
            <div className="mt-6">
              <ExamCountdown profile={profile} onUpdated={setProfile} />
            </div>

            {/* Weekly progress + stats */}
            <section className="mt-6 rounded-[calc(var(--radius)*1.15)] border border-border bg-surface p-6 sm:p-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-lg font-semibold text-text">
                  <TrendingUp size={18} strokeWidth={1.75} /> Քո առաջընթացը
                </h2>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-accent" /> Ճիշտ
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-border" /> Ընդհանուր
                  </span>
                </div>
              </div>
              {weeklyProgress ? (
                <WeeklyProgressChart points={weeklyProgress} />
              ) : (
                <p className="text-sm text-text-muted">Բեռնվում է...</p>
              )}
              <div className={`mt-4 grid gap-3 border-t border-border pt-4 ${weeklyStudyHours > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
                <StatTile label="Ճշգրտություն" value={`${profile.stats?.accuracy_percentage ?? 0}%`} />
                <StatTile label="Ավարտված թեստ" value={`${profile.stats?.tests_completed ?? 0}`} />
                {weeklyStudyHours > 0 && (
                  <StatTile label="Այս շաբաթ" value={`${weeklyStudyHours.toFixed(1)} ժ`} />
                )}
              </div>
            </section>

            {insight && !insight.checklist.all_complete && (
              <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-text-muted">
                <Flame size={13} strokeWidth={1.75} /> Մի կոտրիր շարքը՝ ավարտիր այսօրվա պարապմունքը
              </p>
            )}

            {/* Quick actions */}
            <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {QUICK_ACTIONS.map((qa) => (
                <Link
                  key={qa.href}
                  to={qa.href}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                    style={{ background: qa.bg, color: qa.fg }}
                  >
                    {qa.icon}
                  </span>
                  <span className="text-sm font-semibold text-text">{qa.label}</span>
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
