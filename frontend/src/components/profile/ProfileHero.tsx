import { useRef, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import * as profileApi from "../../api/profile";
import type { Achievement, Profile, UserAchievement } from "../../api/profile";
import { searchSchools, searchUniversities } from "../../api/schools";
import { SearchSelect } from "../SearchSelect";
import { ProgressBar } from "../ui/ProgressBar";
import { ShowcasePickerModal } from "./ShowcasePickerModal";
import { useAuth } from "../../auth/AuthContext";

const GRADES = Array.from({ length: 12 }, (_, i) => 12 - i);

interface Option {
  id: number;
  label: string;
  sublabel?: string;
}

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

export function ProfileHero({
  profile,
  achievements,
  myAchievements,
  onProfileUpdated,
}: {
  profile: Profile;
  achievements: Achievement[] | null;
  myAchievements: UserAchievement[] | null;
  onProfileUpdated: (p: Profile) => void;
}) {
  const { refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [showcase, setShowcase] = useState(profile.showcase_achievements ?? []);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(profile.username);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [bio, setBio] = useState(profile.bio);
  const [grade, setGrade] = useState(profile.grade ? String(profile.grade) : "");
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [targetMajor, setTargetMajor] = useState(profile.target_major);
  const [school, setSchool] = useState<Option | null>(
    profile.school ? { id: profile.school.id, label: profile.school.name, sublabel: profile.school.marz } : null
  );
  const [university, setUniversity] = useState<Option | null>(
    profile.university ? { id: profile.university.id, label: profile.university.name } : null
  );

  function startEdit() {
    setUsername(profile.username);
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setBio(profile.bio);
    setGrade(profile.grade ? String(profile.grade) : "");
    setAge(profile.age ? String(profile.age) : "");
    setTargetMajor(profile.target_major);
    setSchool(profile.school ? { id: profile.school.id, label: profile.school.name, sublabel: profile.school.marz } : null);
    setUniversity(profile.university ? { id: profile.university.id, label: profile.university.name } : null);
    setEditing(true);
  }

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
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
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
        target_major: targetMajor,
        avatar: avatarFile ?? undefined,
      });
      onProfileUpdated(updated);
      setShowcase(updated.showcase_achievements ?? []);
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

  const usernameDaysLeft = daysUntil(profile.username_change_available_at);
  const usernameLocked = usernameDaysLeft > 0;
  const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const xpPercent = profile.xp_for_next_level > 0 ? (profile.xp_into_level / profile.xp_for_next_level) * 100 : 100;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-end">
        {!editing ? (
          <button
            type="button"
            onClick={startEdit}
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
              form="hero-form"
              disabled={saving}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "..." : "Պահպանել"}
            </button>
          </div>
        )}
      </div>

      <form id="hero-form" onSubmit={handleSave}>
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleAvatarClick}
              className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-3xl font-semibold text-text-muted ${editing ? "cursor-pointer" : "cursor-default"}`}
            >
              {avatarPreview || profile.avatar ? (
                <img src={avatarPreview ?? profile.avatar ?? undefined} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                (profile.first_name || profile.username).slice(0, 1).toUpperCase()
              )}
            </button>
            {editing && (
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-primary-contrast">
                ✎
              </span>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            {!editing ? (
              <>
                <h1 className="text-2xl font-bold text-text">{fullName || profile.username}</h1>
                <p className="text-text-muted">@{profile.username}</p>
                {profile.role === "teacher" && <p className="mt-1 text-sm text-text-muted">🧑‍🏫 Ուսուցիչ</p>}
                {profile.role === "student" && (profile.grade || profile.age) && (
                  <p className="mt-1 text-sm text-text-muted">
                    {[
                      profile.grade ? `${profile.grade}-րդ դասարան` : null,
                      profile.school ? profile.school.name : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Օգտանուն</label>
                  <input
                    className={`${inputClass} ${usernameLocked ? "cursor-not-allowed opacity-60" : ""}`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={usernameLocked}
                    required
                  />
                  {usernameLocked && (
                    <p className="mt-1 text-xs text-text-muted">Օգտանունը կրկին կարող եք փոխել {usernameDaysLeft} օրից։</p>
                  )}
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
                  <input type="number" min={1} max={120} className={inputClass} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                {profile.role === "student" && (
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
                )}
              </div>
            )}
          </div>
        </div>

        {profile.role === "student" && (
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold text-text">Մակարդակ {profile.level}</span>
              <span className="text-text-muted">
                {profile.xp_for_next_level > 0
                  ? `${profile.xp_for_next_level - profile.xp_into_level} XP մինչև ${profile.level + 1}-րդ մակարդակ`
                  : `${profile.total_xp} XP`}
              </span>
            </div>
            <div className="mt-1.5">
              <ProgressBar percent={xpPercent} label="Մակարդակի առաջընթաց" />
            </div>
          </div>
        )}

        {profile.role === "student" && profile.streak && profile.streak.current_streak > 0 && (
          <p className="mt-3 text-sm text-text-muted">
            🔥 {profile.streak.current_streak} օրյա շարք · Լավագույնը՝ {profile.streak.longest_streak} օր
          </p>
        )}

        <div className="mt-5 border-t border-border pt-5">
          {!editing ? (
            <p className="whitespace-pre-wrap text-text">{profile.bio || "Բիո դեռ ավելացված չէ։"}</p>
          ) : (
            <>
              <label className={labelClass}>Բիո</label>
              <textarea className={`${inputClass} min-h-24 resize-y`} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
            </>
          )}
        </div>

        {profile.role === "student" && (
          <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
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
                <SearchSelect placeholder="Փնտրեք բուհ..." value={university} onChange={setUniversity} search={universitySearch} />
              )}
            </div>
            <div>
              <p className={labelClass}>Մասնագիտություն</p>
              {!editing ? (
                <p className="text-text">{profile.target_major || "Չնշված"}</p>
              ) : (
                <input
                  className={inputClass}
                  placeholder="օր.՝ Ինֆորմատիկա"
                  value={targetMajor}
                  onChange={(e) => setTargetMajor(e.target.value)}
                  maxLength={200}
                />
              )}
            </div>
          </div>
        )}
      </form>

      {profile.role === "student" && (
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-text-muted">Ցուցադրվող նվաճումներ</p>
            <button type="button" onClick={() => setShowcaseOpen(true)} className="text-xs text-primary hover:underline">
              Փոփոխել
            </button>
          </div>
          {showcase.length === 0 ? (
            <p className="text-sm text-text-muted">Դեռ նվաճումներ չկան։</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {showcase.map((ua) => (
                <div key={ua.id} title={ua.achievement.description} className="flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1.5">
                  <span className="text-lg">{ua.achievement.icon || "🏆"}</span>
                  <span className="text-sm text-text">{ua.achievement.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}

      {showcaseOpen && achievements && myAchievements && (
        <ShowcasePickerModal
          achievements={achievements}
          myAchievements={myAchievements}
          currentIds={showcase.map((ua) => ua.achievement.id)}
          onClose={() => setShowcaseOpen(false)}
          onSaved={setShowcase}
        />
      )}
    </div>
  );
}
