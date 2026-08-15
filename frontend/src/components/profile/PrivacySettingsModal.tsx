import { useEffect, useState } from "react";
import * as profileApi from "../../api/profile";
import type { PrivacySettings } from "../../api/profile";

const LABELS: Record<keyof PrivacySettings, string> = {
  show_school: "Դպրոց",
  show_age: "Տարիք",
  show_university: "Ցանկալի բուհ",
  show_stats: "Ուսումնական վիճակագրություն",
  show_ranking: "Դասակարգման մեդալներ",
  show_achievements: "Նվաճումներ",
  show_friends: "Ընկերներ",
  show_activity: "Ակտիվություն",
  show_on_leaderboard: "Երևալ դասակարգման ցուցակում",
};

export function PrivacySettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileApi.fetchPrivacySettings().then(setSettings);
  }, []);

  async function toggle(key: keyof PrivacySettings) {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSaving(true);
    try {
      await profileApi.updatePrivacySettings({ [key]: next[key] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">🔒 Գաղտնիություն</h2>
          <button type="button" onClick={onClose} aria-label="Փակել" className="text-lg text-text-muted hover:text-text">
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-text-muted">Ընտրեք, թե ինչ կարող են տեսնել այլ օգտատերեր ձեր հանրային պրոֆիլում։</p>

        {!settings && <p className="text-text-muted">Բեռնվում է...</p>}

        {settings && (
          <div className="flex flex-col gap-3">
            {(Object.keys(LABELS) as (keyof PrivacySettings)[]).map((key) => (
              <label key={key} className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2">
                <span className="text-sm text-text">{LABELS[key]}</span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={() => toggle(key)}
                  disabled={saving}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
              </label>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          Փակել
        </button>
      </div>
    </div>
  );
}
