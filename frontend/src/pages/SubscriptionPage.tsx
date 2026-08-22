import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bot,
  Check,
  Crown,
  Infinity as InfinityIcon,
  Layers,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { Reveal } from "../components/landing/Reveal";
import { cn } from "../lib/cn";

/*
  The one page in the product that is marketing rather than study, so §39's
  "spacious, emotional, high clarity" applies here and the restraint that
  governs a dashboard does not. What was wrong with it was not its ambition.

  1. **Its biggest, brightest control was a lie.** "Ընտրել Պրեմիում" ran
     `showSuccess("Պրեմիում բաժանորդագրությունը շուտով հասանելի կլինի։")` — a
     *success* toast, in the product's success colour, announcing that the
     thing you just tried to buy does not exist. A student who pressed it was
     congratulated for a purchase that never happened, and the message then
     disappeared. §21 forbids faking the completion of an operation that did
     not complete. The page says up front that premium is not on sale yet, and
     the control that used to pretend otherwise is a disabled button that
     states why beside itself (§rule 9).

  2. **Everything was painted with hardcoded `text-white` and `black/25`** on
     top of a gradient. `--gradient-brand` is theme-invariant precisely so
     that the text on it can be measured once — 8.3:1 to 11.7:1 for
     `--color-on-brand`, 5.1:1 for `-muted` — and those are the tokens now.
     `text-white/50` on the band was below the floor and was carrying the
     countdown's separators.

  3. The `h1` of the most designed page in the product was set in the body
     face, so it was the one page title that did not read as a title.

  4. `🎉` as iconography, a hand-rolled check `<svg>` beside lucide's own, and
     "Չեղարկեք ցանկացած պահի" printed twice within 400px.

  5. A `setInterval` re-rendered the whole page — two blurred gradient fields,
     eight `Reveal` wrappers and both plan cards — once per second, to advance
     a clock. The clock owns its own state now.
*/

const PROMO_PRICE = "3,990 ֏";
const REGULAR_PRICE = "8,990 ֏";
const PROMO_DEADLINE_LABEL = "դեկտեմբերի 1-ը";

/** Next Dec 1 at local midnight — rolls to next year automatically once the promo ends. */
function nextDecemberFirst(): Date {
  const now = new Date();
  const year = now.getMonth() === 11 && now.getDate() >= 1 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 11, 1, 0, 0, 0, 0);
}

function two(n: number) {
  return n.toString().padStart(2, "0");
}

const FREE_FEATURES = [
  "Սահմանափակ քանակի վարժություններ",
  "Հիմնական առաջընթացի հետևում",
  "Մեկ առարկա միաժամանակ",
];

const PREMIUM_FEATURES: { icon: ReactNode; text: string }[] = [
  { icon: <InfinityIcon size={16} strokeWidth={2} aria-hidden />, text: "Անսահմանափակ պրակտիկա բոլոր առարկաներից" },
  { icon: <Layers size={16} strokeWidth={2} aria-hidden />, text: "Ամբողջական փորձնական քննություններ" },
  { icon: <Bot size={16} strokeWidth={2} aria-hidden />, text: "AI օգնական մանրամասն բացատրություններով" },
  { icon: <Sparkles size={16} strokeWidth={2} aria-hidden />, text: "Բառաքարտեր և ամբողջական վերլուծություն" },
];

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="min-w-[2.5ch] rounded-[var(--radius-md)] bg-on-brand-fill px-2.5 py-1.5 text-[length:var(--text-xl)] font-bold tabular-nums text-on-brand">
        {two(value)}
      </span>
      <span className="text-[length:var(--text-xs)] font-medium text-on-brand-muted">{label}</span>
    </div>
  );
}

/*
  Its own component so the 1Hz tick re-renders four numbers rather than the
  whole page. `aria-hidden` because a screen reader being told a new time
  every second is unusable — the deadline is stated as a date in the pill
  above, which is the part that carries the information.
*/
function PromoCountdown({ target }: { target: Date }) {
  const [msLeft, setMsLeft] = useState(() => target.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setMsLeft(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  const clamped = Math.max(0, msLeft);
  const days = Math.floor(clamped / 86_400_000);
  const hours = Math.floor((clamped % 86_400_000) / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);

  return (
    <div
      aria-hidden
      className="mx-auto mt-[var(--space-7)] inline-flex items-center gap-4 rounded-[var(--radius-xl)] px-5 py-3 shadow-[var(--shadow-md)]"
      style={{ backgroundImage: "var(--gradient-brand)" }}
    >
      <Timer size={20} strokeWidth={1.75} className="shrink-0 text-on-brand-muted" />
      <div className="flex items-center gap-2.5">
        <CountdownUnit value={days} label="օր" />
        <span className="pb-4 text-lg font-bold text-on-brand-muted">:</span>
        <CountdownUnit value={hours} label="ժամ" />
        <span className="pb-4 text-lg font-bold text-on-brand-muted">:</span>
        <CountdownUnit value={minutes} label="րոպե" />
        <span className="pb-4 text-lg font-bold text-on-brand-muted">:</span>
        <CountdownUnit value={seconds} label="վրկ" />
      </div>
    </div>
  );
}

const TRUST_POINTS: { icon: ReactNode; text: string }[] = [
  { icon: <BadgeCheck size={16} strokeWidth={2} aria-hidden />, text: "Անվտանգ վճարում" },
  { icon: <Timer size={16} strokeWidth={2} aria-hidden />, text: "Անմիջական հասանելիություն" },
  { icon: <ShieldCheck size={16} strokeWidth={2} aria-hidden />, text: "Չեղարկիր ցանկացած պահի" },
];

export function SubscriptionPage() {
  const [deadline] = useState(nextDecemberFirst);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-[var(--space-4)] py-16">
      {/* Ambient field. `prefers-reduced-motion` stops the drift globally
          (index.css caps animation-iteration-count at 1). */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-[70%] rounded-full opacity-25 blur-3xl"
          style={{ backgroundImage: "var(--gradient-brand)", animation: "hierarchy-drift 14s ease-in-out infinite" }}
        />
        <div
          className="absolute top-40 right-0 h-96 w-96 translate-x-1/3 rounded-full opacity-20 blur-3xl"
          style={{ backgroundImage: "var(--gradient-brand)", animation: "hierarchy-drift 18s ease-in-out infinite reverse" }}
        />
      </div>

      <Reveal className="relative mx-auto max-w-3xl text-center">
        <p
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[length:var(--text-sm)] font-semibold text-on-brand shadow-[var(--shadow-md)]"
          style={{ backgroundImage: "var(--gradient-brand)", animation: "cta-breathe 2.2s ease-in-out infinite" }}
        >
          <PartyPopper size={15} strokeWidth={2} aria-hidden />
          55% զեղչ՝ մինչև {PROMO_DEADLINE_LABEL}
        </p>

        <h1 className="mt-5 font-display text-[length:var(--text-4xl)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-tight)] text-text sm:text-[length:var(--text-5xl)]">
          Ընտրիր քո պլանը
        </h1>
        <p className="mx-auto mt-3 max-w-[var(--measure-base)] text-[length:var(--text-lg)] leading-[var(--leading-body)] text-text-muted">
          Սկսիր անվճար, հետո՝ ամբողջական հասանելիություն։
        </p>

        <PromoCountdown target={deadline} />
      </Reveal>

      <div className="relative mx-auto mt-12 grid max-w-3xl grid-cols-1 items-start gap-6 sm:grid-cols-2">
        {/* Free plan */}
        <Reveal delay={80} className="h-full">
          <div className="flex h-full flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-8">
            <h2 className="font-display text-[length:var(--text-xl)] font-semibold text-text">Անվճար</h2>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[length:var(--text-4xl)] font-bold tabular-nums text-text">0 ֏</span>
              <span className="text-text-muted">/ամիս</span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-text-muted">
                  <Check size={17} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
              {/* Excluded, and never by colour alone: the icon changes, the
                  text is struck through, and the row says so in words. */}
              <li className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-text-muted">
                <X size={17} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0" />
                <span className="line-through decoration-from-font">
                  AI օգնական և փորձնական քննություններ
                </span>
              </li>
            </ul>

            <Link
              to="/"
              className={cn(
                "btn-fx mt-8 rounded-[var(--radius-lg)] border border-border px-5 py-3",
                "text-center font-medium text-text transition-colors hover:border-primary",
              )}
            >
              Սկսել անվճար
            </Link>
          </div>
        </Reveal>

        {/* Premium plan */}
        <Reveal delay={160} className="h-full">
          <div className="relative h-full">
            <div
              className="absolute -inset-1 rounded-[var(--radius-2xl)] opacity-70 blur-xl"
              style={{ backgroundImage: "var(--gradient-brand)", animation: "hierarchy-breathe 3.5s ease-in-out infinite" }}
              aria-hidden="true"
            />

            <div className="relative flex h-full flex-col rounded-[var(--radius-xl)] border border-transparent bg-surface p-8 shadow-[var(--shadow-lg)]">
              {/* `max-w` rather than `whitespace-nowrap`: the label is long in
                  Armenian, and a centred nowrap pill on a 375px card is how a
                  page ends up wider than the phone it is on. */}
              <span
                className="absolute -top-3.5 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 rounded-full px-4 py-1.5 text-center text-[length:var(--text-sm)] font-semibold text-on-brand shadow-[var(--shadow-sm)]"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                <Crown size={14} strokeWidth={2.25} aria-hidden className="shrink-0" />
                Ամենահամապատասխանը
              </span>

              <h2 className="mt-2 font-display text-[length:var(--text-xl)] font-semibold text-text">Պրեմիում</h2>

              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-[length:var(--text-4xl)] font-bold tabular-nums text-text">{PROMO_PRICE}</span>
                <span className="text-text-muted">/ամիս</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold tabular-nums text-on-brand"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  −55%
                </span>
              </div>
              <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">
                <span className="line-through decoration-from-font">{REGULAR_PRICE}</span> /ամիս սովորական գնով
              </p>
              <p className="mt-2 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
                Անկախ գրանցման ամսաթվից՝ գինը կազմում է {PROMO_PRICE}/ամիս մինչև {PROMO_DEADLINE_LABEL}։ Այնուհետև
                գինը դառնում է {REGULAR_PRICE}/ամիս։
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-text">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-bg text-primary">
                      {f.icon}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              {/*
                Disabled, and it says why immediately beneath rather than
                answering a press with a success toast for a purchase that
                cannot happen. `aria-describedby` ties the reason to the
                control, so a screen reader is told the same thing a sighted
                reader is.
              */}
              <button
                type="button"
                disabled
                aria-describedby="premium-unavailable"
                className={cn(
                  "mt-8 rounded-[var(--radius-lg)] px-5 py-3.5 text-center",
                  "text-[length:var(--text-base)] font-semibold text-on-brand",
                  "cursor-not-allowed opacity-60",
                )}
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                Ընտրել Պրեմիում
              </button>
              <p
                id="premium-unavailable"
                className="mt-2 text-center text-[length:var(--text-sm)] text-text-muted"
              >
                Վճարումը դեռ հասանելի չէ։ Մինչ այդ բոլոր անվճար հնարավորությունները բաց են։
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal
        delay={220}
        className="relative mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[length:var(--text-sm)] text-text-muted"
      >
        {TRUST_POINTS.map((point) => (
          <span key={point.text} className="flex items-center gap-1.5">
            <span className="text-primary">{point.icon}</span>
            {point.text}
          </span>
        ))}
      </Reveal>
    </div>
  );
}
