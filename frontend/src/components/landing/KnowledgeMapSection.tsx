import { useState } from "react";
import { CircleHelp, Flame, Minus, TrendingUp, Trophy } from "lucide-react";
import { DemoNote, Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 5 — an open learner model, on the night ground.

  This replaces ProgressSection (a bar chart of five invented weeks) and
  absorbs GamificationSection + LeaderboardSection, which between them spent
  1,506px arguing that streaks are motivating.

  The research this is built on: opening the system's model of the learner to
  the learner raises awareness, engagement and self-regulation (Hooshyar et
  al., BJET 2019; ScienceDirect systematic review 2020). The literature grades
  such models Inspectable -> Negotiable -> Editable -> Persuasive; this is an
  Inspectable one, which is what Gitus can honestly claim today.

  The data shape is real. `analytics.skill_map()` already returns exactly
  this: attempted topics with a mastery score and an attempt count, plus
  topics never attempted, whose mastery is `null`. `knowledge/scoring.py`
  computes the score with a 30-day half-life and labels its own
  `data_sufficiency` low/medium/high by attempt count.

  The fourth state is the differentiator. Most mastery visualisations have
  three colours. This one has three colours and an *admission* — «դեռ
  չգիտենք» — because the engine genuinely distinguishes "no evidence" from
  "known to be weak". A system that says what it does not know is easier to
  trust than one that renders every unknown as a red zero.

  Numbers are invented (a visitor has no account); the note says so. The
  shape, the thresholds and the four states are not.
*/

type Topic = {
  name: string;
  domain: string;
  /** null = never attempted. Mirrors skill_map()'s `mastery: null`. */
  mastery: number | null;
  attempts: number;
};

const SUBJECTS: { id: string; label: string; topics: Topic[] }[] = [
  {
    id: "math",
    label: "Մաթեմատիկա",
    topics: [
      { name: "Գծային հավասարումներ", domain: "Հանրահաշիվ", mastery: 91, attempts: 42 },
      { name: "Քառակուսի հավասարումներ", domain: "Հանրահաշիվ", mastery: 48, attempts: 31 },
      { name: "Անհավասարումներ", domain: "Հանրահաշիվ", mastery: 78, attempts: 18 },
      { name: "Ֆունկցիաներ", domain: "Հանրահաշիվ", mastery: 62, attempts: 4 },
      { name: "Եռանկյուններ", domain: "Երկրաչափություն", mastery: 84, attempts: 26 },
      { name: "Շրջանագիծ", domain: "Երկրաչափություն", mastery: 39, attempts: 12 },
      { name: "Ստերեոմետրիա", domain: "Երկրաչափություն", mastery: null, attempts: 0 },
      { name: "Հավանականություն", domain: "Վիճակագրություն", mastery: null, attempts: 0 },
    ],
  },
  {
    id: "physics",
    label: "Ֆիզիկա",
    topics: [
      { name: "Կինեմատիկա", domain: "Մեխանիկա", mastery: 71, attempts: 22 },
      { name: "Դինամիկա", domain: "Մեխանիկա", mastery: 55, attempts: 9 },
      { name: "Պահպանման օրենքներ", domain: "Մեխանիկա", mastery: 88, attempts: 17 },
      { name: "Ջերմաքանակ", domain: "Ջերմադինամիկա", mastery: 43, attempts: 6 },
      { name: "Էլեկտրական հոսանք", domain: "Էլեկտրականություն", mastery: null, attempts: 0 },
      { name: "Մագնիսական դաշտ", domain: "Էլեկտրականություն", mastery: null, attempts: 0 },
    ],
  },
  {
    id: "chemistry",
    label: "Քիմիա",
    topics: [
      { name: "Ատոմի կառուցվածք", domain: "Ընդհանուր քիմիա", mastery: 80, attempts: 15 },
      { name: "Քիմիական կապեր", domain: "Ընդհանուր քիմիա", mastery: 78, attempts: 20 },
      { name: "Ռեակցիաների տեսակներ", domain: "Ընդհանուր քիմիա", mastery: 51, attempts: 11 },
      { name: "Օքսիդներ", domain: "Անօրգանական քիմիա", mastery: 34, attempts: 8 },
      { name: "Ածխաջրածիններ", domain: "Օրգանական քիմիա", mastery: null, attempts: 0 },
    ],
  },
];

/* MASTERED_SCORE_THRESHOLD in study_plan/services.py is 75 — the same number
   that retires a topic from the plan. The band boundaries here are that
   threshold and its midpoint, not decorative round numbers. */
type Band = "strong" | "mid" | "weak" | "unknown";

function bandOf(mastery: number | null): Band {
  if (mastery === null) return "unknown";
  if (mastery >= 75) return "strong";
  if (mastery >= 50) return "mid";
  return "weak";
}

const BAND_LABEL: Record<Band, string> = {
  strong: "Տիրապետում ես",
  mid: "Առաջընթաց կա",
  weak: "Թույլ կողմ",
  unknown: "Դեռ չգիտենք",
};

const BAND_VAR: Record<Band, string> = {
  strong: "var(--mastery-strong)",
  mid: "var(--mastery-mid)",
  weak: "var(--mastery-weak)",
  unknown: "var(--mastery-unknown)",
};

/* `_sufficiency()` in knowledge/scoring.py: <=4 low, <=14 medium, else high. */
function sufficiency(attempts: number): { label: string; caveat: string | null } {
  if (attempts === 0) {
    return { label: "Պատասխաններ չկան", caveat: "Այս թեմայից դեռ ոչ մի հարցի չես պատասխանել։" };
  }
  if (attempts <= 4) {
    return {
      label: "Քիչ տվյալ",
      caveat: "Ընդամենը մի քանի պատասխան։ Այս գնահատականին դեռ շատ մի վստահիր։",
    };
  }
  if (attempts <= 14) {
    return { label: "Միջին տվյալ", caveat: "Գնահատականը դեռ կարող է զգալի փոխվել։" };
  }
  return { label: "Բավարար տվյալ", caveat: null };
}

export function KnowledgeMapSection() {
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [selected, setSelected] = useState<string | null>("Քառակուսի հավասարումներ");

  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  const topic = subject.topics.find((t) => t.name === selected) ?? subject.topics[0];
  const band = bandOf(topic.mastery);
  const suff = sufficiency(topic.attempts);

  const domains = Array.from(new Set(subject.topics.map((t) => t.domain)));

  return (
    <Section id="progress" tone="night">
      <SectionHeading
        tone="night"
        kicker="Քո գիտելիքի քարտեզը"
        title="Ահա՝ ինչ գիտենք քո մասին։"
        subtitle="Ամեն թեմա ունի գնահատական, որը կառուցվում է քո վերջին պատասխաններից։ Ներառյալ այն թեմաները, որոնց մասին դեռ ոչինչ չգիտենք։"
      />

      <Reveal className="mt-14">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Ընտրիր առարկան"
        >
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSubjectId(s.id);
                setSelected(null);
              }}
              aria-pressed={s.id === subjectId}
              className={`min-h-11 rounded-[var(--radius-full)] border px-5 text-[length:var(--text-sm)] font-semibold transition-colors ${
                s.id === subjectId
                  ? "border-night-ink bg-night-ink text-night"
                  : "border-night-line text-night-ink-muted hover:text-night-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
          <div className="flex flex-col gap-7">
            {domains.map((domain) => (
              <div key={domain}>
                <p className="text-[length:var(--text-sm)] font-semibold text-night-ink-dim">
                  {domain}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {subject.topics
                    .filter((t) => t.domain === domain)
                    .map((t) => {
                      const b = bandOf(t.mastery);
                      const isSelected = t.name === topic.name;
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setSelected(t.name)}
                          aria-pressed={isSelected}
                          className={`lp-night-panel flex min-h-11 flex-col gap-2 rounded-[var(--radius-lg)] px-4 py-3 text-left transition-colors ${
                            isSelected ? "!border-night-ink" : "hover:!border-night-ink-dim"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="text-[length:var(--text-sm)] font-medium text-night-ink">
                              {t.name}
                            </span>
                            {/* Never colour alone: the number is the label for
                                a known score, and an em-dash marks the state
                                that has no number at all. */}
                            <span
                              className="flex-none text-[length:var(--text-sm)] font-semibold tabular-nums"
                              style={{ color: BAND_VAR[b] }}
                            >
                              {t.mastery === null ? "—" : `${t.mastery}%`}
                            </span>
                          </span>
                          <span
                            className="h-1.5 w-full overflow-hidden rounded-[var(--radius-full)]"
                            style={{ background: "rgba(245,239,228,.1)" }}
                            aria-hidden
                          >
                            <span
                              className="block h-full rounded-[var(--radius-full)]"
                              style={{
                                width: `${t.mastery ?? 0}%`,
                                background: BAND_VAR[b],
                              }}
                            />
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[length:var(--text-xs)] text-night-ink-dim">
              {(["strong", "mid", "weak", "unknown"] as Band[]).map((b) => (
                <li key={b} className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-[var(--radius-full)]"
                    style={{ background: BAND_VAR[b] }}
                    aria-hidden
                  />
                  {BAND_LABEL[b]}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-night-panel rounded-[var(--radius-xl)] p-6" aria-live="polite">
            <p className="text-[length:var(--text-sm)] text-night-ink-dim">{topic.domain}</p>
            <p className="mt-1.5 font-display text-[length:var(--text-2xl)] leading-[var(--leading-heading)] text-night-ink">
              {topic.name}
            </p>

            <p
              className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-full)] px-3.5 py-1.5 text-[length:var(--text-sm)] font-semibold"
              style={{
                color: BAND_VAR[band],
                border: `1px solid ${BAND_VAR[band]}`,
              }}
            >
              {band === "strong" && <Trophy size={15} strokeWidth={2} aria-hidden />}
              {band === "mid" && <TrendingUp size={15} strokeWidth={2} aria-hidden />}
              {band === "weak" && <Minus size={15} strokeWidth={2} aria-hidden />}
              {band === "unknown" && <CircleHelp size={15} strokeWidth={2} aria-hidden />}
              {BAND_LABEL[band]}
            </p>

            <dl className="mt-6 flex flex-col gap-3 border-t border-night-line pt-6 text-[length:var(--text-sm)]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-night-ink-muted">Տիրապետում</dt>
                <dd className="font-semibold tabular-nums text-night-ink">
                  {topic.mastery === null ? "—" : `${topic.mastery}%`}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-night-ink-muted">Պատասխանած հարցեր</dt>
                <dd className="font-semibold tabular-nums text-night-ink">{topic.attempts}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-night-ink-muted">Տվյալի բավարարություն</dt>
                <dd className="font-semibold text-night-ink">{suff.label}</dd>
              </div>
            </dl>

            {/* The honest part. A score built on four answers is not the same
                claim as one built on forty, and the engine already knows the
                difference — so the interface says it out loud. */}
            {suff.caveat && (
              <p className="mt-4 rounded-[var(--radius-lg)] px-4 py-3 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-night-ink-muted" style={{ background: "rgba(245,239,228,.06)" }}>
                {suff.caveat}
              </p>
            )}

            <p className="mt-6 border-t border-night-line pt-6 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-night-ink-muted">
              {band === "unknown"
                ? "Առաջին իսկ պատասխաններից հետո այս թեման կստանա իր գնահատականը։"
                : band === "strong"
                  ? "Այս թեման հազվադեպ կհայտնվի քո օրվա պլանում. ժամանակը պետք է թույլ կողմերին։"
                  : "Այս թեման այսօր առաջինն է քո պլանում։"}
            </p>
          </div>
        </div>

        {/* Motivation, subordinated. Streaks and rank are real features and
            they belong on this page, but they are a footnote to the knowledge
            model, not a rival to it — the old page gave them two full
            sections and 1,506px. */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-night-line pt-8 text-[length:var(--text-sm)] text-night-ink-muted">
          <span className="inline-flex items-center gap-2">
            <Flame size={16} strokeWidth={1.75} aria-hidden />7 օրյա շարք
          </span>
          <span className="inline-flex items-center gap-2">
            <TrendingUp size={16} strokeWidth={1.75} aria-hidden />
            Մակարդակ 3 · 349 XP
          </span>
          <span className="inline-flex items-center gap-2">
            <Trophy size={16} strokeWidth={1.75} aria-hidden />
            #4 դասարանում այս ամիս
          </span>
        </div>

        <DemoNote tone="night" className="mt-6 text-center">
          Ցուցադրական քարտեզ։ Իրական հաշվում ամեն գնահատական հաշվարկվում է քո պատասխաններից՝ վերջին
          30 օրվա կրկնակի կշռով, և չպարապած թեմաները մնում են «դեռ չգիտենք» վիճակում։
        </DemoNote>
      </Reveal>
    </Section>
  );
}
