import { useEffect, useState } from "react";
import { Check, Gauge } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { CoachPreferences } from "../../api/profile";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";
import { TimePicker } from "../ui/TimePicker";
import { useLearningProfileData } from "./LearningProfileData";

/*
  How hard the coach is allowed to push.

  This exists because the daily plan was proposing a full mock exam whenever
  one scored badly — every day, to a student who has school tomorrow. A full
  sitting is an hour; the student is the only one who knows which evenings
  they actually have one.

  Unlike the availability section, the sentence at the bottom is a promise the
  product now keeps: apps.study_plan.services._mock_exams_allowed_today reads
  these exact fields and drops mock-exam candidates outside the chosen days or
  once the weekly quota is spent.

  The day chips can never exceed the weekly number — lowering the number trims
  the selection instead of leaving an impossible pair for the server to reject.
*/

const WEEKDAYS = [
  { value: 0, short: "Երկ", full: "Երկուշաբթի" },
  { value: 1, short: "Երք", full: "Երեքշաբթի" },
  { value: 2, short: "Չրք", full: "Չորեքշաբթի" },
  { value: 3, short: "Հնգ", full: "Հինգշաբթի" },
  { value: 4, short: "Ուրբ", full: "Ուրբաթ" },
  { value: 5, short: "Շբթ", full: "Շաբաթ" },
  { value: 6, short: "Կիր", full: "Կիրակի" },
];

const PER_WEEK_OPTIONS = [0, 1, 2, 3, 4, 5];

export function CoachCadenceSection() {
  const { status, reload, coachPreferences, setCoachPreferences } = useLearningProfileData();
  const [draft, setDraft] = useState<CoachPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (coachPreferences) setDraft(coachPreferences);
  }, [coachPreferences]);

  // Ready with a null slice means this one endpoint failed while the
  // rest of the page loaded — show a retry here, not a dead skeleton.
  if (status === "ready" && coachPreferences === null) {
    return <ErrorState title="Չհաջողվեց բեռնել թեստերի ռիթմը։" onRetry={reload} />;
  }

  if (status === "loading" || !draft) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-4 h-11 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
      </div>
    );
  }

  const perWeek = draft.mock_exams_per_week;
  const days = draft.preferred_test_days;
  const examsOff = perWeek === 0;
  const dirty = coachPreferences !== null && JSON.stringify(draft) !== JSON.stringify(coachPreferences);
  // Accepting the defaults is a choice too, and it has to be recordable —
  // otherwise the profile-completeness prompt asking for a cadence can never
  // be satisfied by the student it fits best.
  const canSave = dirty || draft.configured_at == null;

  function patch(next: Partial<CoachPreferences>) {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    setSaved(false);
    setSaveError(null);
  }

  function setPerWeek(value: number) {
    // Keep the earliest days when the allowance shrinks, and clear them
    // entirely at zero — the server rejects days > allowance, and there's no
    // reason to let the student build that state at all.
    patch({
      mock_exams_per_week: value,
      preferred_test_days: value === 0 ? [] : days.slice(0, value),
    });
  }

  function toggleDay(day: number) {
    if (examsOff) return;
    if (days.includes(day)) {
      patch({ preferred_test_days: days.filter((d) => d !== day) });
      return;
    }
    if (days.length >= perWeek) return; // at the allowance — nothing to add
    patch({ preferred_test_days: [...days, day].sort((a, b) => a - b) });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await profileApi.updateCoachPreferences({
        mock_exams_per_week: draft.mock_exams_per_week,
        preferred_test_days: draft.preferred_test_days,
        preferred_test_time: draft.preferred_test_time || null,
      });
      setCoachPreferences(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("Չհաջողվեց պահպանել։ Ստուգիր ինտերնետ կապը և փորձիր կրկին։");
    } finally {
      setSaving(false);
    }
  }

  const dayNames = days.map((d) => WEEKDAYS.find((w) => w.value === d)?.full).filter(Boolean);
  const summary = examsOff
    ? "Gitus-ը ընդհանրապես չի առաջարկի ամբողջական թեստեր։ Ամենօրյա պլանը կմնա կարճ առաջադրանքներից։"
    : `Gitus-ը կառաջարկի ամբողջական թեստ շաբաթը ${perWeek} անգամ${
        dayNames.length > 0 ? `՝ ${dayNames.join(", ")} օրերին` : "՝ ցանկացած օր"
      }${draft.preferred_test_time ? `, մոտ ${draft.preferred_test_time.slice(0, 5)}-ին` : ""}։ Մնացած օրերին՝ կարճ առաջադրանքներ։`;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5">
        <Gauge size={16} strokeWidth={1.75} className="text-text-muted" />
        <h2 className="text-sm font-semibold text-text">Ինչքա՞ն ուժեղ մղի քեզ Gitus-ը</h2>
      </div>
      <p className="mb-5 text-xs text-text-muted">
        Ամբողջական թեստը մեկ ժամ է։ Ընտրիր, թե շաբաթը քանի անգամ և ո՛ր օրերին է դա իրատեսական։
      </p>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-text-muted">Ամբողջական թեստ շաբաթվա մեջ</legend>
        <div className="flex flex-wrap gap-2">
          {PER_WEEK_OPTIONS.map((n) => {
            const active = perWeek === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                onClick={() => setPerWeek(n)}
                className={`h-11 min-w-[52px] rounded-[var(--radius)] border px-3 text-sm font-semibold tabular-nums transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border text-text-muted hover:border-primary hover:text-text"
                }`}
              >
                {n === 0 ? "Ոչ մեկ" : n}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5" disabled={examsOff}>
        <legend className="mb-2 text-xs font-medium text-text-muted">
          Ո՞ր օրերին
          {!examsOff && (
            <span className="ml-1.5 text-text-muted">
              ({days.length} / {perWeek} ընտրված{days.length === 0 ? " — ցանկացած օր" : ""})
            </span>
          )}
        </legend>
        <div className={`grid grid-cols-7 gap-1.5 ${examsOff ? "opacity-40" : ""}`}>
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.value);
            const full = !on && days.length >= perWeek;
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={on}
                aria-label={`${d.full} — թեստի օր`}
                disabled={examsOff || full}
                onClick={() => toggleDay(d.value)}
                className={`flex h-11 items-center justify-center rounded-[var(--radius)] border text-[12px] font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 ${
                  on
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border text-text-muted hover:border-primary hover:text-text"
                }`}
              >
                {d.short}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 max-w-xs">
        <label htmlFor="test-time" className="mb-1.5 block text-xs font-medium text-text-muted">
          Նախընտրելի ժամը
        </label>
        <TimePicker
          id="test-time"
          label="Նախընտրելի թեստի ժամը"
          value={draft.preferred_test_time ?? ""}
          onChange={(v) => patch({ preferred_test_time: v || null })}
          disabled={examsOff}
          placeholder="Ընտրիր ժամը"
        />
      </div>

      <p className="mt-5 rounded-[var(--radius)] bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-text-muted">
        {summary}
      </p>

      {saveError && <p className="mt-3 text-xs text-incorrect">{saveError}</p>}

      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-correct">
            <Check size={12} strokeWidth={2} /> Պահպանված է
          </span>
        )}
        <Button size="sm" loading={saving} disabled={!canSave} onClick={save}>
          Պահպանել
        </Button>
      </div>
    </div>
  );
}
