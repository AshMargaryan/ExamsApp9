import type { DataSufficiency } from "../api/knowledge";
import type { GoalPriority } from "../api/profile";

/*
  Shared vocabulary for "how well does this student know X".

  These labels and colours were duplicated across the subject grid, the goals
  card and the exams list, which is how three sections end up disagreeing about
  what "Միջին" looks like. Defined once, consumed everywhere — including the
  study plan's learning map, so a subject that reads "needs work" on one page
  reads the same on the other.

  Colour is strictly semantic here: green means healthy, amber means attention,
  red means this is the actual problem. Nothing is coloured to look nice.
*/

export type MasteryBand = "strong" | "developing" | "weak" | "unknown";

export const MASTERY_STRONG_MIN = 70;
export const MASTERY_DEVELOPING_MIN = 40;

export function masteryBand(score: number | null | undefined): MasteryBand {
  if (score == null) return "unknown";
  if (score >= MASTERY_STRONG_MIN) return "strong";
  if (score >= MASTERY_DEVELOPING_MIN) return "developing";
  return "weak";
}

export const MASTERY_BAND_LABEL: Record<MasteryBand, string> = {
  strong: "Առաջադեմ",
  developing: "Միջին",
  weak: "Սկսնակ",
  unknown: "Դեռ տվյալ չկա",
};

/** CSS colour value — for inline styles, rings and bars. */
export const MASTERY_BAND_COLOR: Record<MasteryBand, string> = {
  strong: "var(--color-correct)",
  developing: "var(--color-medium)",
  weak: "var(--color-incorrect)",
  unknown: "var(--color-text-muted)",
};

/** Tailwind text class — for labels. */
export const MASTERY_BAND_TEXT: Record<MasteryBand, string> = {
  strong: "text-correct",
  developing: "text-medium",
  weak: "text-incorrect",
  unknown: "text-text-muted",
};

export const SUFFICIENCY_LABEL: Record<DataSufficiency, string> = {
  low: "Քիչ տվյալ",
  medium: "Միջին տվյալ",
  high: "Բավարար տվյալ",
};

/** Why it matters, in one line — a confidence badge nobody can interpret is
 *  just noise, so the tooltip/hint always ships with the badge. */
export const SUFFICIENCY_HINT: Record<DataSufficiency, string> = {
  low: "Քիչ պատասխաններ կան, ուստի այս թիվը դեռ կարող է շատ փոխվել։",
  medium: "Բավական տվյալ կա միտումը տեսնելու համար։",
  high: "Բավարար տվյալ կա՝ այս թիվը կայուն է։",
};

export const SUFFICIENCY_CLASS: Record<DataSufficiency, string> = {
  low: "border-border bg-surface-muted text-text-muted",
  medium: "border-primary/40 bg-primary/10 text-primary",
  high: "border-correct/40 bg-correct/10 text-correct",
};

export const PRIORITY_LABEL: Record<GoalPriority, string> = {
  low: "Ցածր",
  medium: "Միջին",
  high: "Բարձր",
};

export const PRIORITY_CLASS: Record<GoalPriority, string> = {
  low: "border-border bg-surface-muted text-text-muted",
  medium: "border-primary/40 bg-primary/10 text-primary",
  high: "border-incorrect/40 bg-incorrect/10 text-incorrect",
};

/**
 * Urgency band for an exam countdown. Kept as a function of days-left only, so
 * the timeline dot, the badge and the strategy card can never disagree about
 * whether something is urgent.
 */
export type ExamUrgency = "critical" | "soon" | "planned" | "past";

export function examUrgency(daysLeft: number): ExamUrgency {
  if (daysLeft < 0) return "past";
  if (daysLeft <= 10) return "critical";
  if (daysLeft <= 30) return "soon";
  return "planned";
}

export const EXAM_URGENCY_COLOR: Record<ExamUrgency, string> = {
  critical: "var(--color-incorrect)",
  soon: "var(--color-medium)",
  planned: "var(--color-primary)",
  past: "var(--color-text-muted)",
};

export const EXAM_URGENCY_TEXT: Record<ExamUrgency, string> = {
  critical: "text-incorrect",
  soon: "text-medium",
  planned: "text-primary",
  past: "text-text-muted",
};
