import { apiClient } from "./client";

export interface DeviceSession {
  id: number;
  platform: string;
  browser: string;
  created_at: string;
  last_activity_at: string;
  is_current: boolean;
}

/** The authenticated user's own devices, for the account-management page. */
export async function fetchSessions(): Promise<DeviceSession[]> {
  const { data } = await apiClient.get("/auth/sessions/");
  return data;
}

export async function revokeSession(id: number): Promise<void> {
  await apiClient.post(`/auth/sessions/${id}/revoke/`);
}
