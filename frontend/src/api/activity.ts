import { apiClient } from "./client";

export async function sendHeartbeat(): Promise<void> {
  await apiClient.post("/activity/heartbeat/");
}