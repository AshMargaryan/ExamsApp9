import type { LucideIcon } from "lucide-react";
import { Bot, Database, TriangleAlert, Users } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 7a — trust.

  What this replaces was four cards reading «Անվտահ հաշիվ», «Գաղտնիություն»,
  «Թափանցիկ տվյալներ», «Աջակցություն» over one generic sentence each. Every
  product on the internet says those four things, so they carry no
  information; a claim that cannot be checked is not trust.

  Each card below is instead a specific, checkable statement about this
  codebase:

  * what is collected, and what it is used for — the fields the plan and the
    tutor actually read (`profiles/context.py:get_learner_context`).
  * what the tutor can see — exactly the four tools in
    `ai_assistant/tools/definitions.py` (get_profile, get_progress,
    get_mistakes, get_study_plan) and nothing else. It has no access to chat.
  * what a parent account can see — progress, not tutor conversations.
  * what the product cannot do yet — an LLM can be wrong, and four of the
    nine subjects have no question bank.

  The last one is the point. A page willing to name its own limits is making
  a claim the reader can verify, which is the only kind worth making.
*/

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Database,
    title: "Ինչ ենք հավաքում և ինչու",
    body: "Դասարանը, առարկաները, քննության ամսաթիվը և քո պատասխանները։ Դրանք միասին կառուցում են օրվա պլանը։ Ուրիշ բանի համար չեն օգտագործվում և չեն վաճառվում։",
  },
  {
    icon: Bot,
    title: "Ինչ է տեսնում AI Tutor-ը",
    body: "Քո պրոֆիլը, առաջընթացը, սխալները և ուսումնական պլանը՝ որ պատասխանը քեզ համապատասխանի։ Քո նամակագրությունը ընկերների հետ չի տեսնում։",
  },
  {
    icon: Users,
    title: "Ինչ է տեսնում ծնողը",
    body: "Կայունությունը, առաջընթացը և թեստերի արդյունքները։ AI Tutor-ի հետ քո զրույցները ծնողի հաշվին հասանելի չեն։",
  },
  {
    icon: TriangleAlert,
    title: "Ինչ դեռ չենք կարող",
    body: "AI-ը կարող է սխալվել՝ ստուգիր կարևոր բացատրությունները։ Ինը առարկայից հինգն ունի հարցաշար. մնացածի վրա դեռ աշխատում ենք։",
  },
];

export function TrustSection() {
  return (
    <Section id="trust">
      <SectionHeading kicker="Վստահություն" title="Ահա՝ ինչ պետք է իմանաս մեր մասին։" />

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delay={i * 60}>
              <div className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6">
                <Icon size={20} strokeWidth={1.75} className="text-primary" aria-hidden />
                <h3 className="mt-4 text-[length:var(--text-base)] font-semibold text-text">
                  {item.title}
                </h3>
                <p className="mt-2 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                  {item.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Money, stated plainly and once. There is no pricing table because
          there is nothing to price: `pages/SubscriptionPage.tsx` records that
          premium is not on sale, and a page that implied otherwise would be
          selling something that does not exist. */}
      <Reveal delay={120} className="mt-6">
        <p className="rounded-[var(--radius-xl)] border border-dashed border-border px-6 py-5 text-center text-[length:var(--text-base)] leading-[var(--leading-body)] text-text-muted">
          <span className="font-semibold text-text">Gitus-ն այսօր անվճար է։</span> Հարթակը դեռ
          կառուցվում է։ Ավելի ուշ կավելանա վճարովի փաթեթ, բայց այն, ինչ հիմա օգտագործում ես,
          չենք փակի առանց նախապես տեղեկացնելու։
        </p>
      </Reveal>
    </Section>
  );
}
