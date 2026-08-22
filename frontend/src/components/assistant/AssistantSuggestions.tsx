import type { ReactNode } from "react";
import { HelpCircle, Lightbulb, RefreshCw, Repeat2, Sparkles, Target } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  What turns a chat box into a tutor.

  §37 is explicit that this surface must not be a generic ChatGPT clone, and
  that the student should be able to move easily from "I don't understand" to
  "give me a hint" to "explain it differently" to "give me a similar problem"
  to "test whether I understand it". None of those existed: after a reply, the
  only affordance was an empty composer, so every one of those moves required
  the student to compose the request themselves — in Armenian, while stuck,
  which is exactly when writing a good prompt is hardest.

  These are the four moves as one tap each. They are follow-ups, not a
  command palette: they appear under the latest answer and disappear while a
  reply is streaming, so they never compete with the composer or imply the
  student must pick one.

  The starters do the same job for an empty conversation, where a blank box
  and "Ինչի՞ մասին խոսենք այսօր" is the least helpful possible prompt for
  someone who does not yet know how to ask.
*/

export type SuggestionAction = {
  id: string;
  label: string;
  prompt: string;
  icon: ReactNode;
};

/** Follow-ups offered under the most recent assistant answer. */
export const FOLLOW_UP_ACTIONS: SuggestionAction[] = [
  {
    id: "simpler",
    label: "Բացատրիր ավելի պարզ",
    prompt: "Բացատրիր նույնը ավելի պարզ ու քայլ առ քայլ, կարծես առաջին անգամ եմ լսում։",
    icon: <Lightbulb size={14} strokeWidth={2} />,
  },
  {
    id: "example",
    label: "Ցույց տուր օրինակ",
    prompt: "Ցույց տուր մեկ լուծված օրինակ՝ բոլոր քայլերով։",
    icon: <Sparkles size={14} strokeWidth={2} />,
  },
  {
    id: "similar",
    label: "Տուր նման խնդիր",
    prompt: "Տուր ինձ նման մի խնդիր, որ ինքս լուծեմ։ Պատասխանը դեռ մի՛ ասա։",
    icon: <Repeat2 size={14} strokeWidth={2} />,
  },
  {
    id: "quiz",
    label: "Ստուգիր՝ հասկացա՞ եմ",
    prompt: "Տուր ինձ 3 կարճ հարց այս թեմայից՝ ստուգելու համար, թե որքան եմ հասկացել։",
    icon: <Target size={14} strokeWidth={2} />,
  },
];

/** Openers offered in a conversation with no messages yet. */
export const STARTER_ACTIONS: SuggestionAction[] = [
  {
    id: "explain-topic",
    label: "Բացատրիր մի թեմա",
    prompt: "Բացատրիր ինձ մի թեմա, որը դժվար է ինձ համար։ Սկսիր՝ հարցնելով, թե որ թեման է։",
    icon: <Lightbulb size={14} strokeWidth={2} />,
  },
  {
    id: "stuck",
    label: "Խնդիր չեմ կարողանում լուծել",
    prompt: "Չեմ կարողանում լուծել մի խնդիր։ Կուղարկեմ պայմանը, իսկ դու տուր ակնարկ՝ առանց ամբողջ լուծումը ասելու։",
    icon: <HelpCircle size={14} strokeWidth={2} />,
  },
  {
    id: "quiz-me",
    label: "Ստուգիր իմ գիտելիքը",
    prompt: "Տուր ինձ մի քանի հարց՝ ստուգելու համար, թե ինչ գիտեմ, և ասա որտեղ եմ թույլ։",
    icon: <Target size={14} strokeWidth={2} />,
  },
  {
    id: "revise",
    label: "Օգնիր կրկնել քննության համար",
    prompt: "Օգնիր կազմել կարճ կրկնության պլան միասնական քննության համար։",
    icon: <RefreshCw size={14} strokeWidth={2} />,
  },
];

export function AssistantSuggestions({
  actions,
  onPick,
  disabled = false,
  label,
  className,
}: {
  actions: SuggestionAction[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  /** Optional heading, e.g. "Հաջորդ քայլը". */
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      {label && (
        <p className="text-[length:var(--text-xs)] font-medium text-text-muted">{label}</p>
      )}
      <ul className="flex flex-wrap gap-[var(--space-2)]">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(action.prompt)}
              className={cn(
                "inline-flex items-center gap-[var(--space-2)] rounded-full border border-border",
                "bg-surface px-[var(--space-3)] py-[var(--space-2)]",
                "text-[length:var(--text-sm)] text-text transition-colors",
                "hover:border-primary hover:text-primary",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <span className="shrink-0 text-primary" aria-hidden>
                {action.icon}
              </span>
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
