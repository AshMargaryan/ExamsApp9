import { useCallback, useEffect, useState } from "react";
import { listTrash, permanentlyDeleteTask, restoreTask, type Task } from "../api/todo";
import { PriorityBadge } from "../components/todo/PriorityBadge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { RotateCcw, Trash2 } from "lucide-react";

export function TodoTrashPage() {
  const { showError, showSuccess } = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pendingPermanentDelete, setPendingPermanentDelete] = useState<Task | null>(null);

  const load = useCallback(() => {
    setLoadFailed(false);
    listTrash().then(setTasks).catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/todo", label: "Իմ առաջադրանքները" }}
        title="Զամբյուղ"
        description="Ջնջված առաջադրանքները մնում են այստեղ, մինչև վերականգնես կամ ընդմիշտ ջնջես դրանք։"
      />

      {loadFailed && !tasks ? (
        <ErrorState
          title="Զամբյուղը չհաջողվեց բեռնել։"
          hint="Ջնջված առաջադրանքները տեղում են — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      ) : !tasks ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={26} strokeWidth={1.5} aria-hidden />}
          title="Զամբյուղը դատարկ է"
          hint="Ջնջված առաջադրանքները կհայտնվեն այստեղ։"
        />
      ) : (
        <ul className="flex flex-col gap-[var(--space-2)]">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-wrap items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[length:var(--text-sm)] font-medium text-text-muted line-through">
                  {task.title}
                </p>
                <div className="mt-1 flex items-center gap-[var(--space-2)]">
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
              {/* Restoring is what the trash is for and what a student almost
                  always wants here. Deleting for ever was the filled danger
                  button beside it, on every row. */}
              <Button
                size="sm"
                onClick={() => handleRestore(task)}
                iconLeft={<RotateCcw size={15} strokeWidth={1.75} aria-hidden />}
              >
                Վերականգնել
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPendingPermanentDelete(task)}
                className="text-text-muted hover:text-incorrect"
              >
                Ջնջել ընդմիշտ
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingPermanentDelete !== null}
        onOpenChange={(open) => !open && setPendingPermanentDelete(null)}
        title="Ջնջե՞լ ընդմիշտ"
        description={`«${pendingPermanentDelete?.title}» անդառնալիորեն կջնջվի։ Այս գործողությունը հնարավոր չէ հետարկել։`}
        confirmLabel="Ջնջել ընդմիշտ"
        onConfirm={handlePermanentDelete}
      />
    </div>
  );
}
