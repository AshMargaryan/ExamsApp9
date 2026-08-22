import { useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { DemoNote, Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 3 — the mistake that becomes understanding.

  This replaces two sections: a question mockup that answered itself on a
  timer, and a static card describing mistake analysis in prose. Between them
  they demonstrated nothing, and they solved `2x + 5 = 17` for the third and
  fourth time on a page that has a bank of 16,070 questions.

  Why this is the page's strongest differentiator: `apps/mistakes/models.py`
  stores a first-class reason a student got something wrong —
  `careless_slip | conceptual_gap | process_error | misread_question` —
  classified by `apps/mistakes/classification.py` together with a
  one-sentence Armenian explanation, and consumed by
  `apps/study_plan/services.py` to shape the next day's coaching. Nothing in
  the market the research turned up treats "why" as an object rather than a
  paragraph. So the page should let a visitor *produce* one.

  The reader answers. Their own wrong answer is what gets analysed. That is
  the difference between a demo and a screenshot.

  Labels here are lifted verbatim from `pages/MistakeNotebookPage.tsx` so the
  marketing page and the product name the same thing the same way.
*/

const CHOICES = [
  { id: "a", text: "−4", correct: false },
  { id: "b", text: "3", correct: true },
  { id: "c", text: "4", correct: false },
  { id: "d", text: "3x", correct: false },
] as const;

type ChoiceId = (typeof CHOICES)[number]["id"];

/* One analysis per wrong answer, because the whole claim is that Gitus
   responds to *your* mistake rather than to the question. Each maps to a real
   ErrorCategory value. */
const ANALYSIS: Record<Exclude<ChoiceId, "b">, { category: string; why: string; fix: string }> = {
  a: {
    category: "Հասկացողության բաց",
    why: "−4-ը y առանցքի հատման կետն է, ոչ թե անկյունային գործակիցը։ y = kx + b տեսքում անկյունային գործակիցը k-ն է՝ x-ի գործակիցը։",
    fix: "Անկյունային գործակից և y-հատում",
  },
  c: {
    category: "Անուշադրության սխալ",
    why: "Գործակիցը 3 է, ոչ թե 4։ Թիվը վերցրել ես ազատ անդամից՝ առանց նշանի։ Նյութը գիտես՝ քայլը շտապ է արվել։",
    fix: "Անկյունային գործակից և y-հատում",
  },
  d: {
    category: "Սխալ մեթոդ",
    why: "Անկյունային գործակիցը թիվ է, ոչ թե արտահայտություն։ x-ը չի մտնում պատասխանի մեջ՝ վերցվում է միայն նրա գործակիցը։",
    fix: "Անկյունային գործակից և y-հատում",
  },
};

export function MistakeSection() {
  const [picked, setPicked] = useState<ChoiceId | null>(null);
  /* RESOLVE runs one beat after the answer lands, so the analysis reads as a
     consequence of the click rather than as content that was always there. */
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!picked) return;
    const t = window.setTimeout(() => setResolved(true), 320);
    return () => window.clearTimeout(t);
  }, [picked]);

  function reset() {
    setResolved(false);
    setPicked(null);
  }

  const analysis = picked && picked !== "b" ? ANALYSIS[picked] : null;

  return (
    <Section id="mistakes">
      <SectionHeading
        kicker="Սխալների վերլուծություն"
        title="Gitus-ը չի ասում պարզապես՝ «սխալ է»։"
        subtitle="Ամեն սխալ պատասխան դասակարգվում է՝ ըստ պատճառի։ Փորձիր՝ պատասխանիր հարցին և տես, թե ինչ է լինում հետո։"
      />

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <Reveal>
          <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
            <p className="text-[length:var(--text-sm)] text-text-muted">
              Մաթեմատիկա · Գծային ֆունկցիա
            </p>
            <p className="mt-3 text-[length:var(--text-lg)] leading-[var(--leading-snug)] font-medium text-text">
              y = 3x − 4 ուղղի անկյունային գործակիցը որքա՞ն է։
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {CHOICES.map((choice) => {
                const isPicked = picked === choice.id;
                const showState = picked !== null;
                /* Never colour alone (docs/DESIGN.md §1 rule 7): the correct
                   row gains a check and the chosen wrong row an ✕, so the
                   state survives both colour-blindness and a greyscale
                   screenshot. */
                let tone = "border-border bg-bg text-text";
                if (showState && choice.correct) {
                  tone = "border-correct bg-correct-bg text-correct";
                } else if (showState && isPicked) {
                  tone = "border-incorrect bg-incorrect-bg text-incorrect";
                } else if (showState) {
                  tone = "border-border bg-bg text-text-muted";
                }

                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => !picked && setPicked(choice.id)}
                    disabled={picked !== null}
                    aria-label={`Պատասխանել՝ ${choice.text}`}
                    className={`flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border px-4 py-2.5 text-left text-[length:var(--text-base)] transition-colors ${tone} ${
                      picked ? "cursor-default" : "hover:border-primary"
                    }`}
                  >
                    <span>{choice.text}</span>
                    {showState && choice.correct && (
                      <Check size={18} strokeWidth={2.25} aria-hidden />
                    )}
                    {showState && isPicked && !choice.correct && (
                      <X size={18} strokeWidth={2.25} aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            {picked && (
              <button
                type="button"
                onClick={reset}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-[length:var(--text-sm)] font-medium text-primary"
              >
                <RotateCcw size={15} strokeWidth={1.75} aria-hidden />
                Փորձել այլ պատասխան
              </button>
            )}
          </div>
        </Reveal>

        {/* The analysis column keeps its height reserved so answering does not
            shove the page down under the reader's cursor. */}
        <div className="min-h-[22rem]" aria-live="polite">
          {!picked && (
            <div className="flex h-full min-h-[22rem] flex-col justify-center rounded-[var(--radius-xl)] border border-dashed border-border px-6 py-10 text-center">
              <p className="text-[length:var(--text-base)] text-text-muted">
                Ընտրիր պատասխան՝ ձախից։
              </p>
              <p className="mt-2 text-[length:var(--text-sm)] text-text-muted">
                Ամեն սխալ պատասխան այստեղ ստանում է իր բացատրությունը։
              </p>
            </div>
          )}

          {picked === "b" && (
            <div className="lp-resolve rounded-[var(--radius-xl)] border border-correct bg-correct-bg p-6" data-resolved={resolved}>
              <p className="flex items-center gap-2 text-[length:var(--text-lg)] font-semibold text-correct">
                <Check size={20} strokeWidth={2.25} aria-hidden />
                Ճիշտ է։
              </p>
              <p className="mt-3 text-[length:var(--text-base)] leading-[var(--leading-body)] text-text">
                Ճիշտ պատասխանն էլ է հաշվի առնվում. այս թեմայի տիրապետումը բարձրանում է, և թեման
                ավելի հազվադեպ է հայտնվում քո պլանում։
              </p>
              <p className="mt-4 text-[length:var(--text-base)] leading-[var(--leading-body)] text-text-muted">
                Բայց ամենահետաքրքիրը սխալի դեպքում է։
              </p>
              <button
                type="button"
                onClick={() => {
                  setResolved(false);
                  setPicked("a");
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-correct px-4 py-2.5 text-[length:var(--text-sm)] font-semibold text-correct"
              >
                Տես՝ ինչ է լինում սխալի դեպքում
              </button>
            </div>
          )}

          {analysis && (
            <div
              className="lp-resolve overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface"
              data-resolved={resolved}
            >
              <div className="border-b border-border bg-incorrect-bg px-6 py-5">
                <p className="text-[length:var(--text-sm)] font-semibold text-incorrect">
                  Ինչու՞ սխալվեցիր
                </p>
                <p className="mt-3 inline-flex items-center rounded-[var(--radius-full)] border border-incorrect bg-surface px-3.5 py-1.5 text-[length:var(--text-sm)] font-semibold text-incorrect">
                  {analysis.category}
                </p>
              </div>

              <div className="px-6 py-5">
                <p className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-text">
                  {analysis.why}
                </p>

                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-[length:var(--text-sm)] font-semibold text-text">
                    Ինչ է անում Gitus-ը հիմա
                  </p>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                    <li className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden />
                      Հարցը գրանցվում է սխալների տետրում՝ «{analysis.fix}» թեմայի տակ։
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden />
                      Այս թեմայի տիրապետումը վերահաշվարկվում է անմիջապես։
                    </li>
                    <li className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" aria-hidden />
                      Վաղվա պլանում այս թեման բարձրանում է վերև։
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Reveal className="mt-8">
        <DemoNote>
          Ցուցադրական հարց և ցուցադրական վերլուծություն։ Իրական հաշվում բացատրությունը գրվում է քո
          կոնկրետ պատասխանի համար, և սխալի պատճառը պահվում է քո սխալների տետրում։
        </DemoNote>
      </Reveal>
    </Section>
  );
}
