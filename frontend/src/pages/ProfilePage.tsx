import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import * as profileApi from "../api/profile";
import type { Achievement, AchievementRarity, Profile, UserAchievement } from "../api/profile";
import * as streaksApi from "../api/streaks";
import type { LearningStreak } from "../api/streaks";
import { getHierarchy } from "../api/practice";
import { searchSchools, searchUniversities } from "../api/schools";
import { SearchSelect } from "../components/SearchSelect";
import { MessageModal } from "../components/MessageModal";
import { useAuth } from "../auth/AuthContext";

const GRADES = Array.from({ length: 12 }, (_, i) => 12 - i);

const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "Սովորական",
  rare: "Հազվագյուտ",
  epic: "Էպիկական",
  legendary: "Լեգենդար",
};

const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "var(--color-text-muted)",
  rare: "var(--color-primary)",
  epic: "var(--color-accent)",
  legendary: "var(--color-medium)",
};

interface Option {
  id: number;
  label: string;
  sublabel?: string;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
      <p className="text-2xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

function StreakCard({ streak }: { streak: LearningStreak | null }) {
  if (!streak) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
        Բեռնվում է...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface p-5">
      <div>
        <p className="text-2xl font-semibold text-text">
          🔥 {streak.current_streak}-օրյա շարք
        </p>
        <p className="mt-1 text-sm text-text-muted">Լավագույն շարք՝ {streak.longest_streak} օր</p>
      </div>
    </div>
  );
}

function ComingSoonCard({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center opacity-60">
      <p className="text-2xl">{icon}</p>
      <p className="mt-1 text-sm font-medium text-text">{title}</p>
      <p className="text-xs text-text-muted">Շուտով...</p>
    </div>
  );
}

export function ProfilePage() {
  const { refreshUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [myAchievements, setMyAchievements] = useState<UserAchievement[] | null>(null);
  const [streak, setStreak] = useState<LearningStreak | null>(null);
  const [practicePercent, setPracticePercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [grade, setGrade] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState<Option | null>(null);
  const [university, setUniversity] = useState<Option | null>(null);

  function loadFromProfile(p: Profile) {
    setUsername(p.username);
    setFirstName(p.first_name);
    setLastName(p.last_name);
    setBio(p.bio);
    setGrade(p.grade ? String(p.grade) : "");
    setAge(p.age ? String(p.age) : "");
    setSchool(p.school ? { id: p.school.id, label: p.school.name, sublabel: p.school.marz } : null);
    setUniversity(p.university ? { id: p.university.id, label: p.university.name } : null);
  }

  useEffect(() => {
    profileApi.fetchProfile().then((p) => {
      setProfile(p);
      loadFromProfile(p);
    });
    profileApi.fetchAchievements().then(setAchievements);
    profileApi.fetchMyAchievements().then(setMyAchievements);
    streaksApi.fetchStreak().then(setStreak);
    getHierarchy().then((subjects) => {
      if (subjects.length === 0) return setPracticePercent(0);
      const avg = subjects.reduce((sum, s) => sum + s.progress.percent, 0) / subjects.length;
      setPracticePercent(Math.round(avg));
    });
  }, []);

  function handleAvatarClick() {
    if (editing) fileInputRef.current?.click();
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function cancelEdit() {
    if (profile) loadFromProfile(profile);
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditing(false);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await profileApi.updateProfile({
        username,
        first_name: firstName,
        last_name: lastName,
        bio,
        grade: grade ? Number(grade) : null,
        age: age ? Number(age) : null,
        school_id: school?.id ?? null,
        university_id: university?.id ?? null,
        avatar: avatarFile ?? undefined,
      });
      setProfile(updated);
      loadFromProfile(updated);
      setAvatarFile(null);
      setAvatarPreview(null);
      setEditing(false);
      await refreshUser();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as Record<string, string[] | string>;
        const firstError = Object.values(data).flat()[0];
        setError((firstError as string) ?? "Պահպանումը ձախողվեց։");
      } else {
        setError("Պահպանումը ձախողվեց։");
      }
    } finally {
      setSaving(false);
    }
  }

  async function schoolSearch(q: string): Promise<Option[]> {
    const results = await searchSchools(q);
    return results.map((s) => ({ id: s.id, label: s.name, sublabel: s.marz }));
  }

  async function universitySearch(q: string): Promise<Option[]> {
    const results = await searchUniversities(q);
    return results.map((u) => ({ id: u.id, label: u.name }));
  }

  if (!profile) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const unlockedKeys = new Set((myAchievements ?? []).map((ua) => ua.achievement.key));
  const inputClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const xpPercent =
    profile.xp_for_next_level > 0
      ? Math.min(100, Math.round((profile.xp_into_level / profile.xp_for_next_level) * 100))
      : 100;

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              Խմբագրել
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-border px-4 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted"
              >
                Չեղարկել
              </button>
              <button
                type="submit"
                form="profile-form"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {saving ? "..." : "Պահպանել"}
              </button>
            </div>
          )}
        </div>

        <form id="profile-form" onSubmit={handleSave}>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-3xl font-semibold text-text-muted ${editing ? "cursor-pointer" : "cursor-default"}`}
                >
                  {avatarPreview || profile.avatar ? (
                    <img
                      src={avatarPreview ?? profile.avatar ?? undefined}
                      alt={profile.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                  )}
                </button>
                {editing && (
                  <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
                    ✎
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                {!editing ? (
                  <>
                    <h1 className="text-2xl font-semibold text-text">{fullName || profile.username}</h1>
                    <p className="text-text-muted">@{profile.username}</p>
                    <p className="mt-1 text-sm text-text-muted">
                      Մակարդակ {profile.level} · {profile.total_xp} XP
                    </p>
                    {(profile.grade || profile.age) && (
                      <p className="mt-1 text-sm text-text-muted">
                        {[profile.grade ? `${profile.grade}-րդ դասարան` : null, profile.age ? `${profile.age} տարեկան` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Օգտանուն</label>
                      <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div>
                      <label className={labelClass}>Անուն</label>
                      <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Ազգանուն</label>
                      <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Տարիք</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        className={inputClass}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Դասարան</label>
                      <select className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
                        <option value="">Չընտրված</option>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}-րդ դասարան
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              {!editing ? (
                <p className="whitespace-pre-wrap text-text">{profile.bio || "Բիո դեռ ավելացված չէ։"}</p>
              ) : (
                <>
                  <label className={labelClass}>Բիո</label>
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <div>
                <p className={labelClass}>Դպրոց</p>
                {!editing ? (
                  <p className="text-text">
                    {profile.school ? `${profile.school.name}${profile.school.marz ? ` (${profile.school.marz})` : ""}` : "Չնշված"}
                  </p>
                ) : (
                  <SearchSelect placeholder="Փնտրեք դպրոց..." value={school} onChange={setSchool} search={schoolSearch} />
                )}
              </div>
              <div>
                <p className={labelClass}>Ցանկալի բուհ</p>
                {!editing ? (
                  <p className="text-text">{profile.university ? profile.university.name : "Չնշված"}</p>
                ) : (
                  <SearchSelect
                    placeholder="Փնտրեք բուհ..."
                    value={university}
                    onChange={setUniversity}
                    search={universitySearch}
                  />
                )}
              </div>
            </div>
          </div>
        </form>

        <section className="mt-8">
          <StreakCard streak={streak} />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-text">Վիճակագրություն</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Պարապանքի առաջընթաց"
              value={practicePercent !== null ? `${practicePercent}%` : "..."}
            />
            <StatCard label="Ճշգրտություն" value={`${profile.stats.accuracy_percentage}%`} />
            <StatCard
              label="Ավարտված թեստեր"
              value={String(profile.stats.practice_tests_completed)}
              hint="Ամբողջական հաշվարկը՝ շուտով"
            />
            <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
              <p className="text-2xl font-semibold text-text">{profile.level}</p>
              <p className="mt-1 text-sm text-text-muted">Մակարդակ</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {profile.xp_into_level} / {profile.xp_for_next_level} XP
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-text">
            Նվաճումներ {achievements ? `(${profile.trophies_count}/${achievements.length})` : ""}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {achievements === null && <p className="text-text-muted">Բեռնվում է...</p>}
            {achievements?.map((a) => {
              const unlocked = unlockedKeys.has(a.key);
              return (
                <div
                  key={a.id}
                  title={a.description}
                  className={`rounded-[var(--radius)] border border-border bg-surface p-4 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}
                >
                  <p className="text-2xl">{unlocked ? a.icon || "🏆" : "🔒"}</p>
                  <p className="mt-1 text-sm font-medium text-text">{a.name}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                    {RARITY_LABELS[a.rarity]}
                  </p>
                </div>
              );
            })}
            {achievements?.length === 0 && (
              <p className="col-span-full text-text-muted">Նվաճումներ դեռ չկան։</p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-text">Առաջիկայում</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ComingSoonCard icon="👥" title="Ընկերներ" />
            <ComingSoonCard icon="🏁" title="Մրցարշավային վարկանիշ" />
            <ComingSoonCard icon="🎮" title="Խաղային վիճակագրություն" />
          </div>
        </section>
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
