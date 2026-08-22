import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "../components/Logo";
import { createExam, createSubjectInterest } from "../api/profile";
import {
  EMPTY_DRAFT,
  ExamScene,
  GradeScene,
  IdentityPanel,
  RoleScene,
  SUBJECTS,
  SchoolScene,
  Scene,
  SubjectScene,
  TextScene,
  daysUntil,
} from "../components/onboarding/scenes";
import type { Draft } from "../components/onboarding/scenes";
import { RevealScene, TransformScene } from "../components/onboarding/Finale";
import { PlanChoice } from "../components/onboarding/PlanChoice";

/*
  ONBOARDING — sign-up as a sequence of scenes rather than a form.

  The order is deliberate and is the whole design: everything that costs the
  student nothing to answer comes first, the account is created near the end,
  and the payoff is a plan built from what they just said.

  Why the account is not first. A registration form asks for a password before
  it has given anything, so the first thing the product does is take. Here the
  student has already built a profile and watched it assemble by the time the
  password is asked for, and the ask is framed as keeping it («Պահենք քո ուղին»)
  rather than as a gate. The audit's research section covers the evidence.

  What is real and what is not, exactly:

  * first/last name, age, grade, school → the register payload. Real fields on
    the User model.
  * subjects → POST /profile/subjects/ after the account exists. Real
    StudentSubject rows, keyed by MockExamSubject values.
  * exam date → POST /profile/exams/. A real StudentExam.
  * the countdown → arithmetic on that date.
  * the first-day plan in the reveal → assembled from the chosen subjects. It
    is shaped by their answers, which is honest. It is NOT a diagnosis: the
    product has no diagnostic, so nothing here claims to know their level.

  If the subject/exam writes fail, the account still exists and the student
  still gets in — losing a preference is not a reason to strand someone
  outside an account they just created. The failure is logged, not swallowed
  into a dead end.
*/

type Step =
  | "role"
  | "first_name"
  | "last_name"
  | "age"
  | "grade"
  | "school"
  | "subjects"
  | "exam"
  | "transform"
  | "account"
  | "reveal"
  | "plan";

const STUDENT_STEPS: Step[] = [
  "role",
  "first_name",
  "last_name",
  "age",
  "grade",
  "school",
  "subjects",
  "exam",
  "transform",
  "account",
  "reveal",
  "plan",
];

/* A teacher is not preparing for an exam and a parent is not choosing
   subjects. Asking them anyway would be the questionnaire this flow exists to
   avoid. */
const ADULT_STEPS: Step[] = ["role", "first_name", "last_name", "account", "reveal", "plan"];

export function OnboardingPage() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = draft.role === "student" || draft.role === null ? STUDENT_STEPS : ADULT_STEPS;
  const step = steps[Math.min(index, steps.length - 1)];
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const next = () => setIndex((i) => i + 1);

  /* Progress is a hairline, not "step 4 of 11". The reveal is not progress —
     it is the destination — so the bar is full by then. */
  const progress = useMemo(
    () => Math.min(1, index / Math.max(1, steps.length - 1)),
    [index, steps.length],
  );

  async function createAccount() {
    setBusy(true);
    setError(null);
    try {
      await register({
        username: draft.username.trim(),
        email: draft.email.trim(),
        password: draft.password,
        confirm_password: draft.password,
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        role: draft.role ?? "student",
        ...(draft.age ? { age: Number(draft.age) } : {}),
        ...(draft.grade ? { grade: draft.grade } : {}),
        ...(draft.school ? { school: draft.school.id } : {}),
      });
      /* Registration does not sign anyone in, so the profile writes below
         would have no credentials without this. */
      await login(draft.username.trim(), draft.password);
      next();
    } catch (e) {
      const detail =
        (e as { response?: { data?: Record<string, unknown> } })?.response?.data ?? null;
      setError(firstError(detail) ?? "Չհաջողվեց ստեղծել հաշիվը։ Ստուգիր տվյալները։");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    /* Preferences are saved now that there is a session. Failures here are
       deliberately non-blocking — see the header. */
    const days = daysUntil(draft.exam_date);
    await Promise.allSettled([
      ...draft.subjects.map((key, i) =>
        createSubjectInterest({ subject_key: key, is_active: true, priority: i === 0 ? "high" : "medium" }),
      ),
      ...(days !== null
        ? [createExam({ name: "Միասնական քննություն", exam_date: draft.exam_date })]
        : []),
    ]);
    navigate(draft.role === "parent" ? "/family" : "/");
  }

  return (
    <div className="ob-root flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Gitus">
          <Logo className="h-6 w-6" />
          <span className="font-display text-[length:var(--text-base)] font-bold tracking-[var(--tracking-tight)]">
            Gitus
          </span>
        </Link>
        <IdentityPanel draft={draft} />
      </header>

      <div className="h-px w-full bg-night-line" aria-hidden>
        <div
          className="ob-progress-fill h-px bg-night-ink"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <main className="flex flex-1 items-center px-5 py-12 sm:px-8">
        {/* Keyed on the step so each scene mounts fresh and plays its entrance;
            without the key React would reuse the DOM and nothing would move. */}
        <div key={step} className="w-full">
          {step === "role" && (
            <RoleScene
              onPick={(r) => {
                set({ role: r });
                next();
              }}
            />
          )}

          {step === "first_name" && (
            <TextScene
              question="Ինչպե՞ս է քեզ կոչում։"
              hint="Սկսենք քեզնից։"
              value={draft.first_name}
              onChange={(v) => set({ first_name: v })}
              onNext={next}
              autoComplete="given-name"
              placeholder="Դանիել"
            />
          )}

          {step === "last_name" && (
            <TextScene
              ack={`Հաճելի է, ${draft.first_name}։`}
              question="Իսկ ազգանունդ։"
              value={draft.last_name}
              onChange={(v) => set({ last_name: v })}
              onNext={next}
              autoComplete="family-name"
            />
          )}

          {step === "age" && (
            <TextScene
              question="Քանի՞ տարեկան ես։"
              value={draft.age}
              onChange={(v) => set({ age: v.replace(/\D/g, "").slice(0, 2) })}
              onNext={next}
              type="text"
              placeholder="17"
            />
          )}

          {step === "grade" && (
            <GradeScene
              onPick={(g) => {
                set({ grade: g });
                next();
              }}
            />
          )}

          {step === "school" && (
            <SchoolScene
              ack={`Լավ, ${draft.first_name}։`}
              onPick={(s) => {
                set({ school: s });
                next();
              }}
              onSkip={next}
            />
          )}

          {step === "subjects" && (
            <SubjectScene
              selected={draft.subjects}
              onToggle={(k) =>
                set({
                  subjects: draft.subjects.includes(k)
                    ? draft.subjects.filter((s) => s !== k)
                    : [...draft.subjects, k],
                })
              }
              onNext={next}
            />
          )}

          {step === "exam" && (
            <ExamScene
              ack={
                draft.subjects.length
                  ? `${draft.subjects
                      .map((k) => SUBJECTS.find((s) => s.key === k)?.label)
                      .filter(Boolean)
                      .join(" · ")}։ Հասկացա։`
                  : undefined
              }
              value={draft.exam_date}
              onChange={(v) => set({ exam_date: v })}
              onNext={next}
            />
          )}

          {step === "transform" && <TransformScene onNext={next} />}

          {step === "account" && (
            <Scene
              question="Պահենք քո ուղին։"
              hint="Որպեսզի հաջորդ անգամ այն սպասի քեզ։"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void createAccount();
                }}
                className="flex flex-col gap-3"
              >
                <input
                  className="w-full rounded-[var(--radius-lg)] border border-night-line bg-night-fill px-4 py-3.5 text-[length:var(--text-lg)] text-night-ink placeholder:text-night-ink-dim focus:border-night-ink focus:outline-none"
                  value={draft.username}
                  onChange={(e) => set({ username: e.target.value })}
                  placeholder="Օգտանուն"
                  aria-label="Օգտանուն"
                  autoComplete="username"
                  autoFocus
                />
                <input
                  className="w-full rounded-[var(--radius-lg)] border border-night-line bg-night-fill px-4 py-3.5 text-[length:var(--text-lg)] text-night-ink placeholder:text-night-ink-dim focus:border-night-ink focus:outline-none"
                  value={draft.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="Էլ. փոստ"
                  aria-label="Էլ. փոստ"
                  type="email"
                  autoComplete="email"
                />
                <input
                  className="w-full rounded-[var(--radius-lg)] border border-night-line bg-night-fill px-4 py-3.5 text-[length:var(--text-lg)] text-night-ink placeholder:text-night-ink-dim focus:border-night-ink focus:outline-none"
                  value={draft.password}
                  onChange={(e) => set({ password: e.target.value })}
                  placeholder="Գաղտնաբառ"
                  aria-label="Գաղտնաբառ"
                  type="password"
                  autoComplete="new-password"
                />
                <p className="text-[length:var(--text-xs)] text-night-ink-dim">
                  Առնվազն 8 նիշ՝ գոնե մեկ տառ և մեկ թիվ։
                </p>

                {error && (
                  <p role="alert" className="text-[length:var(--text-sm)] text-[#f28ba6]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy || !draft.username.trim() || !draft.email.trim() || draft.password.length < 8}
                  className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-8 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-35"
                >
                  {busy ? "Պահում ենք…" : "Պահել և շարունակել →"}
                </button>

                <p className="text-center text-[length:var(--text-sm)] text-night-ink-dim">
                  Արդեն հաշիվ ունե՞ս{" "}
                  <Link to="/login" className="text-night-ink underline underline-offset-4">
                    Մուտք
                  </Link>
                </p>
              </form>
            </Scene>
          )}

          {step === "reveal" && <RevealScene draft={draft} onStart={next} busy={false} />}

          {step === "plan" && <PlanChoice draft={draft} onStart={() => void finish()} busy={busy} />}
        </div>
      </main>
    </div>
  );
}

/** DRF returns `{field: [message]}`; surface the first real message rather
    than a generic failure, since most of them are actionable and already
    Armenian. */
function firstError(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  for (const value of Object.values(data)) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (value && typeof value === "object" && "message" in value) {
      const m = (value as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
  }
  return null;
}
