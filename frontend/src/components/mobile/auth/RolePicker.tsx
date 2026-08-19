import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Presentation, Users } from "lucide-react";
import type { AccountRole } from "../../../api/auth";

/*
  "Who are you?" — the first real decision in signup, and the one that decides
  which product the person sees afterwards. It deserves more than three rows of
  text, so each role gets its own identity:

    - a distinct colour drawn from the existing theme tokens (no new palette),
    - a line-art icon rather than an emoji, which renders differently on every
      OS and reads as a placeholder,
    - a one-line promise of what that role actually gets,
    - a card that fills the width and answers to touch.

  Cards fade up in sequence on mount. It's ~200ms of motion that makes the
  screen feel authored rather than dumped, and it's skipped entirely under
  prefers-reduced-motion (the stagger below is opacity/transform only, both of
  which the global reduced-motion rule in index.css already neutralises).
*/

interface RoleOption {
  role: AccountRole;
  title: string;
  promise: string;
  icon: typeof GraduationCap;
  /** Theme token the card's accent is mixed from. */
  accent: string;
}

const ROLES: RoleOption[] = [
  {
    role: "student",
    title: "Աշակերտ",
    promise: "Սովորիր, պատրաստվիր քննություններին և հետևիր առաջընթացիդ։",
    icon: GraduationCap,
    accent: "var(--color-primary)",
  },
  {
    role: "teacher",
    title: "Ուսուցիչ",
    promise: "Տուր առաջադրանքներ և տես, թե ով որտեղ է դժվարանում։",
    icon: Presentation,
    accent: "var(--color-accent)",
  },
  {
    role: "parent",
    title: "Ծնող",
    promise: "Հետևիր երեխայիդ առաջընթացին՝ առանց նրա ուսերին կանգնելու։",
    icon: Users,
    accent: "var(--color-pink)",
  },
];

export function RolePicker({ onPick }: { onPick: (role: AccountRole) => void }) {
  const [shown, setShown] = useState(false);
  // Committed role is held briefly so the card can register the tap visually
  // before the step changes underneath it.
  const [chosen, setChosen] = useState<AccountRole | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(timer);
  }, []);

  function choose(role: AccountRole) {
    setChosen(role);
    setTimeout(() => onPick(role), 120);
  }

  return (
    <div className="flex flex-col gap-3.5">
      {ROLES.map((option, index) => {
        const Icon = option.icon;
        const isChosen = chosen === option.role;
        const dimmed = chosen !== null && !isChosen;

        return (
          <button
            key={option.role}
            type="button"
            onClick={() => choose(option.role)}
            style={{
              transitionDelay: shown ? `${index * 70}ms` : "0ms",
              // color-mix keeps every accent derived from one theme token, so a
              // palette change in theme.css still flows through here.
              borderColor: isChosen ? option.accent : undefined,
              background: isChosen
                ? `color-mix(in srgb, ${option.accent} 12%, var(--color-surface))`
                : undefined,
            }}
            className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[22px] border border-border bg-surface p-4 text-left transition-all duration-300 ease-out active:scale-[0.98] ${
              shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            } ${dimmed ? "scale-[0.98] opacity-40" : ""}`}
          >
            {/* Accent wash bleeding in from the icon side — gives each card its
                own temperature without printing a coloured block on the page. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-40 opacity-[0.10]"
              style={{ background: `radial-gradient(70% 100% at 0% 50%, ${option.accent} 0%, transparent 75%)` }}
            />

            <span
              className="relative flex h-14 w-14 flex-none items-center justify-center rounded-2xl"
              style={{
                background: `color-mix(in srgb, ${option.accent} 16%, transparent)`,
                color: option.accent,
              }}
            >
              <Icon size={26} strokeWidth={1.75} />
            </span>

            <span className="relative flex-1">
              <span className="block text-[17px] font-bold tracking-tight text-text">{option.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-text-muted">{option.promise}</span>
            </span>

            <span
              className="relative flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors"
              style={{
                background: isChosen ? option.accent : "var(--color-surface-muted)",
                color: isChosen ? "#fff" : "var(--color-text-muted)",
              }}
            >
              <ArrowRight size={16} strokeWidth={2.25} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
