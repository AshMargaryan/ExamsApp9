import { Bot, Check, Infinity as InfinityIcon, Layers, LineChart, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Section, SectionHeading } from "./Section";

/*
  What a subscription actually buys.

  One plan, no tiers. The product has exactly two states — free and premium —
  and `SubscriptionPage.tsx` already defines both; this section is the
  marketing-side view of that same split, so the two must not drift. The
  feature list below is the app's own PREMIUM_FEATURES plus the three
  capabilities the landing page demonstrates elsewhere (adaptive plan, mistake
  taxonomy, mastery map), all of which are real and shipped.

  Deliberately absent: a price. There is no payments integration anywhere in
  the backend, `SubscriptionPage` says so in words, and inventing a number
  here would be the page's first lie. What it says instead is the truth —
  everything is open while the platform is being built — which is also, right
  now, the strongest offer it has.
*/

const PREMIUM = [
  { Icon: Bot, text: "AI Tutor՝ քայլ առ քայլ բացատրություններով, ցանկացած թեմայի շուրջ" },
  { Icon: Target, text: "Անհատական ուսումնական պլան, որը փոխվում է ամեն օր" },
  { Icon: InfinityIcon, text: "Անսահմանափակ պրակտիկա բոլոր առարկաներից" },
  { Icon: Layers, text: "Ամբողջական փորձնական քննություններ" },
  { Icon: Sparkles, text: "Սխալների վերլուծություն՝ ըստ պատճառի, ոչ միայն «սխալ է»" },
  { Icon: LineChart, text: "Գիտելիքի քարտեզ և չափելի առաջընթաց" },
];

export function SubscriptionSection() {
  return (
    <Section id="pricing">
      <SectionHeading
        kicker="Բաժանորդագրություն"
        title="Մեկ բաժանորդագրություն։ Ամեն ինչ ներսում։"
        subtitle="Առանց փաթեթների, առանց հավելավճարների, առանց «այս հնարավորությունը հասանելի չէ քո պլանում»։"
      />

      <div className="mx-auto mt-12 max-w-3xl rounded-[var(--radius-2xl)] border border-border bg-surface p-7 sm:p-10">
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {PREMIUM.map(({ Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-bg text-primary"
                aria-hidden
              >
                <Icon size={15} strokeWidth={1.9} />
              </span>
              <span className="text-[length:var(--text-sm)] leading-[var(--leading-snug)] text-text">
                {text}
              </span>
            </li>
          ))}
        </ul>

        {/*
          The honest state of the offer. No price, no countdown, no "50% off
          today" — none of which exist. What does exist is that payments are
          not live, so nothing is currently gated, and saying that plainly is
          both true and more persuasive than a fabricated discount.
        */}
        <div className="mt-8 flex flex-col items-start gap-4 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-[length:var(--text-sm)] leading-[var(--leading-snug)] text-text">
            <Check size={17} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0 text-correct" />
            <span>
              <b className="font-semibold">Հիմա ամեն ինչ բաց է։</b> Վճարումը դեռ չենք միացրել — մինչ
              կառուցում ենք հարթակը, բոլոր հնարավորությունները հասանելի են անվճար։
            </span>
          </p>
          <Link
            to="/register"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-primary px-7 font-semibold text-primary-contrast transition-opacity hover:opacity-90"
          >
            Սկսել անվճար →
          </Link>
        </div>
      </div>
    </Section>
  );
}
