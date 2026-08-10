import { apiClient } from "./client";
import type { FriendUser } from "./friends";

export type ChallengeInviteStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export interface ChallengeInvite {
  id: number;
  sender: FriendUser;
  receiver: FriendUser;
  subject: number;
  subject_name: string;
  topic: number | null;
  topic_name: string | null;
  status: ChallengeInviteStatus;
  room_code: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string;
}

export async function sendChallenge(
  receiverId: number,
  subjectId: number,
  topicId?: number | null,
): Promise<ChallengeInvite> {
  const { data } = await apiClient.post("/challenges/send/", {
    receiver_id: receiverId,
    subject_id: subjectId,
    topic_id: topicId ?? undefined,
  });
  return data;
}

export async function listChallenges(direction: "incoming" | "outgoing" = "incoming"): Promise<ChallengeInvite[]> {
  const { data } = await apiClient.get("/challenges/", { params: { direction } });
  return data;
}

export async function respondToChallenge(id: number, action: "accept" | "decline"): Promise<ChallengeInvite> {
  const { data } = await apiClient.post(`/challenges/${id}/respond/`, { action });
  return data;
}

export async function cancelChallenge(id: number): Promise<void> {
  await apiClient.delete(`/challenges/${id}/`);
}
