import { Check, Copy, ListChecks, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../../api/todo";
import { formatDueLabel, formatDuration } from "../../lib/todoFormat";
import { Dropdown } from "../ui/Dropdown";
import { IconButton } from "../ui/IconButton";
import { PriorityBadge } from "./PriorityBadge";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onEdit, onDelete, onDuplicate }: TaskCardProps) {
  const dueLabel = formatDueLabel(task.due_date, task.due_time);
  const durationLabel = formatDuration(task.estimated_duration_minutes);

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-label={task.is_completed ? "Նշել որպես չկատարված" : "Նշել որպես կատարված"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.is_completed ? "border-primary bg-primary text-primary-contrast" : "border-border hover:border-primary"
        }`}
      >
        {task.is_completed && <Check size={13} strokeWidth={3} />}
      </button>

      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left">
        <p className={`truncate text-sm font-medium ${task.is_completed ? "text-text-muted line-through" : "text-text"}`}>
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          {dueLabel && (
            <span className={`text-xs ${task.is_overdue ? "font-medium text-incorrect" : "text-text-muted"}`}>
              {dueLabel}
            </span>
          )}
          {durationLabel && <span className="text-xs text-text-muted">· {durationLabel}</span>}
          {task.project_detail && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.project_detail.color }} />
              {task.project_detail.name}
            </span>
          )}
          {task.category_detail && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
              {task.category_detail.name}
            </span>
          )}
          {task.subtask_progress.total > 0 && (
            <span
              className="inline-flex items-center gap-1 text-xs tabular-nums text-text-muted"
              aria-label={`Ենթաառաջադրանքներ՝ ${task.subtask_progress.completed} ${task.subtask_progress.total}-ից`}
            >
              <ListChecks size={12} strokeWidth={2} aria-hidden />
              {task.subtask_progress.completed}/{task.subtask_progress.total}
            </span>
          )}
          {task.tags_detail.map((tag) => (
            <span key={tag} className="text-xs text-primary">#{tag}</span>
          ))}
        </div>
      </button>

      <Dropdown
        align="end"
        renderTrigger={(props) => (
          <IconButton
            {...props}
            variant="ghost"
            size="sm"
            aria-label={`«${task.title}» առաջադրանքի գործողություններ`}
            icon={<MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />}
          />
        )}
        items={[
          { key: "edit", label: "Խմբագրել", icon: <Pencil size={15} strokeWidth={1.75} aria-hidden />, onSelect: () => onEdit(task) },
          { key: "duplicate", label: "Կրկնօրինակել", icon: <Copy size={15} strokeWidth={1.75} aria-hidden />, onSelect: () => onDuplicate(task) },
          // Separated: deleting sat flush against duplicating, one row apart.
          { key: "delete", divider: true, label: "Ջնջել", icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />, tone: "danger", onSelect: () => onDelete(task) },
        ]}
      />
    </div>
  );
}
