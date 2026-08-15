import { apiClient } from "./client";

export type MockExamQuestionType = "single_choice" | "free_response" | "multi_statement" | "matching";
export type MockExamDifficulty = "easy" | "medium" | "hard";
export type MockExamAttemptStatus = "in_progress" | "completed";
export type MockExamSubject = "math" | "physics" | "biology" | "chemistry" | "english";

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
  match_target?: number | null; // matching (reveal only): correct right-column number
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
  figure_svg?: string;
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
  subject: MockExamSubject;
  has_draft: boolean;
  draft_attempt_id: number | null;
  completed_attempts_count: number;
  best_scaled_score: number | null;
  last_attempt_at: string | null;
}

export interface MockExamOverview {
  completed_count: number;
  average_scaled_score: number | null;
  best_scaled_score: number | null;
  total_time_seconds: number;
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
  match_pairs?: Record<number, number>; // matching: statementId -> choiceId
}

export interface SavedAnswer {
  selected_choice_id?: number | null;
  answer_text?: string;
  selected_statement_ids?: number[];
  match_pairs?: Record<number, number>;
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

export type ErrorCategory =
  | "unclassified" | "careless_slip" | "conceptual_gap" | "process_error" | "misread_question";

export interface QuestionMistakeInfo {
  mistake_entry_id: number;
  error_category: ErrorCategory;
  error_category_display: string;
  error_explanation: string;
  classified_at: string | null;
}

export interface AttemptAutopsy {
  subject_mastery: {
    subject_key: string;
    subject_label: string;
    mastery_score: number | null;
    data_sufficiency: "low" | "medium" | "high";
  } | null;
  dominant_error_category: ErrorCategory | null;
  dominant_error_category_display: string | null;
  mistakes_by_question: Record<string, QuestionMistakeInfo>;
}

export async function listMockExams(subject?: MockExamSubject): Promise<MockExamSummary[]> {
  const { data } = await apiClient.get("/mock-exams/exams/", {
    params: subject ? { subject } : undefined,
  });
  return data.results;
}

export async function getOverview(): Promise<MockExamOverview> {
  const { data } = await apiClient.get("/mock-exams/overview/");
  return data;
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

export async function abandonAttempt(attemptId: number): Promise<void> {
  await apiClient.post(`/mock-exams/attempts/${attemptId}/abandon/`);
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

export async function getAutopsy(attemptId: number): Promise<AttemptAutopsy> {
  const { data } = await apiClient.get(`/mock-exams/attempts/${attemptId}/autopsy/`);
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

/** "18ժ 42ր" style — for cumulative time totals, distinct from formatSeconds' countdown format. */
export function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}ր`;
  return `${h}ժ ${m}ր`;
}

/** Fire-and-forget: records a HINT_REQUESTED learning event. Never throws
 * to the caller — a failed report shouldn't disrupt the student's exam. */
export async function markHintViewed(questionId: number): Promise<void> {
  try {
    await apiClient.post(`/mock-exams/questions/${questionId}/hint-viewed/`);
  } catch {
    // best-effort telemetry, intentionally swallowed
  }
}
