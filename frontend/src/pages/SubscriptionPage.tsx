import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bot,
  Crown,
  Infinity as InfinityIcon,
  Layers,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { Reveal } from "../components/landing/Reveal";

const HERO_GRADIENT = "var(--gradient-hero)";

const PROMO_PRICE = "3,990 ֏";
const REGULAR_PRICE = "8,990 ֏";
const PROMO_DEADLINE_LABEL = "դեկտեմբերի 1-ը";

/** Next Dec 1 at local midnight — rolls to next year automatically once the promo ends. */
function nextDecemberFirst(): Date {
  const now = new Date();
  const year = now.getMonth() === 11 && now.getDate() >= 1 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 11, 1, 0, 0, 0, 0);
}

function useCountdown(target: Date) {
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
  return { days, hours, minutes, seconds };
}

function two(n: number) {
  return n.toString().padStart(2, "0");
}

const FREE_FEATURES = ["Սահմանափակ քանակի վարժություններ", "Հիմնական առաջընթացի հետևում", "Մեկ առարկա միաժամանակ"];

const PREMIUM_FEATURES: { icon: ReactNode; text: string }[] = [
  { icon: <InfinityIcon size={17} strokeWidth={2} />, text: "Անսահմանափակ պրակտիկա բոլոր առարկաներից" },
  { icon: <Layers size={17} strokeWidth={2} />, text: "Ամբողջական փորձնական քննություններ" },
  { icon: <Bot size={17} strokeWidth={2} />, text: "AI օգնական մանրամասն բացատրություններով" },
  { icon: <Sparkles size={17} strokeWidth={2} />, text: "Բառաքարտեր և ամբողջական վերլուծություն" },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 h-5 w-5 shrink-0 text-text-muted">
      <path
        d="M4 10.5l3.5 3.5L16 5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="min-w-[2.5ch] rounded-lg bg-black/25 px-2.5 py-1.5 text-xl font-bold tabular-nums text-white">
        {two(value)}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">{label}</span>
    </div>
  );
}

export function SubscriptionPage() {
  const { showSuccess } = useToast();
  const [deadline] = useState(nextDecemberFirst);
  const { days, hours, minutes, seconds } = useCountdown(deadline);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-4 py-16">
      {/* Ambient glow field behind the whole page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 left-1/2 h-[32rem] w-[32rem] -translate-x-[70%] rounded-full opacity-25 blur-3xl"
          style={{ backgroundImage: HERO_GRADIENT, animation: "hierarchy-drift 14s ease-in-out infinite" }}
        />
        <div
          className="absolute top-40 right-0 h-96 w-96 translate-x-1/3 rounded-full opacity-20 blur-3xl"
          style={{ backgroundImage: HERO_GRADIENT, animation: "hierarchy-drift 18s ease-in-out infinite reverse" }}
        />
      </div>

      <Reveal className="relative mx-auto max-w-3xl text-center">
        <div
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-lg"
          style={{ backgroundImage: HERO_GRADIENT, animation: "cta-breathe 2.2s ease-in-out infinite" }}
        >
          🎉 55% զեղչ՝ մինչև {PROMO_DEADLINE_LABEL}
        </div>

        <h1 className="mt-5 text-4xl font-bold text-text sm:text-5xl">Ընտրեք ձեր պլանը</h1>
        <p className="mt-3 text-lg text-text-muted">Սկսեք անվճար, հետո՝ ամբողջական հասանելիություն։</p>

        {/* Live countdown */}
        <div
          className="mx-auto mt-7 inline-flex items-center gap-4 rounded-2xl px-5 py-3 shadow-lg"
          style={{ backgroundImage: HERO_GRADIENT }}
        >
          <Timer size={20} className="shrink-0 text-white/85" />
          <div className="flex items-center gap-2.5">
            <CountdownUnit value={days} label="օր" />
            <span className="pb-4 text-lg font-bold text-white/50">:</span>
            <CountdownUnit value={hours} label="ժամ" />
            <span className="pb-4 text-lg font-bold text-white/50">:</span>
            <CountdownUnit value={minutes} label="րոպե" />
            <span className="pb-4 text-lg font-bold text-white/50">:</span>
            <CountdownUnit value={seconds} label="վրկ" />
          </div>
        </div>
      </Reveal>

      <div className="relative mx-auto mt-12 grid max-w-3xl grid-cols-1 items-start gap-6 sm:grid-cols-2">
        {/* Free plan */}
        <Reveal delay={80} className="h-full">
          <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-8">
            <h2 className="text-xl font-semibold text-text">Անվճար</h2>
            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-text">0 ֏</span>
              <span className="text-text-muted">/ամիս</span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-muted">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm text-text-muted">
                <X size={20} className="mt-0.5 h-5 w-5 shrink-0 text-text-muted/50" strokeWidth={2} />
                <span className="line-through decoration-text-muted/40">AI օգնական և փորձնական քննություններ</span>
              </li>
            </ul>

            <Link
              to="/"
              className="btn-fx mt-8 rounded-xl border border-border px-5 py-3 text-center font-medium text-text transition-colors hover:border-primary"
            >
              Սկսել անվճար
            </Link>
          </div>
        </Reveal>

        {/* Premium plan */}
        <Reveal delay={160} className="h-full">
          <div className="relative h-full">
            {/* Glow ring behind the card */}
            <div
              className="absolute -inset-1 rounded-[1.4rem] opacity-70 blur-xl"
              style={{ backgroundImage: HERO_GRADIENT, animation: "hierarchy-breathe 3.5s ease-in-out infinite" }}
              aria-hidden="true"
            />

            <div className="relative flex h-full flex-col rounded-2xl border border-transparent bg-surface p-8 shadow-lg">
              <span
                className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white shadow-md"
                style={{ backgroundImage: HERO_GRADIENT }}
              >
                <Crown size={14} strokeWidth={2.25} />
                Ամենահամապատասխանը
              </span>

              <h2 className="mt-2 text-xl font-semibold text-text">Պրեմիում</h2>

              <div className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-4xl font-bold text-text">{PROMO_PRICE}</span>
                <span className="text-text-muted">/ամիս</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundImage: HERO_GRADIENT }}
                >
                  −55%
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted">
                <span className="line-through">{REGULAR_PRICE}</span> /ամիս սովորական գնով
              </p>
              <p className="mt-2 text-sm text-text-muted">
                Անկախ գրանցման ամսաթվից՝ գինը կազմում է {PROMO_PRICE}/ամիս մինչև {PROMO_DEADLINE_LABEL}։ Այնուհետև
                գինը դառնում է {REGULAR_PRICE}/ամիս։
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm text-text">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      {f.icon}
                    </span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => showSuccess("Պրեմիում բաժանորդագրությունը շուտով հասանելի կլինի։")}
                className="btn-fx btn-fx-glow mt-8 rounded-xl px-5 py-3.5 text-center text-base font-semibold text-white"
                style={{ backgroundImage: HERO_GRADIENT }}
              >
                Ընտրել Պրեմիում
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-muted">
                <ShieldCheck size={14} strokeWidth={2} className="text-primary" />
                Չեղարկեք ցանկացած պահի, առանց հարցերի
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={220} className="relative mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-text-muted">
        <div className="flex items-center gap-1.5">
          <BadgeCheck size={16} strokeWidth={2} className="text-primary" />
          Անվտանգ վճարում
        </div>
        <div className="flex items-center gap-1.5">
          <Timer size={16} strokeWidth={2} className="text-primary" />
          Անմիջական հասանելիություն
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} strokeWidth={2} className="text-primary" />
          Չեղարկեք ցանկացած պահի
        </div>
      </Reveal>
    </div>
  );
}
