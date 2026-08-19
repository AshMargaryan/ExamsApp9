import { apiClient } from "./client";

export type MistakeSource = "practice" | "mock_exam" | "flashcard";
export type MistakeType = "not_attempted" | "incorrect";

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

export type ErrorCategory =
  | "unclassified"
  | "careless_slip"
  | "conceptual_gap"
  | "process_error"
  | "misread_question";

export interface MistakeEntry {
  id: number;
  source: MistakeSource;
  mistake_type: MistakeType;
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
  error_category: ErrorCategory;
  error_category_display: string;
  error_explanation: string;
  classified_at: string | null;
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

export interface MistakeFilters {
  source?: MistakeSource;
  /** Exact subject_name as stored on the entry. */
  subject?: string;
  /** Exact topic_label within that subject. */
  topic?: string;
  /** Drop entries already re-answered correctly. */
  unresolved?: boolean;
}

export async function listMistakes(filters: MistakeFilters = {}): Promise<MistakeEntry[]> {
  const params: Record<string, string> = {};
  if (filters.source) params.source = filters.source;
  if (filters.subject) params.subject = filters.subject;
  if (filters.topic) params.topic = filters.topic;
  if (filters.unresolved) params.unresolved = "1";
  const { data } = await apiClient.get("/mistakes/", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return data;
}

export async function retryMistake(id: number, input: MistakeRetryInput): Promise<MistakeRetryResult> {
  const { data } = await apiClient.post(`/mistakes/${id}/retry/`, input);
  return data;
}

export async function classifyMistake(id: number): Promise<MistakeEntry> {
  const { data } = await apiClient.post(`/mistakes/${id}/classify/`);
  return data;
}
