import { useRef, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Award, Camera, Flame, GraduationCap } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { Achievement, Profile, UserAchievement } from "../../api/profile";
import { searchSchools, searchUniversities } from "../../api/schools";
import { SearchSelect } from "../SearchSelect";
import { ProgressBar } from "../ui/ProgressBar";
import { RARITY_COLORS } from "../../lib/achievementRarity";
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
  const glassInputClass =
    "w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-white placeholder-white/50 outline-none backdrop-blur-md focus:border-white/60 focus:bg-white/15";
  const glassLabelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-white/60";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  const xpPercent = profile.xp_for_next_level > 0 ? (profile.xp_into_level / profile.xp_for_next_level) * 100 : 100;
  const isStudent = profile.role === "student";

  return (
    <div className="relative isolate w-full overflow-hidden">
      {/* Full-bleed gradient canvas — deliberately saturated in both themes so white
          text/glass panels always read cleanly regardless of light/dark mode. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 55%, var(--color-primary-hover) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-medium) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 -z-10 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
        <div className="flex items-center justify-end">
          {!editing ? (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              Խմբագրել
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Չեղարկել
              </button>
              <button
                type="submit"
                form="hero-form"
                disabled={saving}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/10 transition-transform hover:scale-105 disabled:opacity-60"
              >
                {saving ? "..." : "Պահպանել"}
              </button>
            </div>
          )}
        </div>

        <form id="hero-form" onSubmit={handleSave}>
          <div className="mt-4 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/15 text-4xl font-bold text-white shadow-[0_0_40px_rgba(255,255,255,0.25)] backdrop-blur-md sm:h-32 sm:w-32 ${editing ? "cursor-pointer" : "cursor-default"}`}
              >
                {avatarPreview || profile.avatar ? (
                  <img src={avatarPreview ?? profile.avatar ?? undefined} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </button>
              {editing && (
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-md">
                  <Camera size={15} strokeWidth={1.75} />
                </span>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="min-w-0 flex-1">
              {!editing ? (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                    <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{fullName || profile.username}</h1>
                    {isStudent && (
                      <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white backdrop-blur-md">
                        Մակարդակ {profile.level}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg text-white/70">@{profile.username}</p>
                  {profile.role === "teacher" && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-sm text-white/70 sm:justify-start">
                      <GraduationCap size={14} strokeWidth={1.75} /> Ուսուցիչ
                    </p>
                  )}
                  {isStudent && (profile.grade || profile.school) && (
                    <p className="mt-1 text-sm text-white/70">
                      {[profile.grade ? `${profile.grade}-րդ դասարան` : null, profile.school ? profile.school.name : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </>
              ) : (
                <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:grid-cols-2">
                  <div>
                    <label className={glassLabelClass}>Օգտանուն</label>
                    <input
                      className={`${glassInputClass} ${usernameLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={usernameLocked}
                      required
                    />
                    {usernameLocked && <p className="mt-1 text-xs text-white/60">Օգտանունը կրկին կարող եք փոխել {usernameDaysLeft} օրից։</p>}
                  </div>
                  <div>
                    <label className={glassLabelClass}>Անուն</label>
                    <input className={glassInputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className={glassLabelClass}>Ազգանուն</label>
                    <input className={glassInputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div>
                    <label className={glassLabelClass}>Տարիք</label>
                    <input type="number" min={1} max={120} className={glassInputClass} value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  {isStudent && (
                    <div>
                      <label className={glassLabelClass}>Դասարան</label>
                      <select className={glassInputClass} value={grade} onChange={(e) => setGrade(e.target.value)}>
                        <option className="text-black" value="">
                          Չընտրված
                        </option>
                        {GRADES.map((g) => (
                          <option className="text-black" key={g} value={g}>
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

          {isStudent && (
            <div className="mt-8 max-w-xl">
              <div className="flex items-baseline justify-between text-sm text-white/80">
                <span className="font-semibold text-white">{profile.total_xp} XP</span>
                <span>
                  {profile.xp_for_next_level > 0
                    ? `${profile.xp_for_next_level - profile.xp_into_level} XP մինչև ${profile.level + 1}-րդ մակարդակ`
                    : "Առավելագույն մակարդակ"}
                </span>
              </div>
              <div className="mt-2 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]">
                <ProgressBar percent={xpPercent} colorClassName="bg-white" trackClassName="bg-white/20" heightClassName="h-2.5" label="Մակարդակի առաջընթաց" />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            {isStudent && profile.streak && profile.streak.current_streak > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
                <Flame size={15} strokeWidth={1.75} /> {profile.streak.current_streak} օրյա շարք
                <span className="font-normal text-white/60">· լավագույնը {profile.streak.longest_streak}</span>
              </span>
            )}
          </div>

          <div className="mt-8 border-t border-white/15 pt-6">
            {!editing ? (
              <p className="max-w-2xl whitespace-pre-wrap text-lg italic text-white/90">
                {profile.bio ? `„${profile.bio}“` : "Բիո դեռ ավելացված չէ։"}
              </p>
            ) : (
              <>
                <label className={glassLabelClass}>Բիո</label>
                <textarea className={`${glassInputClass} min-h-24 resize-y`} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
              </>
            )}
          </div>

          {isStudent && (
            <div className="mt-6 grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className={glassLabelClass}>Դպրոց</p>
                {!editing ? (
                  <p className="mt-1 font-medium text-white">
                    {profile.school ? `${profile.school.name}${profile.school.marz ? ` (${profile.school.marz})` : ""}` : "Չնշված"}
                  </p>
                ) : (
                  <SearchSelect placeholder="Փնտրեք դպրոց..." value={school} onChange={setSchool} search={schoolSearch} />
                )}
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className={glassLabelClass}>Ցանկալի բուհ</p>
                {!editing ? (
                  <p className="mt-1 font-medium text-white">{profile.university ? profile.university.name : "Չնշված"}</p>
                ) : (
                  <SearchSelect placeholder="Փնտրեք բուհ..." value={university} onChange={setUniversity} search={universitySearch} />
                )}
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <p className={glassLabelClass}>Մասնագիտություն</p>
                {!editing ? (
                  <p className="mt-1 font-medium text-white">{profile.target_major || "Չնշված"}</p>
                ) : (
                  <input
                    className={glassInputClass}
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

        {isStudent && (
          <div className="mt-6 border-t border-white/15 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-white/60">Ցուցադրվող նվաճումներ</p>
              <button
                type="button"
                onClick={() => setShowcaseOpen(true)}
                className="rounded-full border border-white/25 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white"
              >
                Փոփոխել
              </button>
            </div>
            {showcase.length === 0 ? (
              <p className="text-sm text-white/60">Դեռ նվաճումներ չկան։</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {showcase.map((ua) => (
                  <div
                    key={ua.id}
                    title={ua.achievement.description}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-md"
                    style={{ boxShadow: `0 0 16px 0 ${RARITY_COLORS[ua.achievement.rarity]}55` }}
                  >
                    <span className="text-lg">{ua.achievement.icon || <Award size={18} strokeWidth={1.75} />}</span>
                    <span className="text-sm font-medium text-white">{ua.achievement.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm font-medium text-white">{error}</p>}
      </div>

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
