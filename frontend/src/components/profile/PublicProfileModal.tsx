import { useEffect, useState } from "react";
import * as profileApi from "../../api/profile";
import type { Achievement, Profile, UserAchievement } from "../../api/profile";
import { RARITY_COLORS, RARITY_LABELS } from "../../lib/achievementRarity";

export function PublicProfileModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[] | null>(null);

  useEffect(() => {
    setProfile(null);
    setAchievements(null);
    setUserAchievements(null);
    profileApi.fetchUserProfile(userId).then(setProfile);
    profileApi.fetchAchievements().then(setAchievements);
    profileApi.fetchUserAchievements(userId).then(setUserAchievements);
  }, [userId]);

  const unlockedKeys = new Set((userAchievements ?? []).map((ua) => ua.achievement.key));
  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Պրոֆիլ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="text-lg text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>

        {!profile && <p className="text-text-muted">Բեռնվում է...</p>}

        {profile && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-2xl font-semibold text-text-muted">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text">{fullName || profile.username}</p>
                <p className="text-text-muted">@{profile.username}</p>
                <p className="text-sm text-text-muted">
                  Մակարդակ {profile.level} · {profile.total_xp} XP
                </p>
              </div>
            </div>

            {profile.bio && <p className="mt-4 whitespace-pre-wrap text-text">{profile.bio}</p>}

            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-text-muted">Դպրոց</p>
                <p className="text-text">{profile.school ? profile.school.name : "Չնշված"}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Ցանկալի բուհ</p>
                <p className="text-text">{profile.university ? profile.university.name : "Չնշված"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <p className="text-lg font-semibold text-text">{profile.stats.accuracy_percentage}%</p>
                <p className="text-xs text-text-muted">Ճշգրտություն</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">{profile.stats.practice_tests_completed}</p>
                <p className="text-xs text-text-muted">Ավարտված թեստեր</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">{profile.trophies_count}</p>
                <p className="text-xs text-text-muted">Նվաճումներ</p>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-text-muted">Նվաճումներ</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {achievements === null && <p className="col-span-full text-text-muted">Բեռնվում է...</p>}
                {achievements?.map((a) => {
                  const unlocked = unlockedKeys.has(a.key);
                  return (
                    <div
                      key={a.id}
                      title={a.description}
                      className={`rounded-[var(--radius)] border border-border bg-bg p-3 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}
                    >
                      <p className="text-xl">{unlocked ? a.icon || "🏆" : "🔒"}</p>
                      <p className="mt-1 text-xs font-medium text-text">{a.name}</p>
                      <p className="mt-0.5 text-[0.65rem] font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                        {RARITY_LABELS[a.rarity]}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
