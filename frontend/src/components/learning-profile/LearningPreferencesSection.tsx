import { useState, type ReactNode } from "react";
import { Bot, Check, HelpCircle, MessageSquare, Shuffle } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { ExplanationStyle, LearningPreferences } from "../../api/profile";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { ErrorState } from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";
import { Switch } from "../ui/Switch";
import { useLearningProfileData } from "./LearningProfileData";

/*
  Configuring the tutor, not editing a settings row.

  This is the one section on the page whose values demonstrably change what the
  product does — apps.ai_assistant's prompt builder turns each of these into a
  system-prompt directive on every AI Tutor turn. The copy says exactly that,
  because a preference the student believes is decorative won't get set.

  Auto-saves per interaction (one PATCH, optimistic local state) — there is no
  half-filled state to protect here, so a Save button would only add a step.
*/

const styleIcon = { size: 18, strokeWidth: 1.75 };

const EXPLANATION_STYLES: {
  value: ExplanationStyle;
  icon: ReactNode;
  label: string;
  hint: string;
}[] = [
  {
    value: "mixed",
    icon: <Shuffle {...styleIcon} />,
    label: "Խառը",
    hint: "Haygit-ը ինքն է որոշում՝ ըստ հարցի և ըստ նրա, թե որտեղ ես կանգ առել։",
  },
  {
    value: "direct",
    icon: <MessageSquare {...styleIcon} />,
    label: "Ուղղակի",
    hint: "Ամբողջական բացատրություն միանգամից՝ առանց հարց-պատասխանի։",
  },
  {
    value: "socratic",
    icon: <HelpCircle {...styleIcon} />,
    label: "Սոկրատական",
    hint: "Ուղղորդող հարցեր, մինչև ինքդ հասնես պատասխանին։",
  },
];

const LANGUAGES: { value: LearningPreferences["preferred_language"]; label: string }[] = [
  { value: "", label: "Ավտոմատ" },
  { value: "hy", label: "Հայերեն" },
  { value: "en", label: "English" },
];

export function LearningPreferencesSection() {
  const { showError } = useToast();
  const { status, reload, preferences, setPreferences } = useLearningProfileData();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Ready with a null slice means this one endpoint failed while the
  // rest of the page loaded — show a retry here, not a dead skeleton.
  if (status === "ready" && preferences === null) {
    return <ErrorState title="Չհաջողվեց բեռնել AI Tutor-ի կարգավորումները։" onRetry={reload} />;
  }

  if (status === "loading" || !preferences) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
        <Skeleton className="h-4 w-56" />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  async function save(patch: Partial<LearningPreferences>) {
    if (!preferences) return;
    const previous = preferences;
    setPreferences({ ...preferences, ...patch });
    setSaving(true);
    setSaved(false);
    try {
      setPreferences(await profileApi.updateLearningPreferences(patch));
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setPreferences(previous); // roll back the optimistic write
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5">
        <Bot size={16} strokeWidth={1.75} className="text-text-muted" />
        <h2 className="text-sm font-semibold text-text">Ինչպե՞ս է քեզ սովորեցնում Haygit-ը</h2>
      </div>
      <p className="mb-5 text-xs text-text-muted">
        Այս ընտրությունները իրապես փոխում են AI Tutor-ի վարքագիծը՝ ամեն զրույցի սկզբում։
      </p>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-text-muted">Բացատրության ոճ</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPLANATION_STYLES.map((s) => {
            const active = preferences.explanation_style === s.value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                disabled={saving}
                onClick={() => save({ explanation_style: s.value })}
                className={`rounded-[var(--radius)] border-2 p-3.5 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                  active ? "border-primary bg-primary/10" : "border-border bg-bg hover:border-primary/40"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={`flex ${active ? "text-primary" : "text-text-muted"}`}>{s.icon}</span>
                  {active && (
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                  )}
                </span>
                <span className="mt-2 block text-sm font-semibold text-text">{s.label}</span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-text-muted">{s.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-bg px-3.5 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text">Ակնարկներ՝ նախքան պատասխանը</span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-text-muted">
              Նախքան ամբողջական լուծումը՝ փոքր հուշում։
            </span>
          </span>
          <Switch
            checked={preferences.hints_before_answers}
            onChange={(next) => save({ hints_before_answers: next })}
            disabled={saving}
            label="Ակնարկներ՝ նախքան պատասխանը"
          />
        </label>

        <div className="rounded-[var(--radius)] border border-border bg-bg px-3.5 py-3">
          <p className="text-sm font-medium text-text">Պատասխանի լեզու</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const active = preferences.preferred_language === l.value;
              return (
                <button
                  key={l.value || "auto"}
                  type="button"
                  aria-pressed={active}
                  disabled={saving}
                  onClick={() => save({ preferred_language: l.value })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border text-text-muted hover:border-primary hover:text-text"
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 flex h-4 justify-end">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-correct">
            <Check size={12} strokeWidth={2} /> Պահպանված է
          </span>
        )}
      </div>
    </div>
  );
}
