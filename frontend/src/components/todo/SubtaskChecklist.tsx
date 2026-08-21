import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addSubtask, deleteSubtask, updateSubtask } from "../../api/todo";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { cn } from "../../lib/cn";
import { fieldInputClass } from "../ui/Field";

export interface SubtaskItem {
  id: number | null;
  title: string;
  is_completed: boolean;
}

interface SubtaskChecklistProps {
  /** null while the parent task hasn't been created yet — in that case every
   * action only mutates local state, and the final list is submitted as
   * `subtasks_input` on task creation instead of hitting the API directly. */
  taskId: number | null;
  items: SubtaskItem[];
  onChange: (items: SubtaskItem[]) => void;
}

export function SubtaskChecklist({ taskId, items, onChange }: SubtaskChecklistProps) {
  const { showError } = useToast();
  const [draft, setDraft] = useState("");

  const completed = items.filter((i) => i.is_completed).length;

  async function handleAdd() {
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    if (taskId) {
      try {
        const created = await addSubtask(taskId, title);
        onChange([...items, { id: created.id, title: created.title, is_completed: created.is_completed }]);
      } catch (err) {
        showError(extractErrorMessage(err));
      }
    } else {
      onChange([...items, { id: null, title, is_completed: false }]);
    }
  }

  async function handleToggle(index: number) {
    const item = items[index];
    const next = { ...item, is_completed: !item.is_completed };
    onChange(items.map((it, i) => (i === index ? next : it)));
    if (taskId && item.id) {
      try {
        await updateSubtask(taskId, item.id, { is_completed: next.is_completed });
      } catch (err) {
        onChange(items);
        showError(extractErrorMessage(err));
      }
    }
  }

  async function handleRemove(index: number) {
    const item = items[index];
    onChange(items.filter((_, i) => i !== index));
    if (taskId && item.id) {
      try {
        await deleteSubtask(taskId, item.id);
      } catch (err) {
        onChange(items);
        showError(extractErrorMessage(err));
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">Ենթախնդիրներ</span>
        {items.length > 0 && (
          <span className="text-xs text-text-muted">{completed} / {items.length} կատարված</span>
        )}
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li key={item.id ?? `draft-${index}`} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => handleToggle(index)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className={`flex-1 text-sm ${item.is_completed ? "text-text-muted line-through" : "text-text"}`}>
                {item.title}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="Ջնջել ենթախնդիրը"
                className="text-text-muted hover:text-incorrect"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Ավելացնել ենթախնդիր"
          className={cn(fieldInputClass, "w-auto flex-1 text-[length:var(--text-sm)]")}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim()}
          aria-label="Ավելացնել ենթախնդիր"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-text-muted hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
