import { apiClient } from "./client";
import type { FriendUser } from "./friends";
import type { ChildDashboard } from "./parents";
import type { RankHistoryPoint, RankingScope } from "./rankings";

export type ConnectionStatus = "pending" | "accepted" | "declined";
export type StudentConnectionStatus = ConnectionStatus | "none";

export interface StudentSearchResult extends FriendUser {
  connection_status: StudentConnectionStatus;
}

export interface TeacherStudentConnection {
  id: number;
  teacher: FriendUser;
  student: FriendUser;
  status: ConnectionStatus;
  invited_at: string;
  accepted_at: string | null;
  notes: string;
}

export async function searchStudents(q: string): Promise<StudentSearchResult[]> {
  const { data } = await apiClient.get("/teaching/students/search/", { params: { q } });
  return data;
}

export async function sendInvitation(studentId: number): Promise<TeacherStudentConnection> {
  const { data } = await apiClient.post("/teaching/invitations/send/", { student_id: studentId });
  return data;
}

export async function fetchInvitations(): Promise<TeacherStudentConnection[]> {
  const { data } = await apiClient.get("/teaching/invitations/");
  return data;
}

export async function respondToInvitation(
  id: number,
  action: "accept" | "decline",
): Promise<TeacherStudentConnection> {
  const { data } = await apiClient.post(`/teaching/invitations/${id}/respond/`, { action });
  return data;
}

export async function cancelInvitation(id: number): Promise<void> {
  await apiClient.delete(`/teaching/invitations/${id}/`);
}

export type AssignmentType = "mock_exam" | "topic" | "subtopic";
export type AssignmentStatus = "assigned" | "in_progress" | "submitted" | "completed";
export type MockExamAssignmentStatus = "not_started" | "started" | "drafted" | "completed";

export interface AssignmentRef {
  id: number;
  title?: string;
  name?: string;
  subject?: string;
}

export interface Assignment {
  id: number;
  teacher: FriendUser;
  student: FriendUser;
  assignment_type: AssignmentType;
  mock_exam: AssignmentRef | null;
  topic: AssignmentRef | null;
  subtopic: AssignmentRef | null;
  title: string;
  instructions: string;
  due_date: string | null;
  status: AssignmentStatus;
  is_overdue: boolean;
  content_complete: boolean;
  progress: number;
  test_status: MockExamAssignmentStatus | null;
  explanation: string;
  teacher_feedback: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  seen_by_student: boolean;
  seen_by_teacher: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProblemQuestionReview {
  id: number;
  text: string;
  question_type: string;
  choices: { id: number; text: string; is_correct: boolean }[];
  statements: { id: number; label: string; text: string; is_true: boolean }[];
  correct_answer_text: string | null;
  selected_choice_id: number | null;
  answer_text: string;
  selected_statement_ids: number[];
  is_correct: boolean;
}

export interface ProblemSet {
  label: string;
  score: number | null;
  questions: ProblemQuestionReview[];
}

export interface AssignmentDetail extends Assignment {
  problem_sets: ProblemSet[];
}

export interface StudentRosterEntry {
  student: FriendUser;
  has_pending_review: boolean;
}

export interface CreateAssignmentPayload {
  student_id: number;
  assignment_type: AssignmentType;
  mock_exam_id?: number;
  topic_id?: number;
  subtopic_id?: number;
  title?: string;
  instructions?: string;
  due_date?: string;
}

export async function createAssignment(payload: CreateAssignmentPayload): Promise<Assignment> {
  const { data } = await apiClient.post("/teaching/assignments/create/", payload);
  return data;
}

export async function fetchAssignments(studentId?: number): Promise<Assignment[]> {
  const { data } = await apiClient.get("/teaching/assignments/", {
    params: studentId ? { student_id: studentId } : undefined,
  });
  return data;
}

export async function startAssignment(id: number): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/start/`);
  return data;
}

export async function submitAssignment(id: number, explanation: string): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/submit/`, { explanation });
  return data;
}

export async function reviewAssignment(
  id: number,
  action: "approve" | "reject",
  feedback?: string,
): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/review/`, { action, feedback });
  return data;
}

export async function fetchAssignmentDetail(id: number): Promise<AssignmentDetail> {
  const { data } = await apiClient.get(`/teaching/assignments/${id}/detail/`);
  return data;
}

export async function fetchStudentRoster(): Promise<StudentRosterEntry[]> {
  const { data } = await apiClient.get("/teaching/students/");
  return data;
}

export async function updateLearningProgress(id: number, progress: number): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/learning-progress/`, { progress });
  return data;
}

export async function markAssignmentSeen(id: number): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/mark-seen/`);
  return data;
}

export async function fetchAssignmentNotifications(): Promise<Assignment[]> {
  const { data } = await apiClient.get("/teaching/assignments/notifications/");
  return data;
}

export async function redoAssignment(id: number): Promise<Assignment> {
  const { data } = await apiClient.post(`/teaching/assignments/${id}/redo/`);
  return data;
}

export interface LeaderboardEntry {
  rank: number;
  student: FriendUser;
  monthly_xp: number;
  level: number;
  trend: { xp_change: number } | null;
}

export async function fetchClassLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await apiClient.get("/teaching/students/leaderboard/");
  return data;
}

export async function fetchStudentDashboard(studentId: number): Promise<ChildDashboard> {
  const { data } = await apiClient.get(`/teaching/students/${studentId}/dashboard/`);
  return data;
}

export async function fetchStudentRankHistory(
  studentId: number,
  scope: RankingScope,
): Promise<RankHistoryPoint[]> {
  const { data } = await apiClient.get(`/teaching/students/${studentId}/rank-history/`, {
    params: { scope },
  });
  return data;
}

export interface DashboardStats {
  student_count: number;
  pending_review_count: number;
  overdue_count: number;
  online_now_count: number;
}

export interface WeakSpot {
  subject_name: string;
  topic_label: string;
  count: number;
}

export type ActivityEventType = "submitted" | "approved" | "rejected" | "joined";

export interface ActivityEvent {
  type: ActivityEventType;
  at: string;
  student: FriendUser;
  title: string;
}

export interface DashboardSummary {
  stats: DashboardStats;
  pending_review: Assignment[];
  weak_spots: WeakSpot[];
  activity_feed: ActivityEvent[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get("/teaching/dashboard/summary/");
  return data;
}
