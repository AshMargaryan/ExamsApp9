import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { Task } from "../../api/todo";
import { parseQuickAdd, type QuickAddParseResult } from "../../lib/quickAddParse";
import { Button } from "../ui/Button";
import { TaskModal } from "./TaskModal";

interface QuickAddBarProps {
  onCreated: (task: Task) => void;
  defaultProjectId?: number | null;
}

/** Large "+ Add task" bar with lightweight natural-language date/time
 * detection. The parsed guess is never saved directly — submitting opens
 * TaskModal pre-filled so the user reviews/edits every field first. */
export function QuickAddBar({ onCreated, defaultProjectId }: QuickAddBarProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<QuickAddParseResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setParsed(parseQuickAdd(text));
    setModalOpen(true);
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-2 shadow-[var(--shadow-sm)]"
      >
        <Plus size={20} className="ml-2 shrink-0 text-primary" aria-hidden="true" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ավելացնել առաջադրանք... օր. «Մաթեմ. տնային աշխատանք վաղը ժամը 18-ին»"
          className="flex-1 bg-transparent py-2 text-sm text-text outline-none placeholder:text-text-muted"
        />
        <Button type="submit" size="sm" disabled={!text.trim()}>
          Ավելացնել
        </Button>
      </form>

      <TaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        task={null}
        defaultTitle={parsed?.title}
        defaultDate={parsed?.date}
        defaultTime={parsed?.time}
        defaultProjectId={defaultProjectId}
        onSaved={(task) => {
          onCreated(task);
          setText("");
          setParsed(null);
        }}
      />
    </>
  );
}
