import { apiClient } from "./client";
import type { WeeklyProgressPoint } from "./practice";

export interface ChildSummary {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  age: number | null;
  grade: number | null;
  school: string | null;
  level: number;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface SubjectPerformance {
  subject_id: number;
  subject_name: string;
  completion_percent: number;
  avg_score: number | null;
  tiers_completed: number;
}

export interface SkillEntry {
  subtopic_id: number;
  name: string;
  subject_name: string;
  avg_score: number;
}

export interface SkillsMastery {
  mastered: SkillEntry[];
  practicing: SkillEntry[];
  needs_improvement: SkillEntry[];
}

export interface ActivityCalendarPoint {
  date: string;
  count: number;
}

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
}

export interface ChildAchievement {
  id: number;
  achievement: Achievement;
  unlocked_at: string;
}

export interface ChildDashboard {
  overview: ChildSummary;
  subject_performance: SubjectPerformance[];
  skills_mastery: SkillsMastery;
  weekly_progress: WeeklyProgressPoint[];
  activity_calendar: ActivityCalendarPoint[];
  recent_achievements: ChildAchievement[];
  predicted_exam_score: number | null;
  best_study_hour: number | null;
}

export type GoalType = "lessons_per_week" | "xp_per_month" | "subject_accuracy";

export interface LearningGoal {
  id: number;
  child: number;
  goal_type: GoalType;
  target_value: number;
  subject: number | null;
  subject_name: string | null;
  progress: { current: number; target: number; percent: number };
  created_at: string;
}

export interface Notification {
  id: number;
  child: number;
  child_name: string;
  notification_type: "lesson_completed" | "badge_earned" | "streak_broken" | "struggling_topic";
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getChildren(): Promise<ChildSummary[]> {
  const { data } = await apiClient.get("/parents/children/");
  return data;
}

export type ChildRelationshipStatus = "none" | "already_linked" | "request_pending";

export interface ChildSearchResult {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  relationship_status: ChildRelationshipStatus;
}

export type ParentChildRequestStatus = "pending" | "accepted" | "rejected";

export interface RequestUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
}

export interface ParentChildRequest {
  id: number;
  parent: RequestUser;
  child: RequestUser;
  status: ParentChildRequestStatus;
  created_at: string;
}

export async function searchChildren(q: string): Promise<ChildSearchResult[]> {
  const { data } = await apiClient.get("/parents/search-children/", { params: { q } });
  return data;
}

export async function sendChildRequest(childId: number): Promise<ParentChildRequest> {
  const { data } = await apiClient.post("/parents/requests/send/", { child_id: childId });
  return data;
}

export async function fetchIncomingChildRequests(): Promise<ParentChildRequest[]> {
  const { data } = await apiClient.get("/parents/requests/", { params: { direction: "incoming" } });
  return data;
}

export async function fetchOutgoingChildRequests(): Promise<ParentChildRequest[]> {
  const { data } = await apiClient.get("/parents/requests/", { params: { direction: "outgoing" } });
  return data;
}

export async function respondToChildRequest(
  requestId: number,
  action: "accept" | "reject",
): Promise<ParentChildRequest> {
  const { data } = await apiClient.post(`/parents/requests/${requestId}/respond/`, { action });
  return data;
}

export async function cancelChildRequest(requestId: number): Promise<void> {
  await apiClient.delete(`/parents/requests/${requestId}/`);
}

export async function unlinkChild(childId: number): Promise<void> {
  await apiClient.delete(`/parents/children/${childId}/`);
}

export async function getChildDashboard(childId: number): Promise<ChildDashboard> {
  const { data } = await apiClient.get(`/parents/children/${childId}/dashboard/`);
  return data;
}

export async function generateWeeklyReport(childId: number, email = false): Promise<string> {
  const { data } = await apiClient.post(`/parents/children/${childId}/weekly-report/`, { email });
  return data.report_text;
}

export async function getChildGoals(childId: number): Promise<LearningGoal[]> {
  const { data } = await apiClient.get(`/parents/children/${childId}/goals/`);
  return data;
}

export async function createGoal(
  childId: number,
  input: { goal_type: GoalType; target_value: number; subject?: number },
): Promise<LearningGoal> {
  const { data } = await apiClient.post(`/parents/children/${childId}/goals/`, input);
  return data;
}

export async function deleteGoal(goalId: number): Promise<void> {
  await apiClient.delete(`/parents/goals/${goalId}/`);
}

export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const { data } = await apiClient.get("/parents/notifications/", {
    params: unreadOnly ? { unread: "true" } : undefined,
  });
  return data;
}

export async function markNotificationsRead(ids?: number[]): Promise<void> {
  await apiClient.post("/parents/notifications/mark-read/", ids ? { ids } : {});
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lessons_per_week: "Դասեր / շաբաթ",
  xp_per_month: "XP / ամիս",
  subject_accuracy: "Ճշգրտություն առարկայում",
};
