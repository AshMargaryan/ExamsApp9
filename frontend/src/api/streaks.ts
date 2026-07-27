import { apiClient } from "./client";

export interface LearningStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export async function fetchStreak(): Promise<LearningStreak> {
  const { data } = await apiClient.get("/streaks/me/");
  return data;
}
