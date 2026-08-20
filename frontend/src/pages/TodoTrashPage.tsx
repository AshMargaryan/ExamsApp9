import { useEffect, useState } from "react";
import { listTrash, permanentlyDeleteTask, restoreTask, type Task } from "../api/todo";
import { PriorityBadge } from "../components/todo/PriorityBadge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Modal } from "../components/ui/Modal";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { Trash2 } from "lucide-react";

export function TodoTrashPage() {
  const { showError, showSuccess } = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<Task | null>(null);

  function load() {
    listTrash().then(setTasks).catch((err) => showError(extractErrorMessage(err)));
  }

  useEffect(load, []);

  async function handleRestore(task: Task) {
    try {
      await restoreTask(task.id);
      showSuccess(`«${task.title}» վերականգնվեց։`);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  async function handlePermanentDelete() {
    if (!pendingPermanentDelete) return;
    try {
      await permanentlyDeleteTask(pendingPermanentDelete.id);
      setPendingPermanentDelete(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/todo" className="mb-1">← Իմ առաջադրանքները</LinkButton>
      <h1 className="mb-1 text-2xl font-semibold text-text">Զամբյուղ</h1>
      <p className="mb-6 text-sm text-text-muted">Ջնջված առաջադրանքները մնում են այստեղ մինչև վերականգնես կամ ամբողջովին ջնջես դրանք։</p>

      {!tasks ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<Trash2 size={26} strokeWidth={1.5} aria-hidden />} title="Զամբյուղը դատարկ է" hint="Ջնջված առաջադրանքները կհայտնվեն այստեղ։" />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-muted line-through">{task.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => handleRestore(task)}>Վերականգնել</Button>
              <Button size="sm" variant="danger" onClick={() => setPendingPermanentDelete(task)}>Ջնջել ընդմիշտ</Button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={pendingPermanentDelete !== null}
        onOpenChange={(open) => !open && setPendingPermanentDelete(null)}
        title="Ջնջե՞լ ընդմիշտ"
        description={`«${pendingPermanentDelete?.title}» անդառնալիորեն կջնջվի։ Այս գործողությունը հնարավոր չէ հետարկել։`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingPermanentDelete(null)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handlePermanentDelete} className="flex-1">Ջնջել ընդմիշտ</Button>
          </>
        }
      />
    </div>
  );
}
