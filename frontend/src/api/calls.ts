import { apiClient } from "./client";
import type { FriendUser } from "./friends";

export type CallRoomStatus = "waiting" | "ready" | "active" | "ended";

export interface CallParticipant {
  user: FriendUser;
  joined_at: string;
}

export interface CallRoom {
  id: number;
  study_group: number;
  creator: FriendUser;
  capacity: number;
  status: CallRoomStatus;
  participants: CallParticipant[];
  participant_count: number;
  created_at: string;
}

export async function listCalls(studyGroupId: number): Promise<CallRoom[]> {
  const { data } = await apiClient.get("/calls/list/", { params: { study_group: studyGroupId } });
  return data;
}

export async function createCall(studyGroupId: number, capacity: number): Promise<CallRoom> {
  const { data } = await apiClient.post("/calls/", { study_group: studyGroupId, capacity });
  return data;
}

export async function joinCall(id: number): Promise<CallRoom> {
  const { data } = await apiClient.post(`/calls/${id}/join/`);
  return data;
}

export async function leaveCall(id: number): Promise<void> {
  await apiClient.post(`/calls/${id}/leave/`);
}

export async function cancelCall(id: number): Promise<void> {
  await apiClient.delete(`/calls/${id}/`);
}
