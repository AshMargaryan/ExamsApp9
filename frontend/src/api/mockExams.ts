import { apiClient } from "./client";

export type MockExamQuestionType = "single_choice" | "free_response" | "multi_statement";
export type MockExamDifficulty = "easy" | "medium" | "hard";
export type MockExamAttemptStatus = "in_progress" | "completed";

export interface MockExamChoice {
  id: number;
  text: string;
  order: number;
  is_correct?: boolean;
}

export interface MockExamStatement {
  id: number;
  label: string;
  text: string;
  order: number;
  is_true?: boolean;
}

export interface MockExamQuestion {
  id: number;
  number: number;
  topic: string;
  group: string;
  question_type: MockExamQuestionType;
  text: string;
  difficulty: MockExamDifficulty;
  hint?: string;
  solution_steps?: string[];
  correct_answer_text?: string;
  choices: MockExamChoice[];
  statements: MockExamStatement[];
}

export interface MockExamSummary {
  id: number;
  exam_id: string;
  title: string;
  question_count: number;
  has_draft: boolean;
  draft_attempt_id: number | null;
  completed_attempts_count: number;
  best_scaled_score: number | null;
}

export interface MockExamAttempt {
  id: number;
  exam: { id: number; exam_id: string; title: string; question_count: number };
  status: MockExamAttemptStatus;
  duration_minutes: number | null;
  hints_enabled: boolean;
  started_at: string;
  time_remaining_seconds: number | null;
  completed_at: string | null;
  raw_score: number | null;
  scaled_score: number | null;
  percent_answered: number | null;
  easy_correct: number;
  easy_total: number;
  medium_correct: number;
  medium_total: number;
  hard_correct: number;
  hard_total: number;
}

export interface AnswerInput {
  question_id: number;
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
}

export interface SavedAnswer {
  selected_choice_id?: number | null;
  answer_text?: string;
  selected_statement_ids?: number[];
  is_correct?: boolean | null;
}

export interface AttemptDetail {
  attempt: MockExamAttempt;
  remaining_seconds: number | null;
  questions: MockExamQuestion[];
  answers: Record<number, SavedAnswer>;
}

export interface AttemptResults {
  attempt: MockExamAttempt;
  questions: MockExamQuestion[];
  answers: Record<number, SavedAnswer>;
}

export async function listMockExams(): Promise<MockExamSummary[]> {
  const { data } = await apiClient.get("/mock-exams/exams/");
  return data.results;
}

export async function getExamAttemptHistory(examId: number): Promise<MockExamAttempt[]> {
  const { data } = await apiClient.get(`/mock-exams/exams/${examId}/attempts/`);
  return data.results;
}

export async function startAttempt(
  examId: number,
  durationMinutes: number | null,
  hintsEnabled: boolean,
): Promise<MockExamAttempt> {
  const { data } = await apiClient.post(`/mock-exams/exams/${examId}/start/`, {
    duration_minutes: durationMinutes,
    hints_enabled: hintsEnabled,
  });
  return data;
}

export async function getAttempt(attemptId: number): Promise<AttemptDetail> {
  const { data } = await apiClient.get(`/mock-exams/attempts/${attemptId}/`);
  return data;
}

export async function saveDraft(
  attemptId: number,
  answers: AnswerInput[],
  timeRemainingSeconds: number | null,
): Promise<{ saved: boolean; remaining_seconds: number | null }> {
  const { data } = await apiClient.post(`/mock-exams/attempts/${attemptId}/draft/`, {
    answers,
    time_remaining_seconds: timeRemainingSeconds,
  });
  return data;
}

export async function finishAttempt(
  attemptId: number,
  answers: AnswerInput[],
): Promise<MockExamAttempt> {
  const { data } = await apiClient.post(`/mock-exams/attempts/${attemptId}/finish/`, { answers });
  return data;
}

export async function getResults(attemptId: number): Promise<AttemptResults> {
  const { data } = await apiClient.get(`/mock-exams/attempts/${attemptId}/results/`);
  return data;
}

export const DIFFICULTY_LABELS: Record<MockExamDifficulty, string> = {
  easy: "Հեշտ",
  medium: "Միջին",
  hard: "Դժվար",
};

export const DURATION_PRESETS: { label: string; minutes: number | null }[] = [
  { label: "1 ժամ", minutes: 60 },
  { label: "1.5 ժամ", minutes: 90 },
  { label: "2 ժամ", minutes: 120 },
  { label: "2.5 ժամ", minutes: 150 },
  { label: "Անժամկետ", minutes: null },
];

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
