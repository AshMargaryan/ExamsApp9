import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as streaksApi from "../api/streaks";
import type { LearningStreak } from "../api/streaks";
import {
  getRecommendedExercises, getWeeklyProgress, TIER_LABELS,
  type RecommendedSubtopic, type WeeklyProgressPoint,
} from "../api/practice";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";
import { DailyProblemCard } from "../components/DailyProblemCard";
import { useAssignmentNotifications } from "../hooks/useAssignmentNotifications";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";

const NAV_LINKS = [
  { to: "/practice", icon: "📚", label: "Պարապել" },
  { to: "/mock-exams", icon: "📝", label: "Ամբողջական թեստեր" },
  { to: "/flashcards", icon: "🗂️", label: "Բառաքարտեր" },
  { to: "/assistant", icon: "🤖", label: "AI Օգնական" },
  { to: "/rankings", icon: "🏆", label: "Դասակարգում" },
  { to: "/games", icon: "🎮", label: "Խաղասենյակներ" },
];

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
      <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-4">
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
      </div>
    );
  }

  const days = profile.days_until_exam ?? 0;
  const label = days > 0 ? `${days} օր մնացել է` : days === 0 ? "Քննությունը այսօր է" : "Քննությունն անցել է";

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center justify-between rounded-[var(--radius)] border border-primary bg-surface-muted px-4 py-3 text-left transition-colors hover:border-primary-hover"
    >
      <span className="flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        <span>
          <span className="block text-lg font-semibold text-text">{label}</span>
          <span className="block text-xs text-text-muted">
            {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </span>
      </span>
      <span className="text-xs text-primary">Փոխել ✎</span>
    </button>
  );
}

function RecommendedExerciseCard({ item }: { item: RecommendedSubtopic }) {
  return (
    <Link
      to={`/practice/subtopic/${item.subtopic_id}/${item.suggested_tier}`}
      state={{ subtopicName: item.subtopic_name }}
      className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-primary"
    >
      <p className="text-xs text-text-muted">
        {item.subject_name} · {item.domain_name} · {item.topic_name}
      </p>
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

function ChatNavTile() {
  const unreadChatCount = useChatUnreadCount();
  return (
    <Link
      to="/chat"
      className="relative flex flex-col items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
    >
      <span className="text-2xl">💬</span>
      <span className="text-xs font-medium text-text">Հաղորդագրություններ</span>
      {unreadChatCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
          {unreadChatCount > 99 ? "99+" : unreadChatCount}
        </span>
      )}
    </Link>
  );
}

function AssignmentsNavTile({ hasUnseen }: { hasUnseen: boolean }) {
  return (
    <Link
      to="/student-dashboard"
      className="relative flex flex-col items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
    >
      <span className="text-2xl">📋</span>
      <span className="text-xs font-medium text-text">Առաջադրանքներ</span>
      {hasUnseen && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-incorrect" />}
    </Link>
  );
}

function TeacherHomePage({ user, logout }: { user: { username: string }; logout: () => void }) {
  const notifications = useAssignmentNotifications();
  const hasUnseenAssignments = (notifications?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4">
      <div className="absolute right-4 top-4 flex items-center gap-3 text-sm text-text-muted">
        <Link to="/profile" className="text-primary hover:underline">
          {user.username}
        </Link>
        <button onClick={logout} className="text-primary hover:underline">
          Ելք
        </button>
      </div>

      <h1 className="text-3xl font-semibold text-text">Բարի գալուստ</h1>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/teacher-dashboard"
          className="relative rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          🧑‍🏫 Ուսուցչի վահանակ
          {hasUnseenAssignments && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-incorrect" />
          )}
        </Link>
        <Link
          to="/chat"
          className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          💬 Հաղորդագրություններ
        </Link>
        <Link
          to="/profile"
          className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          👤 Իմ պրոֆիլը
        </Link>
      </div>
    </div>
  );
}

export function HomePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [recommended, setRecommended] = useState<RecommendedSubtopic[] | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressPoint[] | null>(null);
  const assignmentNotifications = useAssignmentNotifications();
  const hasUnseenAssignments = (assignmentNotifications?.length ?? 0) > 0;

  useEffect(() => {
    profileApi.fetchProfile().then(setProfile);
    streaksApi.fetchStreak().then(setStreak);
    getRecommendedExercises().then(setRecommended);
    getWeeklyProgress().then(setWeeklyProgress);
  }, []);

  // Parent accounts land on the family dashboard, not the student practice
  // home — this only matters for direct nav/bookmarks, since login/register
  // already route parents to /family. Placed after the hooks above so hook
  // order never changes between renders.
  if (user?.role === "parent") {
    return <Navigate to="/family" replace />;
  }

  if (user?.role === "teacher") {
    return <TeacherHomePage user={user} logout={logout} />;
  }

  const xpPercent =
    profile && profile.xp_for_next_level > 0
      ? Math.min(100, Math.round((profile.xp_into_level / profile.xp_for_next_level) * 100))
      : 100;
  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">
            Բարի գալուստ{fullName ? `, ${fullName.split(" ")[0]}` : ""}
          </h1>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <Link to="/profile" className="text-primary hover:underline">
              {user?.username}
            </Link>
            <button onClick={logout} className="text-primary hover:underline">
              Ելք
            </button>
          </div>
        </div>

        {!profile ? (
          <p className="text-text-muted">Բեռնվում է...</p>
        ) : (
          <>
            {/* Profile overview */}
            <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-2xl font-semibold text-text-muted">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                    ) : (
                      (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text">{fullName || profile.username}</p>
                    <p className="text-sm text-text-muted">
                      {[profile.grade ? `${profile.grade}-րդ դասարան` : null, profile.school?.name]
                        .filter(Boolean)
                        .join(" · ") || "Ավելացրեք ձեր դպրոցը"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-text">🔥 {streak?.current_streak ?? "..."}</p>
                    <p className="text-xs text-text-muted">օրյա շարք</p>
                  </div>
                  <div className="min-w-32 text-center">
                    <p className="text-2xl font-semibold text-text">{profile.level}</p>
                    <p className="text-xs text-text-muted">
                      Մակարդակ · {profile.xp_into_level}/{profile.xp_for_next_level} XP
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${xpPercent}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <ExamCountdown profile={profile} onUpdated={setProfile} />
              </div>
            </section>

            {/* Progress + Daily problem */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-[var(--radius)] border border-border bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text">Առաջընթաց ըստ շաբաթների</h2>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-accent" /> Ճիշտ
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" /> Ընդհանուր
                    </span>
                  </div>
                </div>
                {weeklyProgress ? (
                  <WeeklyProgressChart points={weeklyProgress} />
                ) : (
                  <p className="text-sm text-text-muted">Բեռնվում է...</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div className="text-center">
                    <p className="text-xl font-semibold text-text">{profile.stats.accuracy_percentage}%</p>
                    <p className="text-xs text-text-muted">Ճշգրտություն</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-text">{profile.stats.tests_completed}</p>
                    <p className="text-xs text-text-muted">Ավարտված թեստեր</p>
                  </div>
                </div>
              </section>

              <DailyProblemCard />
            </div>

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

            {/* Quick nav */}
            <section className="mt-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex flex-col items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
                  >
                    <span className="text-2xl">{link.icon}</span>
                    <span className="text-xs font-medium text-text">{link.label}</span>
                  </Link>
                ))}
                <AssignmentsNavTile hasUnseen={hasUnseenAssignments} />
                <ChatNavTile />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
