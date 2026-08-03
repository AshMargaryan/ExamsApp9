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
