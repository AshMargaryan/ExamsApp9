import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Check, Flame, Plus, Sparkles, Target, Timer, Trash2, Trophy, Zap } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { CreateGoalPayload, GoalPriority, GoalType, PersonalGoal } from "../../api/profile";
import { getHierarchy } from "../../api/practice";
import type { SubjectNode } from "../../api/practice";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { PRIORITY_CLASS, PRIORITY_LABEL } from "../../lib/mastery";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DatePicker, formatArmenianDate, toISODate } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { NumberInput } from "../ui/NumberInput";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { useLearningProfileData } from "./LearningProfileData";

/*
  Goals as a personal objective system.

  The old create-form exposed the whole database row at once: a type dropdown
  whose choice silently changed which of the other four fields mattered. Here
  the type is picked first as six labelled cards, and only the fields that type
  actually uses appear afterwards — same payload, a fraction of the reading.

  Every number shown is the server's live `progress` object. Nothing here
  estimates or extrapolates: a goal with no data says so.
*/

const GOAL_TYPES: {
  value: GoalType;
  label: string;
  blurb: string;
  icon: ReactNode;
  unit: string;
  defaultTarget: number;
}[] = [
  {
    value: "subject_accuracy",
    label: "Բարձրացնել ճշգրտությունը",
    blurb: "Հասնել որոշակի ճշգրտության մեկ առարկայում",
    icon: <Target size={18} strokeWidth={1.75} />,
    unit: "%",
    defaultTarget: 90,
  },
  {
    value: "tests_this_week",
    label: "Անցնել թեստեր",
    blurb: "Ավարտել N ամբողջական թեստ այս շաբաթ",
    icon: <Trophy size={18} strokeWidth={1.75} />,
    unit: "թեստ",
    defaultTarget: 3,
  },
  {
    value: "streak_days",
    label: "Կառուցել ուսումնական շարք",
    blurb: "Սովորել անընդմեջ N օր",
    icon: <Flame size={18} strokeWidth={1.75} />,
    unit: "օր",
    defaultTarget: 14,
  },
  {
    value: "study_hours_month",
    label: "Սովորել ավելի շատ",
    blurb: "Հավաքել N ուսումնական ժամ այս ամիս",
    icon: <Timer size={18} strokeWidth={1.75} />,
    unit: "ժամ",
    defaultTarget: 20,
  },
  {
    value: "xp_this_month",
    label: "Վաստակել XP",
    blurb: "Հավաքել N միավոր այս ամիս",
    icon: <Zap size={18} strokeWidth={1.75} />,
    unit: "XP",
    defaultTarget: 2000,
  },
  {
    value: "custom",
    label: "Անհատական նպատակ",
    blurb: "Ինքդ ես ձևակերպում և նշում կատարվածը",
    icon: <Sparkles size={18} strokeWidth={1.75} />,
    unit: "",
    defaultTarget: 0,
  },
];

const GOAL_TYPE_BY_VALUE = new Map(GOAL_TYPES.map((t) => [t.value, t]));

function GoalWizard({
  subjects,
  onCreated,
  onCancel,
}: {
  subjects: SubjectNode[] | null;
  onCreated: (goal: PersonalGoal) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<GoalType | null>(null);
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [customTitle, setCustomTitle] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = type ? GOAL_TYPE_BY_VALUE.get(type)! : null;

  function pickType(value: GoalType) {
    setType(value);
    setError(null);
    setTargetValue(GOAL_TYPE_BY_VALUE.get(value)!.defaultTarget);
  }

  async function submit() {
    if (!type || !meta) return;
    if (type === "custom" && !customTitle.trim()) {
      setError("Գրիր, թե ինչի ես ուզում հասնել։");
      return;
    }
    if (type === "subject_accuracy" && !subjectId) {
      setError("Ընտրիր առարկան։");
      return;
    }
    if (type !== "custom" && (targetValue == null || targetValue <= 0)) {
      setError("Նշիր նպատակային թիվը։");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const payload: CreateGoalPayload = {
        goal_type: type,
        priority,
        deadline: deadline || null,
      };
      if (type === "custom") payload.custom_title = customTitle.trim();
      else payload.target_value = targetValue ?? 0;
      if (type === "subject_accuracy" && subjectId) payload.subject = Number(subjectId);

      onCreated(await profileApi.createGoal(payload));
    } catch {
      setError("Չհաջողվեց ստեղծել նպատակը։ Ստուգիր լրացված դաշտերը։");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4 sm:p-5">
      <p className="text-sm font-semibold text-text">Ի՞նչ ես ուզում հասնել։</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {GOAL_TYPES.map((t) => {
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => pickType(t.value)}
              aria-pressed={active}
              className={`rounded-[var(--radius)] border-2 p-3 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <span className={`flex ${active ? "text-primary" : "text-text-muted"}`}>{t.icon}</span>
              <span className="mt-2 block text-[13px] font-semibold text-text">{t.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">{t.blurb}</span>
            </button>
          );
        })}
      </div>

      {meta && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {type === "custom" ? (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-text-muted">Ինչի՞ ես ուզում հասնել</label>
                <input
                  className={inputClass}
                  value={customTitle}
                  maxLength={200}
                  placeholder="օր.՝ Ավարտել երկրաչափության ամբողջ բաժինը"
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="goal-target" className="mb-1 block text-xs text-text-muted">
                  Նպատակային թիվ ({meta.unit})
                </label>
                <NumberInput
                  id="goal-target"
                  label={`Նպատակային թիվ (${meta.unit})`}
                  value={targetValue}
                  onChange={setTargetValue}
                  min={1}
                  max={meta.value === "subject_accuracy" ? 100 : undefined}
                  suffix={meta.unit}
                />
              </div>
            )}

            {type === "subject_accuracy" && (
              <div>
                <label htmlFor="goal-subject" className="mb-1 block text-xs text-text-muted">
                  Առարկա
                </label>
                <Select
                  id="goal-subject"
                  value={subjectId === "" ? "" : String(subjectId)}
                  onChange={(v) => setSubjectId(v ? Number(v) : "")}
                  placeholder="Ընտրիր առարկա"
                  options={(subjects ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
                />
              </div>
            )}

            <div>
              <label htmlFor="goal-priority" className="mb-1 block text-xs text-text-muted">
                Առաջնահերթություն
              </label>
              <Select<GoalPriority>
                id="goal-priority"
                value={priority}
                onChange={setPriority}
                options={(Object.keys(PRIORITY_LABEL) as GoalPriority[]).map((p) => ({
                  value: p,
                  label: PRIORITY_LABEL[p],
                }))}
              />
            </div>

            <div>
              <label htmlFor="goal-deadline" className="mb-1 block text-xs text-text-muted">
                Վերջնաժամկետ (ըստ ցանկության)
              </label>
              <DatePicker
                id="goal-deadline"
                value={deadline}
                onChange={setDeadline}
                min={toISODate(new Date())}
                placeholder="Առանց ժամկետի"
              />
            </div>
          </div>

          {error && <p className="mt-2.5 text-xs text-incorrect">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onCancel}>
              Չեղարկել
            </Button>
            <Button size="sm" loading={saving} onClick={submit}>
              Ստեղծել նպատակը
            </Button>
          </div>
        </div>
      )}

      {!meta && (
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Չեղարկել
          </Button>
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal,
  onChanged,
  onDeleted,
}: {
  goal: PersonalGoal;
  onChanged: (goal: PersonalGoal) => void;
  onDeleted: (id: number) => void;
}) {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const meta = GOAL_TYPE_BY_VALUE.get(goal.goal_type)!;
  const isCustom = goal.goal_type === "custom";
  const title = isCustom ? goal.custom_title : meta.label;
  const complete = goal.progress.is_complete || Boolean(goal.completed_at);
  const unit = goal.progress.unit ?? meta.unit;
  const pct = Math.max(0, Math.min(100, goal.progress.percent));

  async function run(fn: () => Promise<PersonalGoal>) {
    setBusy(true);
    try {
      onChanged(await fn());
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await profileApi.deleteGoal(goal.id);
      onDeleted(goal.id);
      setConfirmOpen(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-[var(--radius)] border p-4 transition-colors ${
        complete ? "border-correct/35 bg-correct/[0.06]" : "border-border bg-bg"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            complete ? "bg-correct-bg text-correct" : "bg-surface-muted text-text-muted"
          }`}
          aria-hidden
        >
          {complete ? <Check size={16} strokeWidth={2.5} /> : meta.icon}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${complete ? "text-correct" : "text-text"}`}>{title}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {goal.goal_type === "subject_accuracy" && goal.subject_name ? `${goal.subject_name} · ` : ""}
            {isCustom
              ? complete
                ? "Նշված է որպես կատարված"
                : "Ինքդ ես նշում կատարվածը"
              : goal.progress.current != null
                ? `${goal.progress.current}${unit} → ${goal.target_value}${unit}`
                : `Նպատակ՝ ${goal.target_value}${unit} · տվյալներ դեռ չկան`}
            {goal.deadline && ` · մինչև ${formatArmenianDate(goal.deadline)}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <select
            value={goal.priority}
            disabled={busy}
            aria-label={`Առաջնահերթություն — ${title}`}
            onChange={(e) => run(() => profileApi.updateGoalPriority(goal.id, e.target.value as GoalPriority))}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${PRIORITY_CLASS[goal.priority]}`}
          >
            {(Object.keys(PRIORITY_LABEL) as GoalPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            aria-label={`Ջնջել նպատակը՝ ${title}`}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-incorrect focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {!isCustom && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-[width] duration-[var(--motion-emphasis)] ease-[var(--ease-out)]"
              style={{ width: `${pct}%`, background: complete ? "var(--color-correct)" : "var(--color-primary)" }}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-text-muted">
            {Math.round(pct)}%
          </span>
        </div>
      )}

      {isCustom && (
        <div className="mt-3">
          <Button
            variant={complete ? "ghost" : "secondary"}
            size="sm"
            disabled={busy}
            onClick={() => run(() => profileApi.completeCustomGoal(goal.id, !goal.completed_at))}
          >
            {goal.completed_at ? "Վերականգնել" : "Նշել կատարված"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ջնջե՞լ այս նպատակը"
        description={`«${title}» — առաջընթացդ չի ջնջվի, պարզապես այս նպատակն այլևս չի հետևվի։`}
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

export function GoalsSection() {
  const { showError } = useToast();
  const { status, goals, addGoal, replaceGoal, removeGoal } = useLearningProfileData();
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const loading = status === "loading";

  // Only needed by the subject-accuracy branch of the wizard, so it loads when
  // the wizard opens rather than on every page view.
  useEffect(() => {
    if (!wizardOpen || subjects !== null) return;
    getHierarchy()
      .then(setSubjects)
      .catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen]);

  const active = goals.filter((g) => !g.completed_at && !g.progress.is_complete);
  const done = goals.filter((g) => g.completed_at || g.progress.is_complete);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Target size={16} strokeWidth={1.75} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text">Քո նպատակները</h2>
        </div>
        {!wizardOpen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWizardOpen(true)}
            iconLeft={<Plus size={14} strokeWidth={2} />}
          >
            Ավելացնել
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-text-muted">
        Gitus-ը օգտագործում է դրանք՝ քո ուսումնական առաջնահերթությունները որոշելու համար։
      </p>

      {wizardOpen && (
        <div className="mb-4">
          <GoalWizard
            subjects={subjects}
            onCancel={() => setWizardOpen(false)}
            onCreated={(g) => {
              addGoal(g);
              setWizardOpen(false);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : goals.length === 0 && !wizardOpen ? (
        <EmptyState
          icon={<Target size={24} strokeWidth={1.75} />}
          title="Դեռ նպատակներ չկան"
          hint="Նպատակները Gitus-ին ասում են, թե ինչն է քեզ համար ամենակարևորը՝ և պլանը դասավորվում է դրանց շուրջ։"
          cta={{ label: "Ստեղծել առաջին նպատակը", onClick: () => setWizardOpen(true) }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {active.map((g) => (
            <GoalRow key={g.id} goal={g} onChanged={replaceGoal} onDeleted={removeGoal} />
          ))}
          {done.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-correct">
                <CalendarDays size={12} strokeWidth={2} /> ՀԱՍԱԾ ՆՊԱՏԱԿՆԵՐ
              </p>
              {done.map((g) => (
                <GoalRow key={g.id} goal={g} onChanged={replaceGoal} onDeleted={removeGoal} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
