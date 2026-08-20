import { useEffect, useState } from "react";
import {
  createTask, listCategories, listProjects, updateTask,
  type Category, type Project, type RecurrenceFrequency, type Task, type TaskInput, type TaskPriority,
} from "../../api/todo";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { PRIORITY_OPTIONS } from "./PriorityBadge";
import { FilterChips } from "../ui/FilterChips";
import { SubtaskChecklist, type SubtaskItem } from "./SubtaskChecklist";

const REMINDER_OPTIONS = [
  { value: "", label: "Առանց հիշեցման" },
  { value: "5", label: "5 րոպե առաջ" },
  { value: "15", label: "15 րոպե առաջ" },
  { value: "60", label: "1 ժամ առաջ" },
  { value: "1440", label: "1 օր առաջ" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: "none", label: "Չի կրկնվում" },
  { value: "daily", label: "Ամեն օր" },
  { value: "weekdays", label: "Ամեն աշխատանքային օր" },
  { value: "weekly", label: "Ամեն շաբաթ" },
  { value: "monthly", label: "Ամեն ամիս" },
];

const inputClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-primary";

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultTitle?: string;
  defaultDate?: string | null;
  defaultTime?: string | null;
  defaultProjectId?: number | null;
  onSaved: (task: Task) => void;
}

export function TaskModal({
  open, onOpenChange, task, defaultTitle, defaultDate, defaultTime, defaultProjectId, onSaved,
}: TaskModalProps) {
  const { showError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [reminderOffset, setReminderOffset] = useState("");
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);

  useEffect(() => {
    if (!open) return;
    listCategories().then(setCategories).catch((err) => showError(extractErrorMessage(err)));
    listProjects().then(setProjects).catch((err) => showError(extractErrorMessage(err)));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? defaultTitle ?? "");
    setDescription(task?.description ?? "");
    setNotes(task?.notes ?? "");
    setDueDate(task?.due_date ?? defaultDate ?? "");
    setDueTime(task?.due_time?.slice(0, 5) ?? defaultTime ?? "");
    setPriority(task?.priority ?? "medium");
    setCategoryId(task?.category ?? null);
    setProjectId(task?.project ?? defaultProjectId ?? null);
    setTagsText(task?.tags_detail?.join(", ") ?? "");
    setEstimatedDuration(task?.estimated_duration_minutes?.toString() ?? "");
    setReminderOffset(task?.reminder_offset_minutes?.toString() ?? "");
    setRecurrenceFreq(task?.recurrence_freq ?? "none");
    setRecurrenceInterval(task?.recurrence_interval?.toString() ?? "1");
    setRecurrenceEndDate(task?.recurrence_end_date ?? "");
    setSubtasks(
      task?.subtasks.map((s) => ({ id: s.id, title: s.title, is_completed: s.is_completed })) ?? [],
    );
  }, [open, task, defaultTitle, defaultDate, defaultTime, defaultProjectId]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    try {
      const payload: TaskInput = {
        title: trimmedTitle,
        description,
        notes,
        project: projectId,
        category: categoryId,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        priority,
        due_date: dueDate || null,
        due_time: dueTime || null,
        estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        reminder_offset_minutes: reminderOffset ? parseInt(reminderOffset, 10) : null,
        recurrence_freq: recurrenceFreq,
        recurrence_interval: recurrenceInterval ? Math.max(1, parseInt(recurrenceInterval, 10)) : 1,
        recurrence_end_date: recurrenceFreq !== "none" ? recurrenceEndDate || null : null,
      };

      const saved = task
        ? await updateTask(task.id, payload)
        : await createTask({ ...payload, subtasks_input: subtasks.map((s) => s.title) });

      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Խմբագրել առաջադրանքը" : "Նոր առաջադրանք"}
      className="max-h-[85vh] max-w-xl overflow-y-auto"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
            Չեղարկել
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!title.trim()} className="flex-1">
            Պահպանել
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Առաջադրանքի վերնագիր"
          autoFocus
          className={inputClass}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Նկարագրություն"
          rows={2}
          className={`${inputClass} resize-none`}
        />

        <div>
          <p id="task-priority-label" className="mb-1.5 text-sm font-medium text-text">Առաջնահերթություն</p>
          {/* Was four bare buttons whose only selected signal was colour. */}
          <FilterChips
            label="Առաջնահերթություն"
            value={priority}
            onChange={setPriority}
            options={PRIORITY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Ամսաթիվ</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Ժամ</label>
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Կատեգորիա</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className={inputClass}
            >
              <option value="">— Ոչ մի —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.name}` : c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Նախագիծ</label>
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className={inputClass}
            >
              <option value="">— Ոչ մի —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text">Թեգեր (անջատված ստորակետով)</label>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="school, exam"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Տևողություն (րոպե)</label>
            <input
              type="number"
              min={0}
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Հիշեցում</label>
            <select value={reminderOffset} onChange={(e) => setReminderOffset(e.target.value)} className={inputClass}>
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text">Կրկնություն</label>
          <select
            value={recurrenceFreq}
            onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency)}
            className={inputClass}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {recurrenceFreq !== "none" && (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-text-muted">Ամեն N անգամ</label>
                <input
                  type="number"
                  min={1}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-muted">Ավարտի ամսաթիվ (ոչ պարտադիր)</label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        <SubtaskChecklist taskId={task?.id ?? null} items={subtasks} onChange={setSubtasks} />

        <div>
          <label className="mb-1 block text-sm font-medium text-text">Նշումներ</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
    </Modal>
  );
}
