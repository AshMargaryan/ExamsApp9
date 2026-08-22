import { useEffect, useState } from "react";
import { HelpCircle, Lightbulb, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DemoNote, Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 6 — the tutor, actually interactive.

  What this replaces ran on four setTimeouts and typed one canned answer to
  `2x + 5 = 17` — the same equation three other sections were also solving.
  It demonstrated that a chat bubble exists.

  The three buttons below are the product's real conversation modes, from
  `apps/ai_assistant/prompts.py:CONVERSATION_MODE_FRAMING`:

  * `solving_question` — "the answer is theirs to produce, you never state
    it... work the method with them and deliberately stop one step short,
    leaving the last step as a checkpoint they answer." That is «Ակնարկ տուր»,
    and the reply below genuinely stops one step short.
  * `explain_mode` — "the student wants a clear, direct explanation right now,
    not a Socratic back-and-forth... don't withhold the explanation waiting
    for them to attempt a step first." That is «Բացատրիր այլ կերպ».
  * the parallel-problem instruction inside `solving_question` — "demonstrate
    the method on a parallel problem with different numbers" — is «Տուր
    նմանատիպ խնդիր».

  Having both of the first two is the differentiation. The loudest public
  complaint about Socratic AI tutors is that a student who wants an answer
  gets a question instead; Gitus has a mode for each, and this section lets
  the visitor feel the difference rather than read about it.

  The replies are written, not generated — a marketing page does not call the
  API. But each one is the behaviour its mode actually specifies, and the note
  says the responses are examples.
*/

type Mode = {
  id: string;
  label: string;
  icon: LucideIcon;
  ask: string;
  reply: { text: string; mono?: boolean }[];
  /** Rendered as a distinct block: the step the tutor deliberately left. */
  checkpoint?: string;
};

const MODES: Mode[] = [
  {
    id: "hint",
    label: "Ակնարկ տուր",
    icon: Lightbulb,
    ask: "Չեմ հասկանում՝ որտեղից սկսեմ։",
    reply: [
      { text: "Այս հավասարումը կարելի է լուծել առանց բանաձևի։" },
      {
        text: "Փնտրիր երկու թիվ, որոնց արտադրյալը 6 է, իսկ գումարը՝ 5։",
      },
    ],
    checkpoint: "Ո՞ր երկու թիվն են դրանք։",
  },
  {
    id: "explain",
    label: "Բացատրիր այլ կերպ",
    icon: HelpCircle,
    ask: "Ուղղակի բացատրիր՝ ամբողջությամբ։",
    reply: [
      {
        text: "x² + px + q = 0 տեսքի հավասարման արմատների համար՝ արմատների գումարը −p է, արտադրյալը՝ q։",
      },
      { text: "Այստեղ p = −5, q = 6, ուրեմն գումարը 5 է, արտադրյալը՝ 6։" },
      { text: "2 + 3 = 5,  2 · 3 = 6", mono: true },
      { text: "Հետևաբար՝", mono: false },
      { text: "x₁ = 2,  x₂ = 3", mono: true },
    ],
  },
  {
    id: "similar",
    label: "Տուր նմանատիպ խնդիր",
    icon: Repeat,
    ask: "Տուր նույն տիպի մեկ ուրիշը՝ փորձեմ ինքս։",
    reply: [
      { text: "Նույն մեթոդով՝ փնտրիր երկու թիվ, որոնց գումարը 7 է, արտադրյալը՝ 12։" },
      { text: "x² − 7x + 12 = 0", mono: true },
    ],
    checkpoint: "Ի՞նչ ստացվեց։",
  },
];

export function TutorSection() {
  const [modeId, setModeId] = useState(MODES[0].id);
  const [resolved, setResolved] = useState(false);
  const mode = MODES.find((m) => m.id === modeId)!;

  /* RESOLVE, one beat after the mode changes — the reply arrives out of
     focus and settles, the same verb the hero and the mistake analysis use
     and the only three places on this page that use it. */
  useEffect(() => {
    setResolved(false);
    const t = window.setTimeout(() => setResolved(true), 200);
    return () => window.clearTimeout(t);
  }, [modeId]);

  return (
    <Section id="ai-tutor">
      <SectionHeading
        kicker="AI Tutor"
        title="Չի տա պատասխանը։ Կսովորեցնի։"
        subtitle="Երբ խնդիրը լուծելու ընթացքում ես, Gitus-ը պատասխանը չի ասում՝ հասցնում է քեզ մեկ քայլ առաջ և թողնում վերջինը։ Երբ ուղղակի բացատրություն ես ուզում՝ ասում է ամբողջը։"
      />

      <Reveal className="mt-14">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6 sm:p-7">
            <p className="text-[length:var(--text-sm)] text-text-muted">
              Մաթեմատիկա · Քառակուսի հավասարումներ
            </p>
            <p className="mt-3 font-display text-[length:var(--text-2xl)] text-text">
              x² − 5x + 6 = 0
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <p className="ml-auto max-w-[85%] rounded-[var(--radius-lg)] rounded-tr-[var(--radius-xs)] bg-primary px-4 py-2.5 text-[length:var(--text-sm)] text-primary-contrast">
                {mode.ask}
              </p>

              <div
                className="lp-resolve max-w-[92%] rounded-[var(--radius-lg)] rounded-tl-[var(--radius-xs)] bg-surface-muted px-4 py-3.5"
                data-resolved={resolved}
                aria-live="polite"
              >
                {mode.reply.map((line, i) => (
                  <p
                    key={i}
                    className={`text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text ${
                      i > 0 ? "mt-2" : ""
                    } ${line.mono ? "font-display text-[length:var(--text-lg)]" : ""}`}
                  >
                    {line.text}
                  </p>
                ))}

                {mode.checkpoint && (
                  <p className="mt-3.5 rounded-[var(--radius-md)] border border-primary-line bg-primary-bg px-3.5 py-2.5 text-[length:var(--text-sm)] font-medium text-primary">
                    {mode.checkpoint}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[length:var(--text-sm)] text-text-muted">Փորձիր՝ ինչ խնդրես</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModeId(m.id)}
                      aria-pressed={m.id === modeId}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] border px-4 text-[length:var(--text-sm)] font-semibold transition-colors ${
                        m.id === modeId
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border text-text-muted hover:border-primary hover:text-text"
                      }`}
                    >
                      <Icon size={15} strokeWidth={1.75} aria-hidden />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="mt-6 text-[length:var(--text-base)] leading-[var(--leading-body)] text-text-muted">
            Զրույցը դատարկ էջից չի սկսվում։ Gitus-ը գիտի, թե որ առարկայի և որ թեմայի վրա ես
            աշխատում, ինչ ես վերջերս սխալ պատասխանել և ինչ կա այսօրվա պլանումդ։
          </p>

          <DemoNote className="mt-5">
            Պատասխանները ցուցադրական օրինակներ են՝ գրված այս էջի համար։ Իրական զրույցում դրանք
            կառուցվում են քո հարցից և քո ուսումնական պատմությունից։
          </DemoNote>
        </div>
      </Reveal>
    </Section>
  );
}
