import { useEffect, useState } from "react";
import { CalendarClock, Check } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { StudyAvailability } from "../../api/profile";
import { extractErrorMessage, useToast } from "../../context/ToastContext";

const WEEKDAYS = [
  { value: 0, label: "Երկ" },
  { value: 1, label: "Երք" },
  { value: 2, label: "Չրք" },
  { value: 3, label: "Հնգ" },
  { value: 4, label: "Ուրբ" },
  { value: 5, label: "Շբթ" },
  { value: 6, label: "Կիր" },
];

export function StudyAvailabilitySection() {
  const { showError } = useToast();
  const [availability, setAvailability] = useState<StudyAvailability | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    profileApi
      .fetchStudyAvailability()
      .then(setAvailability)
      .catch((err) => {
        setLoadError(true);
        showError(extractErrorMessage(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleDay(day: number) {
    setAvailability((prev) => {
      if (!prev) return prev;
      const preferred_days = prev.preferred_days.includes(day)
        ? prev.preferred_days.filter((d) => d !== day)
        : [...prev.preferred_days, day].sort();
      return { ...prev, preferred_days };
    });
  }

  async function handleSave() {
    if (!availability) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const updated = await profileApi.updateStudyAvailability({
        preferred_days: availability.preferred_days,
        preferred_start_time: availability.preferred_start_time || null,
        typical_session_minutes: availability.typical_session_minutes,
        min_daily_minutes: availability.min_daily_minutes,
        max_daily_minutes: availability.max_daily_minutes,
      });
      setAvailability(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Չհաջողվեց պահպանել։ Ստուգեք ինտերնետ կապը և փորձեք կրկին։");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text">
        <CalendarClock size={16} strokeWidth={1.75} /> Ուսումնական հասանելիություն
      </p>
      <p className="mb-3 text-xs text-text-muted">
        Ձեր նախընտրությունները ուսումնական պլանավորման համար։
      </p>

      {loadError && <p className="text-sm text-incorrect">Չհաջողվեց բեռնել։ Թարմացրեք էջը և փորձեք կրկին։</p>}

      {availability === null ? (
        !loadError && <p className="text-sm text-text-muted">Բեռնվում է...</p>
      ) : (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-text-muted">Նախընտրելի օրեր</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    availability.preferred_days.includes(d.value)
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border text-text-muted hover:border-primary"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-text-muted">Նախընտրելի սկսելու ժամ</label>
              <input
                type="time"
                className={inputClass}
                value={availability.preferred_start_time ?? ""}
                onChange={(e) => setAvailability({ ...availability, preferred_start_time: e.target.value || null })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-muted">Սովորական տևողությունը</label>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  aria-label="Պակասեցնել"
                  onClick={() =>
                    setAvailability({
                      ...availability,
                      typical_session_minutes: Math.max(5, (availability.typical_session_minutes ?? 30) - 5),
                    })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text hover:bg-surface-muted"
                >
                  −
                </button>
                <span className="min-w-[52px] text-center text-base font-semibold text-text">
                  {availability.typical_session_minutes ?? 0}′
                </span>
                <button
                  type="button"
                  aria-label="Ավելացնել"
                  onClick={() =>
                    setAvailability({
                      ...availability,
                      typical_session_minutes: Math.min(180, (availability.typical_session_minutes ?? 30) + 5),
                    })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-text hover:bg-surface-muted"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="min-daily" className="mb-1 flex justify-between text-xs text-text-muted">
                <span>Նվազագույն օրական</span>
                <span>{availability.min_daily_minutes ?? 0}′</span>
              </label>
              <input
                id="min-daily"
                type="range"
                min={0}
                max={240}
                step={5}
                value={availability.min_daily_minutes ?? 0}
                onChange={(e) => setAvailability({ ...availability, min_daily_minutes: Number(e.target.value) })}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="max-daily" className="mb-1 flex justify-between text-xs text-text-muted">
                <span>Առավելագույն օրական</span>
                <span>{availability.max_daily_minutes ?? 0}′</span>
              </label>
              <input
                id="max-daily"
                type="range"
                min={0}
                max={300}
                step={5}
                value={availability.max_daily_minutes ?? 0}
                onChange={(e) => setAvailability({ ...availability, max_daily_minutes: Number(e.target.value) })}
                className="w-full accent-[var(--color-primary)]"
              />
            </div>
          </div>

          {saveError && <p className="mt-3 text-xs text-incorrect">{saveError}</p>}

          <div className="mt-3 flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-correct">
                <Check size={12} strokeWidth={1.75} /> Պահպանված է
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "..." : "Պահպանել"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
