import { apiClient } from "./client";

export type Tier = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "short_answer" | "true_false";

export interface Choice {
  id: number;
  text: string;
  order: number;
  is_correct?: boolean;
}

export interface Statement {
  id: number;
  label: string;
  text: string;
  order: number;
  is_true?: boolean;
  hint?: string;
}

export interface Question {
  id: number;
  question_type: QuestionType;
  tier: Tier;
  text: string;
  hint?: string;
  video_url?: string;
  choices: Choice[];
  statements: Statement[];
  explanation?: string;
  correct_answer_text?: string;
}

export interface Progress {
  percent: number;
  avg_score: number | null;
}

export interface SubtopicNode {
  id: number;
  name: string;
  order: number;
  tier_scores: Record<Tier, number | null>;
}

export interface TopicNode {
  id: number;
  name: string;
  order: number;
  intro_text: string;
  subtopics: SubtopicNode[];
  progress: Progress;
}

export interface DomainNode {
  id: number;
  name: string;
  order: number;
  intro_text: string;
  topics: TopicNode[];
  progress: Progress;
}

export interface SubjectNode {
  id: number;
  name: string;
  order: number;
  domains: DomainNode[];
  progress: Progress;
}

export interface AnswerInput {
  question_id: number;
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
}

export interface SubmitResult {
  attempt: {
    id: number;
    subtopic: number;
    tier: Tier;
    score: number | null;
    revealed_answers: boolean;
    completed_at: string | null;
  };
  correct_count: number;
  total: number;
}

export async function getHierarchy(): Promise<SubjectNode[]> {
  const { data } = await apiClient.get("/practice/hierarchy/");
  return data.results;
}

export async function getTierQuestions(subtopicId: number, tier: Tier): Promise<Question[]> {
  const { data } = await apiClient.get(`/practice/subtopics/${subtopicId}/${tier}/questions/`);
  return data.results;
}

export async function submitTier(
  subtopicId: number,
  tier: Tier,
  answers: AnswerInput[],
  revealed: boolean,
): Promise<SubmitResult> {
  const { data } = await apiClient.post(`/practice/subtopics/${subtopicId}/${tier}/submit/`, {
    answers,
    revealed,
  });
  return data;
}

export async function revealTier(subtopicId: number, tier: Tier): Promise<Question[]> {
  const { data } = await apiClient.get(`/practice/subtopics/${subtopicId}/${tier}/reveal/`);
  return data;
}

export const TIER_LABELS: Record<Tier, string> = {
  easy: "Հեշտ",
  medium: "Միջին",
  hard: "Դժվար",
};