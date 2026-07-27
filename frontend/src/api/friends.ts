import { apiClient } from "./client";

export type RelationshipStatus = "self" | "friends" | "request_sent" | "request_received" | "none";

export interface FriendUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
}

export interface SearchResultUser extends FriendUser {
  relationship_status: RelationshipStatus;
}

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequest {
  id: number;
  sender: FriendUser;
  receiver: FriendUser;
  status: FriendRequestStatus;
  created_at: string;
}

export async function searchUsers(q: string): Promise<SearchResultUser[]> {
  const { data } = await apiClient.get("/friends/search/", { params: { q } });
  return data;
}

export async function fetchFriends(): Promise<FriendUser[]> {
  const { data } = await apiClient.get("/friends/");
  return data;
}

export async function fetchIncomingRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get("/friends/requests/", { params: { direction: "incoming" } });
  return data;
}

export async function fetchOutgoingRequests(): Promise<FriendRequest[]> {
  const { data } = await apiClient.get("/friends/requests/", { params: { direction: "outgoing" } });
  return data;
}

export async function sendFriendRequest(receiverId: number): Promise<FriendRequest> {
  const { data } = await apiClient.post("/friends/requests/send/", { receiver_id: receiverId });
  return data;
}

export async function respondToRequest(
  requestId: number,
  action: "accept" | "reject",
): Promise<FriendRequest> {
  const { data } = await apiClient.post(`/friends/requests/${requestId}/respond/`, { action });
  return data;
}

export async function cancelFriendRequest(requestId: number): Promise<void> {
  await apiClient.delete(`/friends/requests/${requestId}/`);
}

export async function removeFriend(userId: number): Promise<void> {
  await apiClient.delete(`/friends/${userId}/`);
}
