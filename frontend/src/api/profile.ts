import { apiClient } from "./client";
import type { AccountRole, School, University } from "./auth";
import type { FriendUser } from "./friends";

export interface LearningStats {
  questions_solved: number;
  correct_answers: number;
  accuracy_percentage: number;
  tests_completed: number;
  total_learning_time_seconds: number | null;
  weekly_study_seconds: number;
}

export interface ProfileCompletion {
  percent: number;
  completed: string[];
  missing: string[];
}

export interface Profile {
  avatar: string | null;
  bio: string;
  role: AccountRole;
  username: string;
  first_name: string;
  last_name: string;
  school: School | null;
  grade: number | null;
  age: number | null;
  marz: string;
  university: University | null;
  target_major: string;
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  trophies_count: number;
  target_exam_date: string | null;
  days_until_exam: number | null;
  username_change_available_at: string;
  stats: LearningStats | null;
  streak: { current_streak: number; longest_streak: number; last_activity_date: string | null } | null;
  profile_completion: ProfileCompletion;
  showcase_achievements: UserAchievement[];
  total_students: number | null;
  students: FriendUser[] | null;
  avg_student_accuracy_improvement: number | null;
  avg_student_test_improvement: number | null;
  teachers: FriendUser[] | null;
  updated_at: string;
}

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

export interface UserAchievement {
  id: number;
  achievement: Achievement;
  unlocked_at: string;
}

export interface UpdateProfilePayload {
  bio?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  grade?: number | null;
  age?: number | null;
  school_id?: number | null;
  university_id?: number | null;
  avatar?: File;
  target_exam_date?: string | null;
  target_major?: string;
}

export async function setExamDate(date: string): Promise<Profile> {
  const { data } = await apiClient.patch("/profile/me/", { target_exam_date: date });
  return data;
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await apiClient.get("/profile/me/");
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (value === null) {
      form.append(key, "");
    } else {
      form.append(key, value as string | Blob);
    }
  }
  const { data } = await apiClient.patch("/profile/me/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchAchievements(): Promise<Achievement[]> {
  const { data } = await apiClient.get("/profile/achievements/");
  return data;
}

export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const { data } = await apiClient.get("/profile/achievements/mine/");
  return data;
}

export async function fetchUserProfile(userId: number): Promise<Profile> {
  const { data } = await apiClient.get(`/profile/${userId}/`);
  return data;
}

export async function fetchUserAchievements(userId: number): Promise<UserAchievement[]> {
  const { data } = await apiClient.get(`/profile/${userId}/achievements/`);
  return data;
}

// ---------------------------------------------------------------------------
// Analytics — subject mastery, Learning DNA, Academic Power, personal
// records, growth, AI coach, next mission. All derived from real rows on the
// backend; "locked" shapes mean not enough data yet, never a fake number.
// ---------------------------------------------------------------------------

export interface LockedMetric {
  locked: true;
  current: number;
  needed: number;
  reason: string;
}

export interface UnlockedMetric {
  locked?: false;
  value: number;
  basis: string;
  provisional?: boolean;
}

export type DnaMetric = LockedMetric | UnlockedMetric;

export interface SubjectMastery {
  key: string;
  label: string;
  mastery: number | null;
  sources: Record<string, number>;
  difficulty_handling: number | null;
  trend: { recent: number; prior: number; delta: number } | null;
  has_data: boolean;
}

export interface SkillMapTopic {
  id: number;
  name: string;
  domain: string;
  mastery: number | null;
  attempts: number;
}

export interface SkillMap {
  available: boolean;
  reason?: string;
  topics?: SkillMapTopic[];
}

export interface LearningDna {
  accuracy: DnaMetric;
  consistency: DnaMetric;
  difficulty_tolerance: DnaMetric;
  memory_retention: DnaMetric;
  exam_readiness: DnaMetric;
}

export type AcademicPower =
  | { available: false }
  | { available: true; power: number; components: Record<string, number> };

export interface PersonalRecords {
  highest_test_score: number | null;
  longest_streak_days: number | null;
  most_questions_in_a_day: number | null;
  longest_study_session_seconds: number | null;
  best_month_xp: number | null;
  best_rank_ever: number | null;
}

export interface PeriodStats {
  questions: number;
  accuracy: number | null;
  tests: number;
  study_seconds: number;
}

export interface Growth {
  this_month: PeriodStats;
  previous_month: PeriodStats;
  accuracy_delta: number | null;
  questions_delta: number;
  study_seconds_delta: number;
  tests_delta: number;
  has_enough_data: boolean;
}

export type Coach =
  | { available: false; reason: string }
  | {
      available: true;
      situation: string | null;
      weakness: string;
      opportunity: string;
      recommendation: string;
      evidence: {
        topic: string;
        incorrect_count: number;
        mistake_share_percent: number;
        accuracy_delta: number | null;
        last_incorrect_at: string | null;
      };
    };

export type NextMission =
  | { available: false; reason: string }
  | {
      available: true;
      title: string;
      question_count: number | null;
      estimated_minutes: number | null;
      potential_xp: number | null;
      reason: string;
      cta: { type: "practice_subtopic"; subtopic_id: number; tier: string } | { type: "mock_exams" };
    };

export interface ProfileAnalytics {
  subject_mastery: SubjectMastery[];
  learning_dna: LearningDna;
  academic_power: AcademicPower;
  personal_records: PersonalRecords;
  growth: Growth;
  coach: Coach;
  next_mission: NextMission;
}

export async function fetchAnalytics(): Promise<ProfileAnalytics> {
  const { data } = await apiClient.get("/profile/analytics/");
  return data;
}

export async function fetchSkillMap(subjectKey: string): Promise<SkillMap> {
  const { data } = await apiClient.get(`/profile/skill-map/${subjectKey}/`);
  return data;
}

// ---------------------------------------------------------------------------
// Home insight — the cheap, home-page-scoped subset of the analytics above
// (AI coach note + next mission + today's real checklist progress). Kept
// separate from fetchAnalytics() so the home page doesn't pay for the
// heavier subject-mastery/skill-map/academic-power computation.
// ---------------------------------------------------------------------------

export interface TodayChecklistItem {
  key: "practice" | "mistakes" | "daily_problem";
  done: number;
  target: number;
  complete: boolean;
}

export interface TodayChecklist {
  items: TodayChecklistItem[];
  completed_count: number;
  total_count: number;
  all_complete: boolean;
  estimated_minutes: number | null;
}

export interface HomeInsight {
  coach: Coach;
  next_mission: NextMission;
  checklist: TodayChecklist;
}

export async function fetchHomeInsight(): Promise<HomeInsight> {
  const { data } = await apiClient.get("/profile/home-insight/");
  return data;
}

// ---------------------------------------------------------------------------
// Activity heatmap — also the source for client-side "Performance Trends"
// bucketing (see lib/performanceTrends.ts), so one lazy call serves both.
// ---------------------------------------------------------------------------

export interface ActivityDay {
  date: string;
  minutes: number;
  questions_solved: number;
  correct_answers: number;
  tests_completed: number;
}

export async function fetchActivityHeatmap(days = 365): Promise<ActivityDay[]> {
  const { data } = await apiClient.get(`/profile/activity-heatmap/?days=${days}`);
  return data;
}

// ---------------------------------------------------------------------------
// Recent activity / study journey timeline
// ---------------------------------------------------------------------------

export type TimelineEntry =
  | { type: "achievement"; date: string; title: string; icon: string; xp_reward: number }
  | { type: "ranking_award"; date: string; title: string; rank: number }
  | {
      type: "study_day";
      date: string;
      minutes: number;
      questions_solved: number;
      correct_answers: number;
      tests_completed: number;
    };

export async function fetchTimeline(limit = 40): Promise<TimelineEntry[]> {
  const { data } = await apiClient.get(`/profile/timeline/?limit=${limit}`);
  return data;
}

// ---------------------------------------------------------------------------
// Personal goals — progress is always server-computed live, never faked.
// ---------------------------------------------------------------------------

export type GoalType =
  | "subject_accuracy"
  | "tests_this_week"
  | "streak_days"
  | "study_hours_month"
  | "xp_this_month"
  | "custom";

export interface GoalProgress {
  current: number | null;
  target: number | null;
  unit: string | null;
  percent: number;
  is_complete: boolean;
  has_data?: boolean;
}

export interface PersonalGoal {
  id: number;
  goal_type: GoalType;
  target_value: number;
  subject: number | null;
  subject_name: string | null;
  custom_title: string;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
  progress: GoalProgress;
}

export interface CreateGoalPayload {
  goal_type: GoalType;
  target_value?: number;
  subject?: number | null;
  custom_title?: string;
  deadline?: string | null;
}

export async function fetchGoals(): Promise<PersonalGoal[]> {
  const { data } = await apiClient.get("/profile/goals/");
  return data;
}

export async function createGoal(payload: CreateGoalPayload): Promise<PersonalGoal> {
  const { data } = await apiClient.post("/profile/goals/", payload);
  return data;
}

export async function completeCustomGoal(goalId: number, completed: boolean): Promise<PersonalGoal> {
  const { data } = await apiClient.patch(`/profile/goals/${goalId}/`, { completed });
  return data;
}

export async function deleteGoal(goalId: number): Promise<void> {
  await apiClient.delete(`/profile/goals/${goalId}/`);
}

// ---------------------------------------------------------------------------
// Achievement showcase pinning
// ---------------------------------------------------------------------------

export async function updateShowcase(achievementIds: number[]): Promise<UserAchievement[]> {
  const { data } = await apiClient.patch("/profile/showcase/", { achievement_ids: achievementIds });
  return data;
}

// ---------------------------------------------------------------------------
// Privacy settings
// ---------------------------------------------------------------------------

export interface PrivacySettings {
  show_school: boolean;
  show_age: boolean;
  show_university: boolean;
  show_stats: boolean;
  show_ranking: boolean;
  show_achievements: boolean;
  show_friends: boolean;
  show_activity: boolean;
  show_on_leaderboard: boolean;
}

export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  const { data } = await apiClient.get("/profile/privacy/");
  return data;
}

export async function updatePrivacySettings(payload: Partial<PrivacySettings>): Promise<PrivacySettings> {
  const { data } = await apiClient.patch("/profile/privacy/", payload);
  return data;
}
