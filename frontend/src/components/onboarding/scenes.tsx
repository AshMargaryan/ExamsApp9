import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, GraduationCap, School, Search, Users } from "lucide-react";
import type { AccountRole } from "../../api/auth";
import { searchSchools } from "../../api/schools";

/*
  The scenes. One question per screen, each with its own visual identity, all
  drawn from the same small vocabulary so the flow reads as one product rather
  than eight demos.

  Every scene is a controlled component over one field of the draft and calls
  `onNext` itself — a card grid advances on click, a text field on submit. The
  page owns the sequence; a scene never knows which step it is.
*/

export type Draft = {
  role: AccountRole | null;
  first_name: string;
  last_name: string;
  age: string;
  grade: number | null;
  school: { id: number; name: string } | null;
  subjects: string[];
  exam_date: string;
  username: string;
  email: string;
  password: string;
};

export const EMPTY_DRAFT: Draft = {
  role: null,
  first_name: "",
  last_name: "",
  age: "",
  grade: null,
  school: null,
  subjects: [],
  exam_date: "",
  username: "",
  email: "",
  password: "",
};

/* The five with a real question bank. `key` is MockExamSubject's value, so
   these post straight to /profile/subjects/ without a lookup table. */
export const SUBJECTS = [
  { key: "math", label: "Մաթեմատիկա" },
  { key: "physics", label: "Ֆիզիկա" },
  { key: "chemistry", label: "Քիմիա" },
  { key: "biology", label: "Կենսաբանություն" },
  { key: "english", label: "Անգլերեն" },
];

export function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const then = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((then.getTime() - now.getTime()) / 86_400_000));
}

/* ------------------------------------------------------------ scene chrome */

/** Question + optional acknowledgement of what was just said. The `--i` on
    each child drives the stagger; the order is ack → question → input. */
export function Scene({
  ack,
  question,
  hint,
  children,
}: {
  ack?: string;
  question: string;
  hint?: string;
  children: ReactNode;
}) {
  let i = 0;
  return (
    <div className="ob-scene mx-auto w-full max-w-xl">
      {ack && (
        <p
          className="mb-3 text-[length:var(--text-sm)] text-night-ink-dim"
          style={{ ["--i" as string]: i++ }}
        >
          {ack}
        </p>
      )}
      <h1
        className="font-display text-[clamp(1.9rem,5vw,3rem)] leading-[1.1] font-semibold tracking-[var(--tracking-tight)]"
        style={{ ["--i" as string]: i++ }}
      >
        {question}
      </h1>
      {hint && (
        <p
          className="mt-3 text-[length:var(--text-base)] text-night-ink-muted"
          style={{ ["--i" as string]: i++ }}
        >
          {hint}
        </p>
      )}
      <div className="mt-9" style={{ ["--i" as string]: i++ }}>
        {children}
      </div>
    </div>
  );
}

const INPUT =
  "w-full rounded-[var(--radius-lg)] border border-night-line bg-night-fill px-4 py-3.5 text-[length:var(--text-lg)] text-night-ink placeholder:text-night-ink-dim focus:border-night-ink focus:outline-none";

export function NextButton({ disabled, label = "Շարունակել" }: { disabled?: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-7 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-35"
    >
      {label} <span aria-hidden>→</span>
    </button>
  );
}

/** A text scene. Autofocused because the whole screen is this one field. */
export function TextScene({
  ack,
  question,
  hint,
  value,
  onChange,
  onNext,
  type = "text",
  placeholder,
  autoComplete,
}: {
  ack?: string;
  question: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <Scene ack={ack} question={question} hint={hint}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onNext();
        }}
      >
        <input
          ref={ref}
          className={INPUT}
          value={value}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-label={question}
        />
        <NextButton disabled={!value.trim()} />
      </form>
    </Scene>
  );
}

/* -------------------------------------------------------------- role scene */

const ROLES: Array<{ id: AccountRole; label: string; line: string; Icon: typeof Users }> = [
  { id: "student", label: "Աշակերտ", line: "Պատրաստվում եմ քննության", Icon: GraduationCap },
  { id: "teacher", label: "Ուսուցիչ", line: "Դասավանդում եմ աշակերտների", Icon: School },
  { id: "parent", label: "Ծնող", line: "Հետևում եմ երեխայիս", Icon: Users },
];

export function RoleScene({ onPick }: { onPick: (r: AccountRole) => void }) {
  return (
    <Scene question="Ո՞վ ես դու։" hint="Սրանից է կախված՝ ինչ ենք ցույց տալու քեզ։">
      <div className="grid gap-3">
        {ROLES.map(({ id, label, line, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-night-line bg-night-fill px-5 py-4 text-left transition-colors hover:border-night-ink"
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden />
            <span>
              <span className="block text-[length:var(--text-lg)] font-semibold">{label}</span>
              <span className="block text-[length:var(--text-sm)] text-night-ink-muted">{line}</span>
            </span>
          </button>
        ))}
      </div>
    </Scene>
  );
}

/* ------------------------------------------------------------- grade scene */

export function GradeScene({ ack, onPick }: { ack?: string; onPick: (g: number) => void }) {
  return (
    <Scene ack={ack} question="Ո՞ր դասարանում ես։">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[9, 10, 11, 12].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onPick(g)}
            className="rounded-[var(--radius-lg)] border border-night-line bg-night-fill py-6 font-display text-[length:var(--text-3xl)] font-semibold transition-colors hover:border-night-ink"
          >
            {g}
          </button>
        ))}
      </div>
    </Scene>
  );
}

/* ------------------------------------------------------------ school scene */

export function SchoolScene({
  ack,
  onPick,
  onSkip,
}: {
  ack?: string;
  onPick: (s: { id: number; name: string }) => void;
  onSkip: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    /* Debounced so a fast typist does not open a request per keystroke, and
       cancelled on change so a slow earlier response cannot overwrite a
       newer one. */
    let live = true;
    const t = setTimeout(() => {
      searchSchools(q)
        .then((r) => live && setResults(r.slice(0, 6)))
        .catch(() => live && setResults([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <Scene ack={ack} question="Ո՞ր դպրոցում ես սովորում։" hint="Սա օգնում է համեմատել դասընկերներիդ հետ։">
      <div className="relative">
        <Search
          size={17}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-night-ink-dim"
        />
        <input
          className={`${INPUT} pl-11`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Սկսիր գրել դպրոցի անունը"
          aria-label="Դպրոցի որոնում"
          autoFocus
        />
      </div>

      {results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className="w-full rounded-[var(--radius-md)] border border-night-line bg-night-fill px-4 py-3 text-left text-[length:var(--text-sm)] transition-colors hover:border-night-ink"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="mt-5 min-h-11 text-[length:var(--text-sm)] text-night-ink-dim underline-offset-4 hover:underline"
      >
        Բաց թողնել
      </button>
    </Scene>
  );
}

/* ----------------------------------------------------- subject constellation */

export function SubjectScene({
  ack,
  selected,
  onToggle,
  onNext,
}: {
  ack?: string;
  selected: string[];
  onToggle: (k: string) => void;
  onNext: () => void;
}) {
  /* Positions on a ring, computed once. The centre is the student; a chosen
     subject moves toward them and its line lights. */
  const nodes = useMemo(
    () =>
      SUBJECTS.map((s, i) => {
        const a = (i / SUBJECTS.length) * Math.PI * 2 - Math.PI / 2;
        return { ...s, x: 50 + Math.cos(a) * 36, y: 50 + Math.sin(a) * 34 };
      }),
    [],
  );

  return (
    <Scene ack={ack} question="Ո՞ր առարկաներն են քեզ պետք։" hint="Ընտրիր այնքան, որքան պետք է։">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-lg">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {nodes.map((n) => (
            <line
              key={n.key}
              className="ob-link"
              x1="50"
              y1="50"
              x2={n.x}
              y2={n.y}
              stroke="var(--color-night-ink)"
              strokeWidth={selected.includes(n.key) ? 0.5 : 0.2}
              opacity={selected.includes(n.key) ? 0.55 : 0.14}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        <span
          className="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-night-ink"
          aria-hidden
        />

        {nodes.map((n) => {
          const on = selected.includes(n.key);
          return (
            <button
              key={n.key}
              type="button"
              onClick={() => onToggle(n.key)}
              data-on={on}
              aria-pressed={on}
              style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%,-50%)" }}
              className="ob-node absolute inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] border border-night-line bg-night-fill px-4 text-[length:var(--text-sm)] whitespace-nowrap"
            >
              {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
              {n.label}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={onNext}
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-7 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-35"
        >
          Շարունակել <span aria-hidden>→</span>
        </button>
      </div>
    </Scene>
  );
}

/* --------------------------------------------------------------- exam date */

export function ExamScene({
  ack,
  value,
  onChange,
  onNext,
}: {
  ack?: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const days = daysUntil(value);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Scene ack={ack} question="Ե՞րբ է քո քննությունը։" hint="Ամեն ինչ, ինչ կառուցում ենք, հենվում է այս ամսաթվի վրա։">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (days !== null) onNext();
        }}
      >
        <input
          type="date"
          min={today}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
          aria-label="Քննության ամսաթիվ"
        />

        {/* The date stops being a form value the moment it becomes a countdown.
            This is the whole reason the question is asked here rather than in
            settings later. */}
        {days !== null && (
          <div className="ob-fact mt-8">
            <div className="flex items-center gap-3 text-[length:var(--text-xs)] text-night-ink-dim">
              <span>ԱՅՍՕՐ</span>
              <span className="h-px flex-1 bg-night-line" />
              <span>ՔՆՆՈՒԹՅՈՒՆ</span>
            </div>
            <p className="mt-4 text-center font-display text-[clamp(3rem,12vw,5.5rem)] leading-none font-semibold tabular-nums">
              {days}
            </p>
            <p className="mt-2 text-center text-[length:var(--text-base)] text-night-ink-muted">
              օր՝ քո ճանապարհը կառուցելու համար։
            </p>
          </div>
        )}

        <NextButton disabled={days === null} />
      </form>
    </Scene>
  );
}

/* ----------------------------------------------------------- identity panel */

/** The profile as it accretes. Each fact animates in the first time it exists,
    so the student watches themselves being described rather than being shown a
    summary at the end. */
export function IdentityPanel({ draft }: { draft: Draft }) {
  const days = daysUntil(draft.exam_date);
  const facts: string[] = [];
  if (draft.first_name) facts.push([draft.first_name, draft.last_name].filter(Boolean).join(" "));
  if (draft.age) facts.push(`${draft.age} տարեկան`);
  if (draft.grade) facts.push(`${draft.grade}-րդ դասարան`);
  if (draft.school) facts.push(draft.school.name);
  if (draft.subjects.length) {
    facts.push(
      draft.subjects.map((k) => SUBJECTS.find((s) => s.key === k)?.label ?? k).join(" · "),
    );
  }
  if (days !== null) facts.push(`${days} օր մինչև քննությունը`);

  if (facts.length === 0) return null;

  return (
    /*
      A column on a laptop, an inline wrapped list on a phone.

      As a column it grew a line per answer, and by the subjects step the
      header was ~290px tall on a 375px screen — a third of the viewport spent
      restating what the student had just typed, pushing the question they are
      actually answering below the fold. Wrapping keeps every fact visible
      (the point is watching the profile accrete) without the height.
    */
    <ul
      className="flex max-w-[62%] flex-wrap justify-end gap-x-2 gap-y-0.5 text-right sm:max-w-none sm:flex-col sm:gap-y-1.5"
      aria-label="Քո պրոֆիլը"
    >
      {facts.map((f, i) => (
        <li key={f} className="ob-fact text-[length:var(--text-xs)] text-night-ink-muted sm:text-[length:var(--text-sm)]">
          {i > 0 && <span className="mr-2 text-night-line sm:hidden" aria-hidden>·</span>}
          {f}
        </li>
      ))}
    </ul>
  );
}
