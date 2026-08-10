import { apiClient } from "./client";

export type StudyTaskType =
  | "flashcard_review"
  | "practice_weak_topic"
  | "mistake_retry"
  | "mock_exam_retake";

export type CheckInFeeling = "great" | "ok" | "struggled";

export interface StudyTask {
  id: number;
  order: number;
  task_type: StudyTaskType;
  subject_name: string;
  topic_label: string;
  title: string;
  blurb: string;
  link_path: string;
  estimated_minutes: number;
  done: boolean;
  progress: string | null;
  check_in_feeling: CheckInFeeling | null;
}

export interface CoachToday {
  minutes_done: number;
  minutes_total: number;
  done_count: number;
  total_count: number;
  questions: number;
  correct: number;
  mistakes: number;
  accuracy: number;
  priority: "high" | "normal";
  expected_result: string;
}

export interface CoachWeaknessItem {
  label: string;
  pct: number;
}

export interface CoachReview {
  topic_label: string;
  days_since: number;
  link_path: string | null;
}

export interface CoachStrategy {
  days_left: number;
  current_pace_days: number;
  recommended_days_per_week: number;
  recommended_minutes_per_day: string;
  is_behind: boolean;
}

export interface CoachWeek {
  days_studied: number;
  minutes: number;
  questions: number;
  accuracy: number | null;
  narrative: string;
}

export interface WeeklyReport {
  text: string;
  sent_at: string;
}

export interface CoachPanel {
  today: CoachToday;
  weakness: CoachWeaknessItem[];
  review: CoachReview | null;
  strategy: CoachStrategy | null;
  week: CoachWeek;
  weekly_report: WeeklyReport | null;
}

export interface DailyStudyPlan {
  id: number;
  date: string;
  headline: string;
  coach_message: string;
  tasks: StudyTask[];
  coach: CoachPanel;
}

export async function getTodayPlan(): Promise<DailyStudyPlan> {
  const { data } = await apiClient.get("/study-plan/today/");
  return data;
}

export async function submitTaskCheckIn(taskId: number, feeling: CheckInFeeling): Promise<void> {
  await apiClient.post(`/study-plan/tasks/${taskId}/check-in/`, { feeling });
}
