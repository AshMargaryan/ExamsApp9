import { useEffect, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { StudyAvailability } from "../../api/profile";
import { Button } from "../ui/Button";
import { NumberInput } from "../ui/NumberInput";
import { RangeSlider } from "../ui/RangeSlider";
import { TimePicker } from "../ui/TimePicker";
import { ErrorState } from "../ui/ErrorState";
import { Skeleton } from "../ui/Skeleton";
import { useLearningProfileData } from "./LearningProfileData";

/*
  "When do you study" — a schedule, not a settings form.

  Two real changes beyond the visuals:

  1. The min/max sliders now push each other instead of allowing an impossible
     pair. StudyAvailability.clean() rejects min > max server-side, so the old
     independent sliders let you build a configuration whose only feedback was a
     failed save. A control that can't express an invalid value needs no error.

  2. The summary line states back exactly what was declared, and says only what
     is actually true about where it goes: this data reaches the AI Tutor via
     the learner context. It does NOT claim the daily planner sizes itself to
     these numbers — it doesn't, yet.
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

/** Upper bound of the daily-time track. 5 hours is already far past any
 *  realistic school-night session; a longer track just makes the useful part
 *  of it harder to hit. */
const MAX_DAILY_MINUTES = 300;

export function StudyAvailabilitySection() {
  const { status, reload, availability, setAvailability } = useLearningProfileData();
  const [draft, setDraft] = useState<StudyAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (availability) setDraft(availability);
  }, [availability]);

  // Ready with a null slice means this one endpoint failed while the
  // rest of the page loaded — show a retry here, not a dead skeleton.
  if (status === "ready" && availability === null) {
    return <ErrorState title="Չհաջողվեց բեռնել ժամանակացույցը։" onRetry={reload} />;
  }

  if (status === "loading" || !draft) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-11 w-full" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const days = draft.preferred_days;
  const minDaily = draft.min_daily_minutes ?? 0;
  const maxDaily = draft.max_daily_minutes ?? 0;
  const dirty = availability !== null && JSON.stringify(draft) !== JSON.stringify(availability);

  function patch(next: Partial<StudyAvailability>) {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    setSaved(false);
    setSaveError(null);
  }

  function toggleDay(day: number) {
    patch({
      preferred_days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
    });
  }

  // The dual slider already guarantees min <= max, so this just stores it.
  function setDailyRange(next: { min: number; max: number }) {
    patch({ min_daily_minutes: next.min, max_daily_minutes: next.max });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await profileApi.updateStudyAvailability({
        preferred_days: draft.preferred_days,
        preferred_start_time: draft.preferred_start_time || null,
        typical_session_minutes: draft.typical_session_minutes,
        min_daily_minutes: draft.min_daily_minutes,
        max_daily_minutes: draft.max_daily_minutes,
      });
      setAvailability(updated);
      setDraft(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("Չհաջողվեց պահպանել։ Ստուգիր ինտերնետ կապը և փորձիր կրկին։");
    } finally {
      setSaving(false);
    }
  }

  const summaryParts: string[] = [];
  if (days.length > 0) summaryParts.push(`շաբաթը ${days.length} օր`);
  if (maxDaily > 0) summaryParts.push(minDaily > 0 ? `օրական ${minDaily}–${maxDaily} րոպե` : `օրական մինչև ${maxDaily} րոպե`);
  if (draft.preferred_start_time) summaryParts.push(`սկիզբը՝ ${draft.preferred_start_time.slice(0, 5)}`);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5">
        <CalendarClock size={16} strokeWidth={1.75} className="text-text-muted" />
        <h2 className="text-sm font-semibold text-text">Ե՞րբ ես սովորում</h2>
      </div>
      <p className="mb-5 text-xs text-text-muted">
        Քո հայտարարած ժամանակը՝ ոչ թե այն, ինչ համակարգը նկատել է։ Այս տվյալները փոխանցվում են AI Tutor-ին։
      </p>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-text-muted">Նախընտրելի օրեր</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => {
            const on = days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                aria-pressed={on}
                // Two weekday pickers live on this page (study days here, exam
                // days in the cadence section). Bare "Երկուշաբթի" on both would
                // give a screen reader two identical controls.
                aria-label={`${d.full} — ուսումնական օր`}
                className={`flex h-11 flex-col items-center justify-center rounded-[var(--radius)] border text-[12px] font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="start-time" className="mb-1.5 block text-xs font-medium text-text-muted">
            Նախընտրելի սկսելու ժամ
          </label>
          <TimePicker
            id="start-time"
            label="Նախընտրելի սկսելու ժամ"
            value={draft.preferred_start_time ?? ""}
            onChange={(v) => patch({ preferred_start_time: v || null })}
            placeholder="Ընտրիր ժամը"
          />
        </div>

        <div>
          <label htmlFor="session-minutes" className="mb-1.5 block text-xs font-medium text-text-muted">
            Սովորական սեսիայի տևողությունը
          </label>
          <NumberInput
            id="session-minutes"
            label="Սովորական սեսիայի տևողությունը"
            value={draft.typical_session_minutes ?? 30}
            onChange={(v) => patch({ typical_session_minutes: v })}
            min={5}
            max={180}
            step={5}
            suffix="ր"
          />
        </div>

        <RangeSlider
          className="sm:col-span-2"
          label="Օրական ուսումնական ժամանակ"
          minValue={minDaily}
          maxValue={maxDaily}
          onChange={setDailyRange}
          min={0}
          max={MAX_DAILY_MINUTES}
          step={5}
          format={(n) => `${n} ր`}
          formatRange={(lo, hi) => (hi === 0 ? "նշված չէ" : `${lo}–${hi} ր`)}
        />
      </div>

      {summaryParts.length > 0 && (
        <p className="mt-5 rounded-[var(--radius)] bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-text-muted">
          Դու նշել ես՝ <span className="font-medium text-text">{summaryParts.join(", ")}</span>։
        </p>
      )}

      {saveError && <p className="mt-3 text-xs text-incorrect">{saveError}</p>}

      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-correct">
            <Check size={12} strokeWidth={2} /> Պահպանված է
          </span>
        )}
        <Button size="sm" loading={saving} disabled={!dirty} onClick={save}>
          Պահպանել
        </Button>
      </div>
    </div>
  );
}
