import { apiClient } from "./client";
import type { School } from "./auth";

export interface RankingEntry {
  rank: number;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  school: School | null;
  xp: number;
  level: number;
}

export interface RankingBoard {
  year: number;
  month: number;
  month_label: string;
  results: RankingEntry[];
  my_rank: number | null;
  my_xp: number | null;
  nearby: RankingEntry[];
  no_school?: boolean;
  no_grade?: boolean;
  still_growing?: boolean;
}

export type RankingScope = "global" | "school" | "class" | "friends";

export type SubjectKey = "math" | "physics" | "biology" | "chemistry" | "english";

export const SUBJECT_LABELS: Record<SubjectKey, string> = {
  math: "Մաթեմատիկա",
  physics: "Ֆիզիկա",
  biology: "Կենսաբանություն",
  chemistry: "Քիմիա",
  english: "Անգլերեն",
};

export interface RankHistoryPoint {
  date: string;
  xp: number;
  rank: number;
}

export interface SchoolComparisonEntry {
  rank: number;
  school: School;
  total_xp: number;
  student_count: number;
}

export interface SchoolComparisonBoard {
  year: number;
  month: number;
  month_label: string;
  results: SchoolComparisonEntry[];
  my_school_rank: number | null;
}

export interface RankingAward {
  id: number;
  scope: RankingScope;
  school: School | null;
  grade: number | null;
  year: number;
  month: number;
  rank: number;
  xp: number;
  title: string;
  awarded_at: string;
}

export async function fetchGlobalRanking(): Promise<RankingBoard> {
  const { data } = await apiClient.get("/rankings/global/");
  return data;
}

export async function fetchSchoolRanking(): Promise<RankingBoard> {
  const { data } = await apiClient.get("/rankings/school/");
  return data;
}

export async function fetchClassRanking(): Promise<RankingBoard> {
  const { data } = await apiClient.get("/rankings/class/");
  return data;
}

export async function fetchFriendsRanking(): Promise<RankingBoard> {
  const { data } = await apiClient.get("/rankings/friends/");
  return data;
}

export async function fetchSubjectRanking(subjectKey: SubjectKey): Promise<RankingBoard> {
  const { data } = await apiClient.get(`/rankings/subject/${subjectKey}/`);
  return data;
}

export async function fetchRankHistory(scope: RankingScope): Promise<RankHistoryPoint[]> {
  const { data } = await apiClient.get("/rankings/history/", { params: { scope } });
  return data;
}

export async function fetchSchoolComparison(): Promise<SchoolComparisonBoard> {
  const { data } = await apiClient.get("/rankings/schools/");
  return data;
}

export async function fetchMyRankingAwards(): Promise<RankingAward[]> {
  const { data } = await apiClient.get("/rankings/awards/mine/");
  return data;
}

export async function fetchUserRankingAwards(userId: number): Promise<RankingAward[]> {
  const { data } = await apiClient.get(`/rankings/awards/${userId}/`);
  return data;
}
