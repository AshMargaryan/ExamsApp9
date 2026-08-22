import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 7c — the questions the page has not already answered.

  Trimmed from eight to five. Three of the originals restated a section the
  reader had just scrolled through: "how does the AI Tutor work" is movement
  6, "can it help me prepare for the exam" is movement 4, and "how is my
  progress calculated" is movement 5. An FAQ that repeats the page teaches the
  reader that the page was skippable.

  The two answers that changed are the ones that were quietly out of date:
  subject coverage now says five of nine rather than listing five as though
  that were the whole set, and the pricing answer says plainly that premium
  does not exist yet (see TrustSection for why).
*/

const FAQS = [
  {
    q: "Ի՞նչ է Gitus-ը։",
    a: "Հայ դպրոցականների համար ուսումնական հարթակ՝ ընդունելության քննություններին պատրաստվելու համար։ Այն հետևում է, թե որ թեմաներում ես սխալվում, և ամեն օր առաջարկում է կոնկրետ ինչ պարապել հաջորդը։",
  },
  {
    q: "Արդյո՞ք Gitus-ն անվճար է։",
    a: "Այո։ Այս պահին ամեն ինչ անվճար է՝ հարթակը դեռ կառուցվում է։ Ավելի ուշ կավելանա վճարովի փաթեթ, բայց այն, ինչ հիմա հասանելի է, չենք փակի առանց նախապես տեղեկացնելու։",
  },
  {
    q: "Ո՞ր առարկաներն ունեն հարցաշար։",
    a: "Ինը առարկայից հինգը՝ Մաթեմատիկա, Ֆիզիկա, Քիմիա, Կենսաբանություն և Անգլերեն։ Հայոց լեզվի, Հայոց պատմության, Աշխարհագրության և Ռուսաց լեզվի հարցաշարերը դեռ պատրաստ չեն, և էջում դրանք ցույց են տրվում առանց թվերի։",
  },
  {
    q: "Ինչպե՞ս է որոշվում՝ ինչ պարապեմ այսօր։",
    a: "Ոչ ոք ձեռքով չի ընտրում։ Հաշվի են առնվում քո սխալների քանակը ըստ թեմաների, թե որքան վերջերս են դրանք արվել, բառաքարտերի կրկնության ժամկետները և այն թեմաները, որոնց դեռ չես անդրադարձել։ Յուրաքանչյուր առաջադրանքի կողքին գրված է, թե ինչու է այն առաջարկվում։",
  },
  {
    q: "Իմ տվյալները ո՞ւր են գնում։",
    a: "Ոչ մի տեղ։ Քո պատասխանները և առաջընթացը օգտագործվում են միայն քո պլանը կառուցելու համար։ Ծնողի հաշիվը տեսնում է առաջընթացը, բայց ոչ AI Tutor-ի հետ քո զրույցները։",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-border">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full min-h-11 items-center justify-between gap-4 py-4 text-left"
        >
          <span className="text-[length:var(--text-base)] font-medium text-text">{q}</span>
          <Plus
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className={`flex-none text-text-muted transition-transform duration-[var(--motion-normal)] ${
              open ? "rotate-45" : ""
            }`}
          />
        </button>
      </h3>
      {/* `hidden` rather than a zero-height grid row: a collapsed answer must
          be skipped by Tab and by a screen reader's reading order, and an
          `aria-hidden` wrapper alone does not remove it from the tab order. */}
      <div id={panelId} hidden={!open} className="pb-4">
        <p className="max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
          {a}
        </p>
      </div>
    </div>
  );
}

export function FaqSection() {
  return (
    <Section id="faq">
      <SectionHeading kicker="Հաճախ տրվող հարցեր" title="Հարցեր ունե՞ս։" />

      <Reveal className="mx-auto mt-12 max-w-2xl">
        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </Reveal>
    </Section>
  );
}
