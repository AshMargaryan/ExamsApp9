import { useEffect, useState } from "react";
import * as profileApi from "../../api/profile";
import type { GoalType, PersonalGoal } from "../../api/profile";
import { getHierarchy } from "../../api/practice";
import type { SubjectNode } from "../../api/practice";
import { EmptyState } from "../ui/EmptyState";
import { ProgressBar } from "../ui/ProgressBar";

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  subject_accuracy: "Ճշգրտություն առարկայում",
  tests_this_week: "Թեստեր այս շաբաթ",
  streak_days: "Ուսումնական շարք",
  study_hours_month: "Ուսումնական ժամեր այս ամիս",
  xp_this_month: "XP այս ամիս",
  custom: "Անհատական նպատակ",
};

const GOAL_TYPE_UNIT_HINT: Partial<Record<GoalType, string>> = {
  subject_accuracy: "%",
  tests_this_week: "թեստ",
  streak_days: "օր",
  study_hours_month: "ժամ",
  xp_this_month: "XP",
};

function GoalForm({
  subjects,
  onCreated,
  onCancel,
}: {
  subjects: SubjectNode[] | null;
  onCreated: (g: PersonalGoal) => void;
  onCancel: () => void;
}) {
  const [goalType, setGoalType] = useState<GoalType>("streak_days");
  const [targetValue, setTargetValue] = useState("14");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [customTitle, setCustomTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      const goal = await profileApi.createGoal({
        goal_type: goalType,
        target_value: goalType === "custom" ? undefined : Number(targetValue) || 0,
        subject: goalType === "subject_accuracy" && subjectId ? Number(subjectId) : undefined,
        custom_title: goalType === "custom" ? customTitle : undefined,
      });
      onCreated(goal);
    } catch {
      setError("Չհաջողվեց ստեղծել նպատակը։ Ստուգեք լրացված դաշտերը։");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text-muted">Տեսակ</label>
          <select className={inputClass} value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}>
            {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map((t) => (
              <option key={t} value={t}>
                {GOAL_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {goalType === "custom" ? (
          <div>
            <label className="mb-1 block text-xs text-text-muted">Վերնագիր</label>
            <input className={inputClass} value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} maxLength={200} />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs text-text-muted">Նպատակ ({GOAL_TYPE_UNIT_HINT[goalType]})</label>
            <input type="number" min={1} className={inputClass} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </div>
        )}

        {goalType === "subject_accuracy" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-text-muted">Առարկա</label>
            <select className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Ընտրեք առարկա</option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-incorrect">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-muted">
          Չեղարկել
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "..." : "Ստեղծել"}
        </button>
      </div>
    </div>
  );
}

export function GoalsCard() {
  const [goals, setGoals] = useState<PersonalGoal[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    profileApi.fetchGoals().then(setGoals);
    getHierarchy().then(setSubjects);
  }, []);

  function handleCreated(goal: PersonalGoal) {
    setGoals((prev) => [goal, ...(prev ?? [])]);
    setFormOpen(false);
  }

  async function handleDelete(id: number) {
    await profileApi.deleteGoal(id);
    setGoals((prev) => (prev ?? []).filter((g) => g.id !== id));
  }

  async function handleToggleCustom(goal: PersonalGoal) {
    const updated = await profileApi.completeCustomGoal(goal.id, !goal.completed_at);
    setGoals((prev) => (prev ?? []).map((g) => (g.id === goal.id ? updated : g)));
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">🎯 Իմ նպատակները</p>
        {!formOpen && (
          <button type="button" onClick={() => setFormOpen(true)} className="text-sm text-primary hover:underline">
            + Ավելացնել
          </button>
        )}
      </div>

      {formOpen && <GoalForm subjects={subjects} onCreated={handleCreated} onCancel={() => setFormOpen(false)} />}

      {goals === null && <p className="mt-3 text-sm text-text-muted">Բեռնվում է...</p>}

      {goals !== null && goals.length === 0 && !formOpen && (
        <EmptyState icon="🎯" title="Դեռ նպատակներ չկան" hint="Սահմանեք ձեր առաջին ուսումնական նպատակը։" />
      )}

      {goals !== null && goals.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {goals.map((goal) => {
            const title = goal.goal_type === "custom" ? goal.custom_title : GOAL_TYPE_LABELS[goal.goal_type];
            const subtitle =
              goal.goal_type === "subject_accuracy" && goal.subject_name
                ? goal.subject_name
                : goal.goal_type !== "custom"
                  ? `${goal.progress.current ?? 0}${goal.progress.unit ?? ""} / ${goal.target_value}${goal.progress.unit ?? ""}`
                  : null;
            return (
              <div key={goal.id} className="rounded-[var(--radius)] border border-border bg-bg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${goal.progress.is_complete ? "text-correct" : "text-text"}`}>
                      {goal.progress.is_complete && "✓ "}
                      {title}
                    </p>
                    {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {goal.goal_type === "custom" && (
                      <button type="button" onClick={() => handleToggleCustom(goal)} className="text-xs text-primary hover:underline">
                        {goal.completed_at ? "Չեղարկել" : "Նշել կատարված"}
                      </button>
                    )}
                    <button type="button" onClick={() => handleDelete(goal.id)} aria-label="Ջնջել" className="text-xs text-text-muted hover:text-incorrect">
                      ✕
                    </button>
                  </div>
                </div>
                {goal.goal_type !== "custom" && (
                  <div className="mt-2">
                    <ProgressBar percent={goal.progress.percent} colorClassName={goal.progress.is_complete ? "bg-correct" : "bg-primary"} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
