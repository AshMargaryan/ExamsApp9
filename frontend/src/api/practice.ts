import { apiClient } from "./client";

export type Tier = "easy" | "medium" | "hard";
export type QuestionType = "multiple_choice" | "short_answer" | "true_false";

// The only subject with the calculator/notepad tools enabled, for now.
export const MATH_SUBJECT_NAME = "Մաթեմատիկա";

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
  passage?: string;
  hint?: string;
  video_url?: string;
  choices: Choice[];
  statements: Statement[];
  explanation?: string;
  correct_answer_text?: string;
  subject_name?: string;
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
  has_learning_material: boolean;
}

export interface SubtopicMaterial {
  id: number;
  name: string;
  learning_material: string;
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

export async function getSubtopicMaterial(subtopicId: number): Promise<SubtopicMaterial> {
  const { data } = await apiClient.get(`/practice/subtopics/${subtopicId}/material/`);
  return data;
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