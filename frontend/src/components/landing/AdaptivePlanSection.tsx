import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Sparkles } from "lucide-react";
import { DemoNote, Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 4 — the plan is not static.

  This merges five sections that all made the same argument in prose:
  StudyPlanSection, ExamPrepSection, PersonalizationSection,
  HowItWorksSection and BeforeAfterSection's middle two rows. 3,190px of the
  old page said "Gitus tells you what to study." One demonstration says it
  better.

  IMPORTANT — what this deliberately does NOT claim.

  The brief's example was "repeated mistakes -> Gitus detects a *prerequisite
  gap* -> factoring is inserted before quadratics". That cannot be shown
  honestly: there is no prerequisite graph in this product. `TopicMastery`
  has no edges, and `analytics.skill_map()` returns a flat list of topics
  grouped by domain. Animating a dependency the engine cannot compute would
  be exactly the fabricated intelligence this page must not ship.

  What the engine really does, and what this shows, is nearly as strong:

  * `practice/services.py:get_recommended_subtopics()` ranks weak subtopics
    by mistake count, ties broken by *recency* — so yesterday's wrong answers
    move today's plan, not just lifetime totals.
  * `study_plan/services.py:_flashcard_candidates()` pulls decks whose cards
    are actually due, which is why a review task can appear overnight.
  * `MASTERED_SCORE_THRESHOLD = 75` retires a topic once its recency-weighted
    mastery clears 75, which is why a finished topic silently drops off.

  Every movement in the list below is one of those three rules firing.
*/

type Task = {
  id: string;
  subject: string;
  topic: string;
  minutes: number;
  note?: string;
};

const MONDAY: Task[] = [
  { id: "kinematics", subject: "Ֆիզիկա", topic: "Կինեմատիկա", minutes: 25 },
  { id: "quadratic", subject: "Մաթեմատիկա", topic: "Քառակուսի հավասարումներ", minutes: 20 },
  { id: "bonds", subject: "Քիմիա", topic: "Քիմիական կապեր", minutes: 15 },
];

const TUESDAY: Task[] = [
  {
    id: "quadratic",
    subject: "Մաթեմատիկա",
    topic: "Քառակուսի հավասարումներ",
    minutes: 20,
    note: "Երեկ 5 սխալ պատասխան այս թեմայում",
  },
  { id: "kinematics", subject: "Ֆիզիկա", topic: "Կինեմատիկա", minutes: 25 },
  {
    id: "formulas",
    subject: "Մաթեմատիկա",
    topic: "Բանաձևերի բառաքարտեր",
    minutes: 10,
    note: "12 քարտի կրկնության ժամանակը հասել է",
  },
];

const DAYS = [
  { id: "mon", label: "Երկուշաբթի", tasks: MONDAY },
  { id: "tue", label: "Երեքշաբթի", tasks: TUESDAY },
] as const;

type DayId = (typeof DAYS)[number]["id"];

export function AdaptivePlanSection() {
  const [day, setDay] = useState<DayId>("mon");
  const tasks = DAYS.find((d) => d.id === day)!.tasks;

  /*
    REORDER — a genuine FLIP, not a fade pretending to be one. Each row's
    previous top edge is remembered, and on the next commit the row is
    offset back to where it was and released, so it travels the real
    distance. A row that is new to the list has no previous position and
    simply enters.
  */
  const listRef = useRef<HTMLUListElement>(null);
  const positions = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-task-id]"));
    const next = new Map<string, number>();

    rows.forEach((row) => {
      const id = row.dataset.taskId!;
      const top = row.getBoundingClientRect().top;
      next.set(id, top);

      const previous = positions.current.get(id);
      if (previous === undefined || previous === top) return;

      row.style.setProperty("--from", `${previous - top}px`);
      row.classList.remove("lp-reorder");
      /* Force a reflow so removing and re-adding the class restarts the
         animation instead of being coalesced into a no-op. */
      void row.offsetWidth;
      row.classList.add("lp-reorder");
    });

    positions.current = next;
  }, [day]);

  return (
    <Section id="study-plan">
      <SectionHeading
        kicker="Ուսումնական պլան"
        title="Պլանը փոխվում է, երբ դու փոխվում ես։"
        subtitle="Երկուշաբթի սխալվեցիր քառակուսի հավասարումներում։ Ահա թե ինչ տեսք ունի երեքշաբթին։"
      />

      <Reveal className="mt-14">
        <div className="mx-auto max-w-3xl rounded-[var(--radius-xl)] border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="inline-flex items-center gap-2 text-[length:var(--text-sm)] text-text-muted">
              <CalendarDays size={16} strokeWidth={1.75} className="text-primary" aria-hidden />
              Քննությանը մնացել է <span className="font-semibold tabular-nums text-text">142</span> օր
            </p>

            {/* Segmented control: two real buttons, so it is reachable by
                keyboard and its state is announced. */}
            <div
              className="inline-flex rounded-[var(--radius-full)] border border-border p-1"
              role="group"
              aria-label="Ընտրիր օրը"
            >
              {DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDay(d.id)}
                  aria-pressed={day === d.id}
                  /* 44px, not the 36px this started at. The row it sits in
                     has the width to spare, so there is no reason for the one
                     control this section exists to be pressed to be the one
                     control below the product's own touch-target floor. */
                  className={`min-h-11 rounded-[var(--radius-full)] px-4 text-[length:var(--text-sm)] font-semibold transition-colors ${
                    day === d.id
                      ? "bg-primary text-primary-contrast"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <ul ref={listRef} className="mt-6 flex flex-col gap-3">
            {tasks.map((task) => (
              <li
                key={task.id}
                data-task-id={task.id}
                className="rounded-[var(--radius-lg)] border border-border bg-bg p-4"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[length:var(--text-base)] font-medium text-text">
                    {task.topic}
                  </p>
                  <p className="flex-none text-[length:var(--text-sm)] text-text-muted">
                    ~<span className="tabular-nums">{task.minutes}</span> ր
                  </p>
                </div>
                <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">{task.subject}</p>
                {task.note && (
                  <p className="mt-2.5 inline-flex items-start gap-2 rounded-[var(--radius-md)] bg-primary-bg px-3 py-1.5 text-[length:var(--text-sm)] leading-[var(--leading-snug)] text-primary">
                    <ArrowUp size={15} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
                    {task.note}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {/* The thing that left is as informative as the things that moved,
              and a list that only ever grows would be a different, worse
              product. So the drop-out is stated rather than silently absent. */}
          {day === "tue" && (
            <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-lg)] border border-dashed border-border px-4 py-3 text-[length:var(--text-sm)] leading-[var(--leading-snug)] text-text-muted">
              <ArrowDown size={15} strokeWidth={2} className="mt-1 flex-none" aria-hidden />
              <span>
                <span className="font-medium text-text">Քիմիական կապեր</span> այսօր չկա. տիրապետումը
                անցել է 75%-ը, և թեման դուրս է եկել առաջարկվողների ցանկից։
              </span>
            </p>
          )}

          <div className="mt-6 flex items-start gap-3 border-t border-border pt-6">
            <Sparkles size={18} strokeWidth={1.75} className="mt-0.5 flex-none text-primary" aria-hidden />
            <p className="text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
              Ոչ մի թեմա ձեռքով չի ընտրվել։ Հերթականությունը որոշում են սխալների քանակը, թե որքան
              վերջերս են դրանք արվել, և բառաքարտերի կրկնության ժամկետները։
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-8">
        <DemoNote>
          Ցուցադրական պլան և ցուցադրական ամսաթիվ։ Իրական հաշվում օրվա առաջադրանքները և հետհաշվարկը
          կառուցվում են քո առարկաներից, քննության ամսաթվից և քո վերջին պատասխաններից։
        </DemoNote>
      </Reveal>
    </Section>
  );
}
