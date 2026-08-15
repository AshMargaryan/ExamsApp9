import { apiClient } from "./client";

// Named distinctly from api/profile.ts's `SubjectMastery` (the older,
// live-computed dashboard number) — this is the new stored, recency-
// weighted engine (apps.knowledge). The two can diverge; see MasterySection.

export type DataSufficiency = "low" | "medium" | "high";

export interface MasteryScore {
  subject_key: string;
  subject_label: string;
  mastery_score: number | null;
  attempts_count: number;
  correct_count: number;
  data_sufficiency: DataSufficiency;
  last_activity_at: string | null;
  updated_at: string;
}

export interface TopicMasteryScore {
  subtopic: number;
  subtopic_name: string;
  topic_name: string;
  mastery_score: number | null;
  attempts_count: number;
  correct_count: number;
  data_sufficiency: DataSufficiency;
  last_activity_at: string | null;
  updated_at: string;
}

export async function fetchSubjectMasteryScores(): Promise<MasteryScore[]> {
  const { data } = await apiClient.get("/knowledge/subjects/");
  return data;
}

export async function fetchTopicMasteryScores(subjectKey?: string): Promise<TopicMasteryScore[]> {
  const { data } = await apiClient.get("/knowledge/topics/", {
    params: subjectKey ? { subject_key: subjectKey } : undefined,
  });
  return data;
}
