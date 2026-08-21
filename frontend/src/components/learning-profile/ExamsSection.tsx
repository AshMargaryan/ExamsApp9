import { useState } from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { ExamImportance, StudentExam } from "../../api/profile";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { SUBJECTS } from "../../lib/subjects";
import {
  EXAM_URGENCY_COLOR,
  EXAM_URGENCY_TEXT,
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  examUrgency,
} from "../../lib/mastery";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DatePicker, formatArmenianDate, toISODate } from "../ui/DatePicker";
import { EmptyState } from "../ui/EmptyState";
import { NumberInput } from "../ui/NumberInput";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { daysUntil, nextUpcomingExam, useLearningProfileData } from "./LearningProfileData";

/*
  Exams, led by the countdown.

  A student preparing for an entrance exam has exactly one number in their head
  at all times: how many days are left. The old list buried it as the last line
  of a card; here the nearest exam gets a dedicated block at full size and the
  rest stay a timeline beneath it.

  Urgency comes from lib/mastery's examUrgency() so the block, the dots and the
  badges can never disagree — and only the ≤10-day band is red, so red keeps
  meaning something.
*/

const IMPORTANCE_LABEL: Record<ExamImportance, string> = PRIORITY_LABEL;
const IMPORTANCE_CLASS: Record<ExamImportance, string> = PRIORITY_CLASS;

function ExamForm({ onCreated, onCancel }: { onCreated: (e: StudentExam) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [importance, setImportance] = useState<ExamImportance>("medium");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !examDate) {
      setError("Անվանումը և ամսաթիվը պարտադիր են։");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      onCreated(
        await profileApi.createExam({
          name: name.trim(),
          subject_key: subjectKey || undefined,
          exam_date: examDate,
          target_score: targetScore ?? undefined,
          importance,
        }),
      );
    } catch {
      setError("Չհաջողվեց ստեղծել քննությունը։");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="exam-name" className="mb-1 block text-xs text-text-muted">
            Անվանում
          </label>
          <input
            id="exam-name"
            className={inputClass}
            value={name}
            maxLength={200}
            placeholder="օր.՝ Բակալավրիատ, մաթեմատիկա"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="exam-date" className="mb-1 block text-xs text-text-muted">
            Ամսաթիվ
          </label>
          {/* Past dates are excluded: this form only ever creates an *upcoming*
              exam, and a countdown that starts negative is not a countdown. */}
          <DatePicker
            id="exam-date"
            value={examDate}
            onChange={setExamDate}
            min={toISODate(new Date())}
            placeholder="Ընտրիր ամսաթիվը"
          />
        </div>
        <div>
          <label htmlFor="exam-subject" className="mb-1 block text-xs text-text-muted">
            Առարկա (ըստ ցանկության)
          </label>
          <Select
            id="exam-subject"
            value={subjectKey}
            onChange={setSubjectKey}
            placeholder="Առանց առարկայի"
            options={SUBJECTS.map((s) => ({
              value: s.key as string,
              label: s.label,
              icon: <s.Icon size={15} strokeWidth={1.75} aria-hidden />,
            }))}
          />
        </div>
        <div>
          <label htmlFor="exam-score" className="mb-1 block text-xs text-text-muted">
            Նպատակային միավոր (ըստ ցանկության)
          </label>
          <NumberInput
            id="exam-score"
            label="Նպատակային միավոր"
            value={targetScore}
            onChange={setTargetScore}
            min={0}
            max={100}
            placeholder="—"
          />
        </div>
        <div>
          <label htmlFor="exam-importance" className="mb-1 block text-xs text-text-muted">
            Կարևորություն
          </label>
          <Select<ExamImportance>
            id="exam-importance"
            value={importance}
            onChange={setImportance}
            options={(Object.keys(IMPORTANCE_LABEL) as ExamImportance[]).map((p) => ({
              value: p,
              label: IMPORTANCE_LABEL[p],
            }))}
          />
        </div>
      </div>

      {error && <p className="mt-2.5 text-xs text-incorrect">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Չեղարկել
        </Button>
        <Button size="sm" loading={saving} onClick={submit}>
          Ավելացնել
        </Button>
      </div>
    </div>
  );
}

function ExamRow({ exam, onDeleted }: { exam: StudentExam; onDeleted: (id: number) => void }) {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const remaining = daysUntil(exam.exam_date);
  const urgency = exam.status === "upcoming" ? examUrgency(remaining) : "past";
  const subject = SUBJECTS.find((s) => s.key === exam.subject_key);

  async function remove() {
    setBusy(true);
    try {
      await profileApi.deleteExam(exam.id);
      onDeleted(exam.id);
      setConfirmOpen(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="relative pb-4 last:pb-0">
      <span
        className="absolute top-4 -left-[26px] h-2.5 w-2.5 rounded-full border-2 border-bg"
        style={{ background: EXAM_URGENCY_COLOR[urgency] }}
        aria-hidden="true"
      />
      <div className="rounded-[var(--radius)] border border-border bg-bg p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{exam.name}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              {subject ? `${subject.label} · ` : ""}
              {formatArmenianDate(exam.exam_date)}
              {exam.target_score != null && ` · Նպատակ՝ ${exam.target_score}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                urgency === "critical"
                  ? "border-incorrect/40 bg-incorrect-bg text-incorrect"
                  : IMPORTANCE_CLASS[exam.importance]
              }`}
            >
              {urgency === "critical" ? "Շտապ" : IMPORTANCE_LABEL[exam.importance]}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmOpen(true)}
              aria-label={`Ջնջել քննությունը՝ ${exam.name}`}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-incorrect focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {exam.status === "upcoming" && (
          <p className={`mt-2 text-xs font-medium ${EXAM_URGENCY_TEXT[urgency]}`}>
            {remaining >= 0 ? `${remaining} օր մնացել է` : "Ամսաթիվն անցել է"}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Ջնջե՞լ այս քննությունը"
        description={`«${exam.name}» — հետհաշվարկը կվերանա քո պրոֆիլից։`}
        busy={busy}
        onConfirm={remove}
      />
    </li>
  );
}

export function ExamsSection() {
  const { status, exams, addExam, removeExam } = useLearningProfileData();
  const [formOpen, setFormOpen] = useState(false);

  const next = nextUpcomingExam(exams);
  const rest = next ? exams.filter((e) => e.id !== next.exam.id) : exams;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <ClipboardCheck size={16} strokeWidth={1.75} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text">Իմ քննությունները</h2>
        </div>
        {!formOpen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFormOpen(true)}
            iconLeft={<Plus size={14} strokeWidth={2} />}
          >
            Ավելացնել
          </Button>
        )}
      </div>
      <p className="mb-4 text-xs text-text-muted">
        Քննության ամսաթիվը որոշում է, թե որքան ինտենսիվ պետք է լինի քո ուսումնական տեմպը։
      </p>

      {formOpen && (
        <div className="mb-4">
          <ExamForm
            onCancel={() => setFormOpen(false)}
            onCreated={(exam) => {
              addExam(exam);
              setFormOpen(false);
            }}
          />
        </div>
      )}

      {status === "loading" ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-16" />
        </div>
      ) : exams.length === 0 && !formOpen ? (
        <EmptyState
          icon={<ClipboardCheck size={24} strokeWidth={1.75} />}
          title="Դեռ քննություններ չկան"
          hint="Ավելացրու առաջիկա քննությունդ, և Gitus-ը կսկսի հաշվել օրերը՝ ու կհարմարեցնի ամենօրյա ծանրաբեռնվածությունը։"
          cta={{ label: "Ավելացնել քննություն", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <>
          {next && (
            <div
              className="rounded-[var(--radius)] border p-5"
              style={{
                borderColor: `color-mix(in srgb, ${EXAM_URGENCY_COLOR[examUrgency(next.daysLeft)]} 40%, transparent)`,
                background: `color-mix(in srgb, ${EXAM_URGENCY_COLOR[examUrgency(next.daysLeft)]} 7%, var(--color-bg))`,
              }}
            >
              <p className="text-[11px] font-semibold tracking-[0.12em] text-text-muted">ՀԱՋՈՐԴ ՔՆՆՈՒԹՅՈՒՆԸ</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text">{next.exam.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
{formatArmenianDate(next.exam.exam_date)}
                    {next.exam.target_score != null && ` · Նպատակ՝ ${next.exam.target_score}`}
                  </p>
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span
                    className="text-[42px] leading-none font-semibold tabular-nums"
                    style={{ color: EXAM_URGENCY_COLOR[examUrgency(next.daysLeft)] }}
                  >
                    {next.daysLeft}
                  </span>
                  <span className="text-sm text-text-muted">օր մնացել է</span>
                </p>
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <ul className="mt-4 flex flex-col border-l-2 border-border pl-6">
              {rest.map((exam) => (
                <ExamRow key={exam.id} exam={exam} onDeleted={removeExam} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
