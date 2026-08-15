import { useEffect, useState, type ReactNode } from "react";
import { Check, HelpCircle, MessageSquare, Settings2, Shuffle } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { ExplanationStyle, LearningPreferences } from "../../api/profile";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { Switch } from "../ui/Switch";

const styleIconProps = { size: 16, strokeWidth: 1.75 };

const EXPLANATION_STYLES: { value: ExplanationStyle; icon: ReactNode; label: string; hint: string }[] = [
  { value: "mixed", icon: <Shuffle {...styleIconProps} />, label: "Խառը", hint: "ԱԲ Խորհրդատուն ինքն է որոշում իրավիճակով" },
  { value: "direct", icon: <MessageSquare {...styleIconProps} />, label: "Ուղղակի", hint: "Ամբողջական բացատրություն՝ առանց սոկրատական հարց-պատասխանի" },
  { value: "socratic", icon: <HelpCircle {...styleIconProps} />, label: "Սոկրատական", hint: "Ուղղորդող հարցեր՝ մինչև պատասխանը" },
];

const LANGUAGES: { value: LearningPreferences["preferred_language"]; label: string }[] = [
  { value: "", label: "Ավտոմատ" },
  { value: "hy", label: "Հայերեն" },
  { value: "en", label: "English" },
];

export function LearningPreferencesSection() {
  const { showError } = useToast();
  const [preferences, setPreferences] = useState<LearningPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    profileApi
      .fetchLearningPreferences()
      .then(setPreferences)
      .catch((err) => {
        setLoadError(true);
        showError(extractErrorMessage(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(patch: Partial<LearningPreferences>) {
    if (!preferences) return;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await profileApi.updateLearningPreferences(patch);
      setPreferences(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const pillClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? "border-primary bg-primary text-primary-contrast"
        : "border-border text-text-muted hover:border-primary"
    }`;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text">
        <Settings2 size={16} strokeWidth={1.75} /> ԱԲ Խորհրդատուի նախընտրություններ
      </p>
      <p className="mb-3 text-xs text-text-muted">Ինչպե՞ս եք ուզում, որ ձեզ բացատրի ԱԲ Խորհրդատուն։</p>

      {loadError && <p className="text-sm text-incorrect">Չհաջողվեց բեռնել։ Թարմացրեք էջը և փորձեք կրկին։</p>}

      {preferences === null ? (
        !loadError && <p className="text-sm text-text-muted">Բեռնվում է...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs text-text-muted">Բացատրության ոճ</label>
            <div className="flex flex-col gap-2">
              {EXPLANATION_STYLES.map((s) => {
                const active = preferences.explanation_style === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => save({ explanation_style: s.value })}
                    disabled={saving}
                    className={`rounded-[var(--radius)] border-2 p-3 text-left transition-colors disabled:opacity-60 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-bg hover:border-primary/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="flex text-base">{s.icon}</span>
                        <span className="text-sm font-semibold text-text">{s.label}</span>
                      </span>
                      {active && (
                        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
                          <Check size={11} strokeWidth={2} />
                        </span>
                      )}
                    </span>
                    <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{s.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium text-text">Ակնարկներ՝ նախքան պատասխանը</span>
              <span className="mt-0.5 block text-xs text-text-muted">Նախքան ամբողջական լուծումը՝ ցույց տալ փոքր հուշում</span>
            </span>
            <Switch
              checked={preferences.hints_before_answers}
              onChange={(next) => save({ hints_before_answers: next })}
              disabled={saving}
              label="Ակնարկներ՝ նախքան պատասխանը"
            />
          </label>

          <div>
            <label className="mb-1 block text-xs text-text-muted">Պատասխանի լեզու</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value || "auto"}
                  type="button"
                  onClick={() => save({ preferred_language: l.value })}
                  disabled={saving}
                  className={pillClass(preferences.preferred_language === l.value)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {saved && (
            <span className="flex items-center gap-1 self-end text-xs text-correct">
              <Check size={12} strokeWidth={1.75} /> Պահպանված է
            </span>
          )}
        </div>
      )}
    </div>
  );
}
