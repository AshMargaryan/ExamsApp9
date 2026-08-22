import { Check, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../../api/todo";
import { formatDueLabel, formatDuration } from "../../lib/todoFormat";
import { Dropdown } from "../ui/Dropdown";
import { PriorityBadge } from "./PriorityBadge";

interface TaskListRowProps {
  task: Task;
  selected: boolean;
  onToggleSelect: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
}

export function TaskListRow({
  task, selected, onToggleSelect, onToggleComplete, onEdit, onDelete, onDuplicate,
}: TaskListRowProps) {
  const dueLabel = formatDueLabel(task.due_date, task.due_time);
  const durationLabel = formatDuration(task.estimated_duration_minutes);

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-muted/40">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(task)}
        className="h-4 w-4 shrink-0 accent-primary"
        aria-label="Ընտրել"
      />

      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        aria-label={task.is_completed ? "Նշել որպես չկատարված" : "Նշել որպես կատարված"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.is_completed ? "border-primary bg-primary text-primary-contrast" : "border-border hover:border-primary"
        }`}
      >
        {task.is_completed && <Check size={13} strokeWidth={3} />}
      </button>

      <button type="button" onClick={() => onEdit(task)} className="min-w-0 flex-1 truncate text-left">
        <span className={`text-sm font-medium ${task.is_completed ? "text-text-muted line-through" : "text-text"}`}>
          {task.title}
        </span>
      </button>

      <PriorityBadge priority={task.priority} className="hidden sm:inline-flex" />

      {dueLabel && (
        <span className={`hidden shrink-0 text-xs sm:inline ${task.is_overdue ? "font-medium text-incorrect" : "text-text-muted"}`}>
          {dueLabel}
        </span>
      )}

      {task.project_detail && (
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.project_detail.color }} />
          {task.project_detail.name}
        </span>
      )}

      {durationLabel && <span className="hidden shrink-0 text-xs text-text-muted lg:inline">{durationLabel}</span>}

      <Dropdown
        align="end"
        renderTrigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label="Գործողություններ"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <MoreHorizontal size={18} />
          </button>
        )}
        items={[
          { key: "edit", label: "Խմբագրել", icon: <Pencil size={15} />, onSelect: () => onEdit(task) },
          { key: "duplicate", label: "Կրկնօրինակել", icon: <Copy size={15} />, onSelect: () => onDuplicate(task) },
          { key: "delete", divider: true, label: "Ջնջել", icon: <Trash2 size={15} />, tone: "danger", onSelect: () => onDelete(task) },
        ]}
      />
    </div>
  );
}
