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

/** Ticket-based recovery flow for a login rejected with device_limit_reached —
 * no access token exists yet, so these go through a short-lived, narrowly
 * scoped management ticket instead (see backend apps/users/sessions.py). */
export async function fetchManagedSessions(ticket: string): Promise<DeviceSession[]> {
  const { data } = await apiClient.post("/auth/sessions/manage/list/", { ticket });
  return data;
}

export async function revokeManagedSession(ticket: string, id: number): Promise<void> {
  await apiClient.post("/auth/sessions/manage/revoke/", { ticket, session_id: id });
}
