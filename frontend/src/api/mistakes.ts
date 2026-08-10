import { apiClient } from "./client";

export type MistakeSource = "practice" | "mock_exam" | "flashcard";

export interface MistakeChoice {
  id: number;
  text: string;
  order: number;
}

export interface MistakeStatement {
  id: number;
  label: string;
  text: string;
  order: number;
}

export interface MistakeMatchLeftItem {
  id: number;
  label: string;
  text: string;
  order: number;
}

export interface MistakeMatchRightItem {
  id: number;
  text: string;
  order: number;
}

export interface MistakeRenderData {
  choices?: MistakeChoice[];
  statements?: MistakeStatement[];
  left?: MistakeMatchLeftItem[];
  right?: MistakeMatchRightItem[];
  back_text?: string;
  translation?: string;
}

export interface MistakeEntry {
  id: number;
  source: MistakeSource;
  subject_name: string;
  topic_label: string;
  question_type: string;
  question_text: string;
  render_data: MistakeRenderData;
  your_answer_text: string;
  correct_answer_text: string;
  explanation: string;
  hint: string;
  created_at: string;
  retry_count: number;
  last_retried_at: string | null;
  last_retry_correct: boolean | null;
  retryable: boolean;
}

export interface MistakeRetryInput {
  selected_choice_id?: number | null;
  answer_text?: string;
  selected_statement_ids?: number[];
  match_pairs?: Record<number, number>;
  knew_it?: boolean;
}

export interface MistakeRetryResult {
  is_correct: boolean;
  correct_answer_text: string;
  explanation: string;
  retry_count: number;
}

export async function listMistakes(source?: MistakeSource): Promise<MistakeEntry[]> {
  const { data } = await apiClient.get("/mistakes/", { params: source ? { source } : undefined });
  return data;
}

export async function retryMistake(id: number, input: MistakeRetryInput): Promise<MistakeRetryResult> {
  const { data } = await apiClient.post(`/mistakes/${id}/retry/`, input);
  return data;
}
