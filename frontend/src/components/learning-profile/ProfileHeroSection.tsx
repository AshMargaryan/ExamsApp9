import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { PersonalGoal, StudentExam, StudentSubjectInterest } from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import type { MasteryScore } from "../../api/knowledge";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { SUBJECTS } from "../../lib/subjects";

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const ORBIT_RADIUS = 118;

function scrollToGoals() {
  document.getElementById("goals-section")?.scrollIntoView({ behavior: "smooth" });
}

export function ProfileHeroSection() {
  const { showError } = useToast();
  const [interests, setInterests] = useState<StudentSubjectInterest[] | null>(null);
  const [scores, setScores] = useState<MasteryScore[] | null>(null);
  const [goals, setGoals] = useState<PersonalGoal[] | null>(null);
  const [exams, setExams] = useState<StudentExam[] | null>(null);

  useEffect(() => {
    Promise.all([
      profileApi.fetchSubjectInterests(),
      knowledgeApi.fetchSubjectMasteryScores(),
      profileApi.fetchGoals(),
      profileApi.fetchExams(),
    ])
      .then(([i, s, g, e]) => {
        setInterests(i);
        setScores(s);
        setGoals(g);
        setExams(e);
      })
      .catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loaded = interests !== null && scores !== null && goals !== null && exams !== null;

  if (!loaded) {
    return (
      <div className="rounded-[calc(var(--radius)*1.15)] border border-border bg-surface p-7">
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      </div>
    );
  }

  const scoreByKey = new Map(scores.map((s) => [s.subject_key, s]));
  const focusedScored = interests
    .filter((i) => i.is_active)
    .map((i) => scoreByKey.get(i.subject_key))
    .filter((s): s is MasteryScore => !!s && s.mastery_score != null);
  const overallMastery = focusedScored.length
    ? Math.round(focusedScored.reduce((sum, s) => sum + (s.mastery_score ?? 0), 0) / focusedScored.length)
    : null;

  const upcomingExamDays = exams
    .filter((e) => e.status === "upcoming")
    .map((e) => daysUntil(e.exam_date))
    .filter((d) => d >= 0)
    .sort((a, b) => a - b)[0];

  const isEmpty = interests.length === 0 && goals.length === 0 && exams.length === 0;

  const orbitAngles = SUBJECTS.map((_, i) => (360 / SUBJECTS.length) * i);

  return (
    <div className="lp-rise-in relative overflow-hidden rounded-[calc(var(--radius)*1.15)] border border-border bg-surface p-7 sm:p-9">
      <div
        className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--color-pink)" }}
        aria-hidden="true"
      />

      <div className="relative grid items-center gap-8 sm:grid-cols-[1.1fr_auto]">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text sm:text-3xl">
            <Target size={26} strokeWidth={1.75} /> Իմ ուսումնական պրոֆիլը
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-text-muted">
            Ձեր նպատակները, առարկաները և ուսումնական սովորությունները՝ մեկ խելացի համակարգում։
          </p>

          {isEmpty ? (
            <button
              type="button"
              onClick={scrollToGoals}
              className="mt-5 inline-block rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              Սկսել →
            </button>
          ) : (
            <div className="mt-5 flex flex-wrap gap-7">
              <div>
                <div className="text-3xl font-semibold text-text">{overallMastery ?? "—"}{overallMastery != null && "%"}</div>
                <div className="text-xs text-text-muted">միջին իմացություն</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-text">{goals.length}</div>
                <div className="text-xs text-text-muted">ակտիվ նպատակ</div>
              </div>
              <div>
                <div className="text-3xl font-semibold text-text">{upcomingExamDays != null ? upcomingExamDays : "—"}{upcomingExamDays != null && " օր"}</div>
                <div className="text-xs text-text-muted">հաջորդ քննությունը</div>
              </div>
            </div>
          )}
        </div>

        <div className="mx-auto hidden h-[220px] w-[220px] items-center justify-center sm:flex">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center">
            <div
              className="flex h-[150px] w-[150px] items-center justify-center rounded-full shadow-[var(--shadow-md)]"
              style={
                overallMastery != null
                  ? { background: `conic-gradient(from -90deg, var(--color-primary) 0%, var(--color-purple) ${overallMastery / 2}%, var(--color-pink) ${overallMastery}%, var(--color-surface-muted) 0)` }
                  : { background: "repeating-conic-gradient(var(--color-surface-muted) 0deg 8deg, transparent 8deg 16deg)" }
              }
            >
              <div className="flex h-[118px] w-[118px] flex-col items-center justify-center gap-0.5 rounded-full bg-bg text-center">
                <span className="text-3xl font-semibold text-text">{overallMastery != null ? `${overallMastery}%` : "—"}</span>
                <span className="max-w-[90px] text-[11px] text-text-muted">
                  {overallMastery != null ? "միջին իմացություն" : "տվյալներ դեռ չկան"}
                </span>
              </div>
            </div>

            <div className="lp-orbit-ring pointer-events-none absolute inset-0" aria-hidden="true">
              {SUBJECTS.map((subject, i) => (
                <div
                  key={subject.key}
                  className="absolute top-1/2 left-1/2"
                  style={{ transform: `translate(-50%, -50%) rotate(${orbitAngles[i]}deg) translate(${ORBIT_RADIUS}px) rotate(-${orbitAngles[i]}deg)` }}
                >
                  <div
                    className="lp-orbit-chip flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-base shadow-[var(--shadow-sm)]"
                    title={subject.label}
                  >
                    {subject.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
