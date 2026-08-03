import { apiClient } from "./client";
import type { FriendUser } from "./friends";

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

export interface AssignmentRef {
  id: number;
  title?: string;
  name?: string;
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
  explanation: string;
  teacher_feedback: string;
  submitted_at: string | null;
  reviewed_at: string | null;
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
  title: string;
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
