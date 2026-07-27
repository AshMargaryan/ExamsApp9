import { apiClient } from "./client";
import type { School, University } from "./auth";

export interface LearningStats {
  questions_solved: number;
  correct_answers: number;
  accuracy_percentage: number;
  practice_tests_completed: number;
  total_learning_time_seconds: number | null;
}

export interface Profile {
  avatar: string | null;
  bio: string;
  username: string;
  first_name: string;
  last_name: string;
  school: School | null;
  grade: number | null;
  age: number | null;
  marz: string;
  university: University | null;
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  trophies_count: number;
  stats: LearningStats;
  updated_at: string;
}

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
}

export interface UserAchievement {
  id: number;
  achievement: Achievement;
  unlocked_at: string;
}

export interface UpdateProfilePayload {
  bio?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  grade?: number | null;
  age?: number | null;
  school_id?: number | null;
  university_id?: number | null;
  avatar?: File;
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await apiClient.get("/profile/me/");
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (value === null) {
      form.append(key, "");
    } else {
      form.append(key, value as string | Blob);
    }
  }
  const { data } = await apiClient.patch("/profile/me/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchAchievements(): Promise<Achievement[]> {
  const { data } = await apiClient.get("/profile/achievements/");
  return data;
}

export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const { data } = await apiClient.get("/profile/achievements/mine/");
  return data;
}
