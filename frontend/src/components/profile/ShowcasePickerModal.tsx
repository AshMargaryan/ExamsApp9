import { useState } from "react";
import * as profileApi from "../../api/profile";
import type { Achievement, UserAchievement } from "../../api/profile";
import { AchievementCard } from "../AchievementCard";

export function ShowcasePickerModal({
  achievements,
  myAchievements,
  currentIds,
  onClose,
  onSaved,
}: {
  achievements: Achievement[];
  myAchievements: UserAchievement[];
  currentIds: number[];
  onClose: () => void;
  onSaved: (showcase: UserAchievement[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>(currentIds);
  const [saving, setSaving] = useState(false);
  const unlockedKeys = new Set(myAchievements.map((ua) => ua.achievement.id));

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const showcase = await profileApi.updateShowcase(selected);
      onSaved(showcase);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const unlocked = achievements.filter((a) => unlockedKeys.has(a.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Ընտրիր ցուցադրվող նվաճումները</h2>
          <button type="button" onClick={onClose} aria-label="Փակել" className="text-lg text-text-muted hover:text-text">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-text-muted">Ընտրիր մինչև 3 նվաճում ({selected.length}/3)</p>

        {unlocked.length === 0 ? (
          <p className="text-text-muted">Դեռ ապակողպված նվաճումներ չկան։</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {unlocked.map((a) => {
              const isSelected = selected.includes(a.id);
              return (
                <div key={a.id} className="relative">
                  <AchievementCard achievement={a} unlocked onClick={() => toggle(a.id)} />
                  {isSelected && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-contrast">
                      {selected.indexOf(a.id) + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-muted"
          >
            Չեղարկել
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "..." : "Պահպանել"}
          </button>
        </div>
      </div>
    </div>
  );
}
