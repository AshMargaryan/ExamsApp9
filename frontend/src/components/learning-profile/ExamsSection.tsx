import { useEffect, useState } from "react";
import { ClipboardCheck, Trash2 } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { ExamImportance, StudentExam } from "../../api/profile";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { SUBJECTS } from "../../lib/subjects";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

const IMPORTANCE_LABELS: Record<ExamImportance, string> = {
  low: "Ցածր",
  medium: "Միջին",
  high: "Բարձր",
};

const IMPORTANCE_CLASSES: Record<ExamImportance, string> = {
  low: "border-border bg-surface-muted text-text-muted",
  medium: "border-primary/40 bg-primary/10 text-primary",
  high: "border-incorrect/40 bg-incorrect/10 text-incorrect",
};

function ExamForm({ onCreated, onCancel }: { onCreated: (e: StudentExam) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [importance, setImportance] = useState<ExamImportance>("medium");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !examDate) {
      setError("Անվանումը և ամսաթիվը պարտադիր են։");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const exam = await profileApi.createExam({
        name: name.trim(),
        subject_key: subjectKey || undefined,
        exam_date: examDate,
        target_score: targetScore ? Number(targetScore) : undefined,
        importance,
      });
      onCreated(exam);
    } catch {
      setError("Չհաջողվեց ստեղծել քննությունը։");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-text-muted">Անվանում</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="օր.՝ Բակալավրիատ, մաթեմատիկա" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Առարկա (ըստ ցանկության)</label>
          <select className={inputClass} value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)}>
            <option value="">—</option>
            {SUBJECTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Ամսաթիվ</label>
          <input type="date" className={inputClass} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Նպատակային միավոր (ըստ ցանկության)</label>
          <input type="number" min={0} className={inputClass} value={targetScore} onChange={(e) => setTargetScore(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-muted">Կարևորություն</label>
          <select className={inputClass} value={importance} onChange={(e) => setImportance(e.target.value as ExamImportance)}>
            {(Object.keys(IMPORTANCE_LABELS) as ExamImportance[]).map((p) => (
              <option key={p} value={p}>{IMPORTANCE_LABELS[p]}</option>
            ))}
          </select>
        </div>
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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function ExamsSection() {
  const { showError } = useToast();
  const [exams, setExams] = useState<StudentExam[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    profileApi.fetchExams().then(setExams).catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCreated(exam: StudentExam) {
    setExams((prev) => [...(prev ?? []), exam].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
    setFormOpen(false);
  }

  async function handleDelete(id: number) {
    try {
      await profileApi.deleteExam(id);
      setExams((prev) => (prev ?? []).filter((e) => e.id !== id));
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <ClipboardCheck size={16} strokeWidth={1.75} /> Իմ քննությունները
        </p>
        {!formOpen && (
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            + Ավելացնել
          </Button>
        )}
      </div>

      {formOpen && <ExamForm onCreated={handleCreated} onCancel={() => setFormOpen(false)} />}

      {exams === null && <p className="mt-3 text-sm text-text-muted">Բեռնվում է...</p>}

      {exams !== null && exams.length === 0 && !formOpen && (
        <EmptyState icon={<ClipboardCheck size={26} strokeWidth={1.75} />} title="Դեռ քննություններ չկան" hint="Ավելացրեք ձեր առաջիկա քննությունը՝ հետևելու համար։" />
      )}

      {exams !== null && exams.length > 0 && (
        <div className="mt-3 flex flex-col border-l-2 border-border pl-6">
          {exams.map((exam) => {
            const subject = SUBJECTS.find((s) => s.key === exam.subject_key);
            const remaining = daysUntil(exam.exam_date);
            const urgent = exam.status === "upcoming" && remaining >= 0 && remaining <= 10;
            const near = exam.status === "upcoming" && remaining >= 0 && remaining <= 30;
            const dotColor = urgent
              ? "var(--color-incorrect)"
              : near
                ? "var(--color-primary)"
                : "var(--color-text-muted)";
            return (
              <div key={exam.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute top-1.5 -left-[27px] h-3 w-3 rounded-full border-2 border-bg"
                  style={{ background: dotColor }}
                  aria-hidden="true"
                />
                <div className="rounded-[var(--radius)] border border-border bg-bg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{exam.name}</p>
                      <p className="text-xs text-text-muted">
                        {subject ? `${subject.label} · ` : ""}
                        {new Date(exam.exam_date).toLocaleDateString("hy-AM")}
                        {exam.target_score != null && ` · Նպատակ՝ ${exam.target_score}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          urgent ? "border-incorrect/40 bg-incorrect/10 text-incorrect" : IMPORTANCE_CLASSES[exam.importance]
                        }`}
                      >
                        {urgent ? "Բարձր առաջնահերթություն" : IMPORTANCE_LABELS[exam.importance]}
                      </span>
                      <button type="button" onClick={() => handleDelete(exam.id)} aria-label="Ջնջել" className="text-text-muted hover:text-incorrect">
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                  {exam.status === "upcoming" && (
                    <p className="mt-2 text-xs text-text-muted">
                      {remaining >= 0 ? `${remaining} օր մնացել է` : "Ամսաթիվն անցել է"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
