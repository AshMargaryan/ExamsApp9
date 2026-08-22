import { useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";
import { useTheme, type ThemePreference } from "../../hooks/useTheme";
import { ACCENTS, getStoredAccent, saveAccent, type AccentId } from "../../lib/accentTheme";

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun; hint: string }[] = [
  { id: "light", label: "Լուսավոր", icon: Sun, hint: "Միշտ լուսավոր" },
  { id: "dark", label: "Մուգ", icon: Moon, hint: "Միշտ մուգ" },
  { id: "system", label: "Համակարգային", icon: Monitor, hint: "Ինչպես սարքում է" },
];

/*
  Two controls, both of which change colour, so they share one card and one
  live preview rather than each explaining itself in prose.

  `system` is the important addition. The old toggle was two-state and wrote
  its choice to storage on first render, so every student was silently pinned
  to whatever their OS happened to prefer the first time they opened the app,
  with no way back to "follow my phone". That is the setting most people
  actually want on a device that goes dark at night.
*/
function ThemeChoice() {
  const { preference, setPreference, theme } = useTheme();

  return (
    <fieldset className="min-w-0">
      <legend className="text-[length:var(--text-sm)] font-semibold text-text">Ռեժիմ</legend>
      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
        {preference === "system"
          ? `Հետևում է սարքի կարգավորմանը՝ հիմա ${theme === "dark" ? "մուգ" : "լուսավոր"}։`
          : "Ընտրված ռեժիմը կպահվի այս սարքում։"}
      </p>

      <div className="mt-[var(--space-3)] grid grid-cols-1 gap-[var(--space-2)] sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = preference === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border p-[var(--space-3)]",
                "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
                "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
                active
                  ? "border-primary bg-primary-bg"
                  : "border-border bg-surface hover:border-primary-line",
              )}
            >
              <input
                type="radio"
                name="theme-preference"
                value={option.id}
                checked={active}
                onChange={() => setPreference(option.id)}
                className="sr-only"
              />
              <Icon
                size={18}
                strokeWidth={1.75}
                className={cn("shrink-0", active ? "text-primary" : "text-text-muted")}
                aria-hidden
              />
              <span className="min-w-0">
                <span className={cn("block text-[length:var(--text-sm)]", active ? "font-semibold text-text" : "text-text")}>
                  {option.label}
                </span>
                <span className="block text-[length:var(--text-xs)] text-text-muted">{option.hint}</span>
              </span>
              {/* Not colour alone: the chosen option carries a check as well as
                  a tinted ground, so the selection survives greyscale. */}
              {active && <Check size={16} strokeWidth={2.25} className="ml-auto shrink-0 text-primary" aria-hidden />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AccentChoice() {
  const { theme } = useTheme();
  const [accent, setAccent] = useState<AccentId>(getStoredAccent);
  const groupRef = useRef<HTMLDivElement>(null);

  function choose(next: AccentId) {
    setAccent(next);
    saveAccent(next);
  }

  return (
    // A div rather than a fieldset: the radiogroup below already carries the
    // grouping and the name, so a legend would announce the label twice.
    <div className="mt-[var(--space-6)] min-w-0 border-t border-border pt-[var(--space-6)]">
      <p id="accent-choice-label" className="text-[length:var(--text-sm)] font-semibold text-text">
        Շեշտի գույն
      </p>
      <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
        Կոճակների, հղումների և ընթացքի գույնը։ Յուրաքանչյուր տարբերակ ունի իր առանձին տարբերակը մուգ ռեժիմի համար։
      </p>

      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby="accent-choice-label"
        className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]"
        // A radiogroup is arrowed through, not tabbed through — one tab stop
        // in, then left/right between the options, same as the rankings scope
        // selector. Without this the six swatches were six tab stops between
        // the theme cards and the password form.
        onKeyDown={(e) => {
          const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
          if (delta === 0) return;
          e.preventDefault();
          const index = ACCENTS.findIndex((a) => a.id === accent);
          const next = ACCENTS[(index + delta + ACCENTS.length) % ACCENTS.length];
          choose(next.id);
          // Focus follows the selection, so the ring is on the option that is
          // now checked rather than stranded on the one that no longer is.
          groupRef.current?.querySelector<HTMLButtonElement>(`[data-accent-id="${next.id}"]`)?.focus();
        }}
      >
        {ACCENTS.map((option) => {
          const active = accent === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              data-accent-id={option.id}
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => choose(option.id)}
              className={cn(
                "flex items-center gap-[var(--space-2)] rounded-full border py-[var(--space-2)] pl-[var(--space-2)] pr-[var(--space-4)]",
                "text-[length:var(--text-sm)] transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
                active
                  ? "border-primary bg-primary-bg font-semibold text-text"
                  : "border-border bg-surface text-text-muted hover:border-primary-line hover:text-text",
              )}
            >
              <span
                aria-hidden
                className="relative flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: theme === "dark" ? option.swatch.dark : option.swatch.light }}
              >
                {active && (
                  <Check
                    size={14}
                    strokeWidth={3}
                    style={{ color: theme === "dark" ? "#12141c" : "#ffffff" }}
                  />
                )}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      {/* The preview is the point of the section: a student should see the
          consequence of the choice without hunting for a button elsewhere in
          the app. These are the three ways the accent actually appears. */}
      <div className="mt-[var(--space-5)] rounded-[var(--radius-lg)] border border-border bg-bg p-[var(--space-4)]">
        <p className="text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
          Նախադիտում
        </p>
        <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-3)]">
          <span className="rounded-[var(--radius-md)] bg-primary px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-primary-contrast">
            Սկսել պարապմունքը
          </span>
          <span className="text-[length:var(--text-sm)] font-medium text-primary underline underline-offset-2">
            Տեսնել բոլորը
          </span>
          <span className="h-2 w-32 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full w-2/3 rounded-full bg-primary" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSection() {
  return (
    <Card>
      <ThemeChoice />
      <AccentChoice />
    </Card>
  );
}
