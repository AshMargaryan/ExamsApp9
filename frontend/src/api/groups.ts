import { apiClient } from "./client";
import type { FriendUser } from "./friends";
import type { SubjectKey } from "../lib/subjects";

export type GroupType = "study_group" | "tutoring";
export type MembershipRole = "leader" | "member";

/** 0 = Monday ... 6 = Sunday, matching apps.study_groups.models.Weekday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GroupListItem {
  id: number;
  title: string;
  subject: SubjectKey;
  type: GroupType;
  leader: FriendUser;
  schedule_day: Weekday;
  schedule_start_time: string;
  schedule_end_time: string;
  member_count: number;
  max_members: number;
  created_at: string;
}

export interface GroupMember {
  user: FriendUser;
  role: MembershipRole;
  joined_at: string;
}

export interface GroupDetail {
  id: number;
  title: string;
  subject: SubjectKey;
  type: GroupType;
  description: string;
  leader: FriendUser;
  schedule_day: Weekday;
  schedule_start_time: string;
  schedule_end_time: string;
  members: GroupMember[];
  max_members: number;
  created_at: string;
}

export interface GroupSearchParams {
  q?: string;
  subject?: SubjectKey;
  type?: GroupType;
}

export interface CreateGroupInput {
  title: string;
  subject: SubjectKey;
  type: GroupType;
  description?: string;
  schedule_day: Weekday;
  schedule_start_time: string;
  schedule_end_time: string;
  max_members?: number;
}

export async function searchGroups(params: GroupSearchParams): Promise<GroupListItem[]> {
  const { data } = await apiClient.get("/groups/search/", { params });
  return data.results;
}

export async function createGroup(input: CreateGroupInput): Promise<GroupDetail> {
  const { data } = await apiClient.post("/groups/", input);
  return data;
}

export async function fetchGroup(id: number): Promise<GroupDetail> {
  const { data } = await apiClient.get(`/groups/${id}/`);
  return data;
}

export async function joinGroup(id: number): Promise<GroupDetail> {
  const { data } = await apiClient.post(`/groups/${id}/join/`);
  return data;
}

export async function leaveGroup(id: number): Promise<void> {
  await apiClient.post(`/groups/${id}/leave/`);
}

export async function deleteGroup(id: number): Promise<void> {
  await apiClient.delete(`/groups/${id}/`);
}

export async function transferLeadership(id: number, newLeaderId: number): Promise<GroupDetail> {
  const { data } = await apiClient.post(`/groups/${id}/transfer-leadership/`, { new_leader_id: newLeaderId });
  return data;
}
