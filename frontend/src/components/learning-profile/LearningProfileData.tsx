import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as profileApi from "../../api/profile";
import type {
  CoachPreferences,
  LearningPreferences,
  PersonalGoal,
  StudentExam,
  StudentSubjectInterest,
  StudyAvailability,
} from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import { parseISODate } from "../ui/DatePicker";
import type { MasteryScore } from "../../api/knowledge";

/*
  One fetch of the learner's declared data for the whole page.

  Previously the hero and each section fetched independently, so opening
  /learning-profile issued the subjects, mastery, goals and exams requests
  twice each — the hero needs all four to summarise, and the sections below
  need them again to edit. Worse, each owned its own half of the truth: editing
  a goal updated the list but left the hero's "active goals" count stale until
  a reload.

  So: fetch once here, mutate through here. Sections still own their own
  *write* calls (they know their payloads); they just report the result back so
  every consumer sees it at the same time.

  `status` is a real four-state machine — a failed load surfaces a retry rather
  than an eternal skeleton.
*/

type Status = "loading" | "ready" | "error";

interface LearningProfileData {
  status: Status;
  reload: () => void;

  interests: StudentSubjectInterest[];
  scores: MasteryScore[];
  goals: PersonalGoal[];
  exams: StudentExam[];
  availability: StudyAvailability | null;
  preferences: LearningPreferences | null;
  coachPreferences: CoachPreferences | null;

  upsertInterest: (interest: StudentSubjectInterest) => void;
  removeInterest: (id: number) => void;
  addGoal: (goal: PersonalGoal) => void;
  replaceGoal: (goal: PersonalGoal) => void;
  removeGoal: (id: number) => void;
  addExam: (exam: StudentExam) => void;
  removeExam: (id: number) => void;
  setAvailability: (availability: StudyAvailability) => void;
  setPreferences: (preferences: LearningPreferences) => void;
  setCoachPreferences: (preferences: CoachPreferences) => void;
}

const Ctx = createContext<LearningProfileData | null>(null);

export function useLearningProfileData(): LearningProfileData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLearningProfileData must be used inside <LearningProfileDataProvider>");
  return ctx;
}

export function LearningProfileDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [interests, setInterests] = useState<StudentSubjectInterest[]>([]);
  const [scores, setScores] = useState<MasteryScore[]>([]);
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [availability, setAvailabilityState] = useState<StudyAvailability | null>(null);
  const [preferences, setPreferencesState] = useState<LearningPreferences | null>(null);
  const [coachPreferences, setCoachPreferencesState] = useState<CoachPreferences | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    // allSettled, not all: the page is seven independent slices, and under
    // Promise.all a single failing endpoint blanked all seven — including the
    // six that loaded fine. (That is not hypothetical: shipping the
    // coach-preferences endpoint without restarting the dev server made the
    // whole profile unreachable behind one 404.)
    //
    // Only the four slices the hero summarises are load-bearing. The three
    // settings singletons degrade to null, and their own section renders a
    // retry in place — one broken preference can't cost you the page.
    Promise.allSettled([
      profileApi.fetchSubjectInterests(),
      knowledgeApi.fetchSubjectMasteryScores(),
      profileApi.fetchGoals(),
      profileApi.fetchExams(),
      profileApi.fetchStudyAvailability(),
      profileApi.fetchLearningPreferences(),
      profileApi.fetchCoachPreferences(),
    ]).then(([i, s, g, e, a, p, cp]) => {
      if (
        i.status === "rejected" ||
        s.status === "rejected" ||
        g.status === "rejected" ||
        e.status === "rejected"
      ) {
        setStatus("error");
        return;
      }
      setInterests(i.value);
      setScores(s.value);
      setGoals(g.value);
      setExams(e.value);
      setAvailabilityState(a.status === "fulfilled" ? a.value : null);
      setPreferencesState(p.status === "fulfilled" ? p.value : null);
      setCoachPreferencesState(cp.status === "fulfilled" ? cp.value : null);
      setStatus("ready");
    });
  }, []);

  useEffect(load, [load]);

  const value = useMemo<LearningProfileData>(
    () => ({
      status,
      reload: load,
      interests,
      scores,
      goals,
      exams,
      availability,
      preferences,
      coachPreferences,
      upsertInterest: (updated) =>
        setInterests((prev) => {
          const idx = prev.findIndex((i) => i.id === updated.id);
          if (idx === -1) return [...prev, updated];
          const next = prev.slice();
          next[idx] = updated;
          return next;
        }),
      removeInterest: (id) => setInterests((prev) => prev.filter((i) => i.id !== id)),
      addGoal: (goal) => setGoals((prev) => [goal, ...prev]),
      replaceGoal: (goal) => setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))),
      removeGoal: (id) => setGoals((prev) => prev.filter((g) => g.id !== id)),
      addExam: (exam) =>
        setExams((prev) => [...prev, exam].sort((a, b) => a.exam_date.localeCompare(b.exam_date))),
      removeExam: (id) => setExams((prev) => prev.filter((e) => e.id !== id)),
      setAvailability: setAvailabilityState,
      setPreferences: setPreferencesState,
      setCoachPreferences: setCoachPreferencesState,
    }),
    [status, load, interests, scores, goals, exams, availability, preferences, coachPreferences],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------------------------------------------------------------------------
// Derived views — computed from the same single copy of the data, so the hero,
// the completeness meter and the sections can never disagree.
// ---------------------------------------------------------------------------

export function daysUntil(dateStr: string): number {
  // `new Date("2026-08-17")` parses as UTC midnight, so every timezone behind
  // Greenwich reads the countdown one day short. parseISODate builds a local
  // date from the fields instead.
  const target = parseISODate(dateStr);
  if (!target) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export interface NextExam {
  exam: StudentExam;
  daysLeft: number;
}

/** The soonest exam still ahead of us, which is the one every countdown and
 *  urgency treatment on the page refers to. */
export function nextUpcomingExam(exams: StudentExam[]): NextExam | null {
  const candidates = exams
    .filter((e) => e.status === "upcoming")
    .map((exam) => ({ exam, daysLeft: daysUntil(exam.exam_date) }))
    .filter((c) => c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return candidates[0] ?? null;
}

/** Average mastery across the subjects the student actually chose to focus on
 *  — not all five. Subjects without a score are excluded rather than counted
 *  as zero, so starting a new subject can't drag the headline number down. */
export function focusedAverageMastery(
  interests: StudentSubjectInterest[],
  scores: MasteryScore[],
): number | null {
  const scoreByKey = new Map(scores.map((s) => [s.subject_key, s]));
  const scored = interests
    .filter((i) => i.is_active)
    .map((i) => scoreByKey.get(i.subject_key))
    .filter((s): s is MasteryScore => !!s && s.mastery_score != null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, s) => sum + (s.mastery_score ?? 0), 0) / scored.length);
}

/** The availability record always exists (get-or-create), so "has the student
 *  told us anything" means at least one field carries a real value. */
export function hasDeclaredAvailability(a: StudyAvailability | null): boolean {
  if (!a) return false;
  return (
    a.preferred_days.length > 0 ||
    a.preferred_start_time != null ||
    a.typical_session_minutes != null ||
    a.min_daily_minutes != null ||
    a.max_daily_minutes != null
  );
}

export interface CompletenessStep {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  /** Section id to scroll to when the student acts on this step. */
  target: string;
}

/**
 * What Haygit still doesn't know about this student.
 *
 * Only counts things that genuinely change what the product can do for them —
 * this is a guide, not a score to farm. Each step names the payoff so it reads
 * as "here's what you unlock", not "you are 60% of a person".
 */
export function completenessSteps(data: {
  interests: StudentSubjectInterest[];
  goals: PersonalGoal[];
  exams: StudentExam[];
  hasAvailability: boolean;
  hasCadence: boolean;
}): CompletenessStep[] {
  return [
    {
      key: "subjects",
      label: "Ընտրիր առարկաներդ",
      hint: "Որպեսզի պլանը կենտրոնանա հենց քո առարկաների վրա։",
      done: data.interests.some((i) => i.is_active),
      target: "subjects",
    },
    {
      key: "goals",
      label: "Սահմանիր նպատակ",
      hint: "Որպեսզի Haygit-ը իմանա՝ ինչի ես ձգտում։",
      done: data.goals.length > 0,
      target: "goals",
    },
    {
      key: "exams",
      label: "Ավելացրու քննություն",
      hint: "Որպեսզի հաշվարկվի, թե որքան ժամանակ է մնացել։",
      done: data.exams.some((e) => e.status === "upcoming"),
      target: "exams",
    },
    {
      key: "schedule",
      label: "Նշիր՝ երբ ես սովորում",
      hint: "Որպեսզի առաջադրանքները տեղավորվեն քո օրվա մեջ։",
      done: data.hasAvailability,
      target: "schedule",
    },
    {
      key: "coach",
      label: "Ընտրիր թեստերի ռիթմը",
      hint: "Որպեսզի ամբողջական թեստերը միայն քեզ հարմար օրերին առաջարկվեն։",
      done: data.hasCadence,
      target: "coach",
    },
  ];
}

/** The cadence row is created on read with working defaults, so its values
 *  can't distinguish "chose the default" from "never looked" — only an
 *  explicit save can. Without this the completeness prompt would be
 *  unsatisfiable for anyone happy with 1 exam a week. */
export function hasChosenCadence(c: CoachPreferences | null): boolean {
  return c?.configured_at != null;
}
