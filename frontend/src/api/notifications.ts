import { apiClient } from "./client";

export type StudentNotificationType =
  | "rank_up"
  | "overtaken"
  | "season_ending"
  | "season_result"
  | "challenge_received"
  | "challenge_result";

export interface StudentNotification {
  id: number;
  notification_type: StudentNotificationType;
  message: string;
  context: Record<string, unknown> | null;
  link: string;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications(): Promise<StudentNotification[]> {
  const { data } = await apiClient.get("/notifications/");
  return data;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiClient.post(`/notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post("/notifications/read-all/");
}
