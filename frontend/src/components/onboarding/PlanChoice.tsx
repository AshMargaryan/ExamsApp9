import { Bot, Check, Infinity as InfinityIcon, Layers, LineChart, Sparkles, Target, X } from "lucide-react";
import type { Draft } from "./scenes";

/*
  The last screen of onboarding: free or premium.

  Two constraints shape this, and they pull against each other.

  Premium has to feel like the obvious choice — that is the whole point of the
  screen. But premium cannot currently be bought: there is no payments
  integration in the backend, and `SubscriptionPage.tsx` documents that its
  purchase button used to fire a success toast for a purchase that never
  happened, and is now deliberately disabled. Shipping a "Choose Premium"
  button here that silently does nothing would rebuild exactly that bug, one
  screen before the student enters the product.

  So the resolution is to tell the truth, which happens to be a good offer:
  everything is open while the platform is being built. Premium is presented
  in full, marked as recommended, and its card says plainly that payment is
  not live yet — and therefore that the student gets all of it now. One real
  action continues into the app.

  When payments land, the premium card's footer is the only part that changes.
*/

const FREE = [
  "Սահմանափակ քանակի վարժություններ",
  "Հիմնական առաջընթացի հետևում",
  "Մեկ առարկա միաժամանակ",
];

const PREMIUM = [
  { Icon: Bot, text: "AI Tutor՝ ցանկացած թեմայի շուրջ" },
  { Icon: Target, text: "Անհատական պլան, որը փոխվում է ամեն օր" },
  { Icon: InfinityIcon, text: "Անսահմանափակ պրակտիկա բոլոր առարկաներից" },
  { Icon: Layers, text: "Ամբողջական փորձնական քննություններ" },
  { Icon: Sparkles, text: "Սխալների վերլուծություն՝ ըստ պատճառի" },
  { Icon: LineChart, text: "Գիտելիքի քարտեզ և չափելի առաջընթաց" },
];

export function PlanChoice({
  draft,
  onStart,
  busy,
}: {
  draft: Draft;
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <div className="ob-scene mx-auto w-full max-w-4xl">
      <div className="text-center" style={{ ["--i" as string]: 0 }}>
        <p className="text-[length:var(--text-sm)] tracking-[0.28em] text-night-ink-dim uppercase">
          Վերջին քայլը
        </p>
        <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,3rem)] leading-[1.08] font-semibold tracking-[var(--tracking-tight)]">
          {draft.first_name}, ինչպե՞ս ես ուզում սկսել։
        </h1>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]" style={{ ["--i" as string]: 1 }}>
        {/* Free. Quieter, but never crippled: it is a real choice, and making
            it visibly unpleasant would be the manipulation this screen avoids. */}
        <div className="flex flex-col rounded-[var(--radius-xl)] border border-night-line p-6">
          <p className="text-[length:var(--text-lg)] font-semibold">Անվճար</p>
          <p className="mt-1 text-[length:var(--text-sm)] text-night-ink-dim">
            Ծանոթացիր հարթակին։
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-night-ink-muted">
                <Check size={16} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
            {/* Excluded, and never by colour alone — the icon changes, the
                text is struck through, and it says so in words. */}
            <li className="flex items-start gap-2.5 text-[length:var(--text-sm)] text-night-ink-dim">
              <X size={16} strokeWidth={2.25} aria-hidden className="mt-0.5 shrink-0" />
              <span className="line-through decoration-from-font">
                AI Tutor և ամբողջական քննություններ
              </span>
            </li>
          </ul>
        </div>

        {/* Premium. Heavier border, filled ground, a badge and twice the
            content — the hierarchy does the persuading, not a dark pattern. */}
        <div className="relative flex flex-col rounded-[var(--radius-xl)] border-2 border-night-ink bg-night-fill p-6 sm:p-7">
          <span className="absolute -top-3 left-6 rounded-[var(--radius-full)] bg-night-ink px-3 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--color-night)]">
            Խորհուրդ ենք տալիս
          </span>

          <p className="text-[length:var(--text-lg)] font-semibold">Պրեմիում</p>
          <p className="mt-1 text-[length:var(--text-sm)] text-night-ink-muted">
            Ամբողջական Gitus-ը՝ առանց սահմանափակումների։
          </p>

          <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {PREMIUM.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[length:var(--text-sm)]">
                <Icon size={16} strokeWidth={1.9} aria-hidden className="mt-0.5 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-[var(--radius-md)] border border-night-line px-4 py-3 text-[length:var(--text-sm)] leading-[var(--leading-snug)] text-night-ink">
            <b className="font-semibold">Հիմա ամեն ինչ բաց է։</b> Վճարումը դեռ հասանելի չէ — մինչ
            կառուցում ենք հարթակը, այս բոլոր հնարավորությունները քոնն են անվճար։
          </p>
        </div>
      </div>

      <div className="mt-9 text-center" style={{ ["--i" as string]: 2 }}>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-8 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-50"
        >
          {busy ? "Կառուցում ենք…" : "Սկսել իմ ճանապարհը →"}
        </button>
        <p className="mt-3 text-[length:var(--text-sm)] text-night-ink-dim">
          Կարող ես փոխել ցանկացած պահի՝ կարգավորումներից։
        </p>
      </div>
    </div>
  );
}
