import type { PersonalRecords } from "../../api/profile";

function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} ժ ${minutes} ր` : `${minutes} ր`;
}

export function PersonalRecordsCard({ records }: { records: PersonalRecords }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Բարձրագույն թեստի արդյունք", value: records.highest_test_score !== null ? `${records.highest_test_score}` : null },
    { label: "Ամենաերկար շարք", value: records.longest_streak_days !== null ? `${records.longest_streak_days} օր` : null },
    { label: "Ամենաշատ հարց մեկ օրում", value: records.most_questions_in_a_day !== null ? `${records.most_questions_in_a_day}` : null },
    { label: "Ամենաերկար պարապմունք", value: records.longest_study_session_seconds !== null ? formatSeconds(records.longest_study_session_seconds) : null },
    { label: "Լավագույն ամսվա XP", value: records.best_month_xp !== null ? `${records.best_month_xp} XP` : null },
  ];
  const hasAny = rows.some((r) => r.value !== null);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-3 text-sm font-semibold text-text">🏅 Անձնական ռեկորդներ</p>
      {!hasAny ? (
        <p className="text-sm text-text-muted">Սովորեք, որպեսզի սահմանեք ձեր առաջին ռեկորդը։</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {rows
            .filter((r) => r.value !== null)
            .map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2 text-sm">
                <span className="text-text-muted">{r.label}</span>
                <span className="font-medium text-text">{r.value}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
