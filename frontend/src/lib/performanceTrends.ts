import type { ActivityDay } from "../api/profile";

export type TrendRange = "7d" | "30d" | "3m" | "all";

export interface TrendPoint {
  label: string;
  date: string;
  accuracy: number | null;
  minutes: number;
  questions: number;
  tests: number;
}

const RANGE_DAYS: Record<TrendRange, number> = { "7d": 7, "30d": 30, "3m": 90, all: 365 };

export const TREND_RANGE_LABELS: Record<TrendRange, string> = {
  "7d": "7 օր",
  "30d": "30 օր",
  "3m": "3 ամիս",
  all: "Ամբողջը",
};

/**
 * Buckets the activity-heatmap response (per-day minutes/questions/correct/
 * tests) into trend points for the given range — 7d/30d stay daily, 3m/all
 * roll up into weekly buckets so the line chart doesn't render 365 points.
 * No backend time-series storage needed: this is the same lazy-loaded
 * activity-heatmap call the heatmap section already makes.
 */
export function bucketActivity(days: ActivityDay[], range: TrendRange): TrendPoint[] {
  const rangeDays = RANGE_DAYS[range];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rangeDays);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const inRange = days.filter((d) => d.date >= cutoffIso).sort((a, b) => (a.date < b.date ? -1 : 1));

  if (range === "7d" || range === "30d") {
    return inRange.map((d) => ({
      label: d.date.slice(5),
      date: d.date,
      accuracy: d.questions_solved ? Math.round((d.correct_answers / d.questions_solved) * 1000) / 10 : null,
      minutes: d.minutes,
      questions: d.questions_solved,
      tests: d.tests_completed,
    }));
  }

  const buckets = new Map<string, ActivityDay[]>();
  for (const d of inRange) {
    const date = new Date(d.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(d);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, rows]) => {
      const questions = rows.reduce((s, r) => s + r.questions_solved, 0);
      const correct = rows.reduce((s, r) => s + r.correct_answers, 0);
      const minutes = rows.reduce((s, r) => s + r.minutes, 0);
      const tests = rows.reduce((s, r) => s + r.tests_completed, 0);
      return {
        label: weekStart.slice(5),
        date: weekStart,
        accuracy: questions ? Math.round((correct / questions) * 1000) / 10 : null,
        minutes,
        questions,
        tests,
      };
    });
}
