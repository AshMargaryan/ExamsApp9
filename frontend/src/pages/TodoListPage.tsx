import { useCallback, useEffect, useState } from "react";
import {
  bulkAction, deleteTask, duplicateTask, listTasks, toggleTaskComplete,
  type BulkAction, type Task, type TaskListParams, type TaskPriority, type TaskQuickFilter, type TaskSort,
} from "../api/todo";
import { PRIORITY_OPTIONS } from "../components/todo/PriorityBadge";
import { TaskListRow } from "../components/todo/TaskListRow";
import { TaskModal } from "../components/todo/TaskModal";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, fieldInputClass } from "../components/ui/Field";
import { FilterChips } from "../components/ui/FilterChips";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { ListTodo, Plus, Search } from "lucide-react";

type QuickFilterValue = TaskQuickFilter | "all" | "completed";

const QUICK_FILTERS: { value: QuickFilterValue; label: string }[] = [
  { value: "all", label: "Բոլորը" },
  { value: "today", label: "Այսօր" },
  { value: "overdue", label: "Ուշացած" },
  { value: "upcoming", label: "Առաջիկա" },
  { value: "important", label: "Կարևոր" },
  { value: "completed", label: "Կատարված" },
];

const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "due_date", label: "Ամսաթվով" },
  { value: "priority", label: "Առաջնահերթությամբ" },
  { value: "created_at", label: "Ստեղծման ամսաթվով" },
  { value: "project", label: "Նախագծով" },
  { value: "category", label: "Կատեգորիայով" },
  { value: "duration", label: "Տևողությամբ" },
  { value: "completion", label: "Կատարմամբ" },
];

export function TodoListPage() {
  const { showError } = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilterValue>("all");
  const [sort, setSort] = useState<TaskSort>("due_date");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkPriority, setBulkPriority] = useState<TaskPriority>("medium");
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    const params: TaskListParams = { sort };
    if (quickFilter === "completed") params.completed = true;
    else if (quickFilter !== "all") params.filter = quickFilter;
    setLoadFailed(false);
    listTasks(params).then(setTasks).catch(() => setLoadFailed(true));
  }, [quickFilter, sort]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filtered = tasks?.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.notes.toLowerCase().includes(q) ||
      t.tags_detail.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function toggleSelect(task: Task) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  }

  async function handleToggleComplete(task: Task) {
    try {
      await toggleTaskComplete(task.id);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  async function handleDuplicate(task: Task) {
    try {
      await duplicateTask(task.id);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteTask(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  async function handleBulk(action: BulkAction, extra?: Partial<{ priority: TaskPriority }>) {
    if (selected.size === 0) return;
    try {
      await bulkAction({ ids: [...selected], action, ...extra });
      setSelected(new Set());
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  async function handleBulkDelete() {
    await handleBulk("delete");
    setBulkDeleteConfirm(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/todo", label: "Իմ առաջադրանքները" }}
        title="Ամբողջ ցանկը"
        actions={
          <Button onClick={openCreate} iconLeft={<Plus size={16} strokeWidth={2} aria-hidden />}>
            Նոր առաջադրանք
          </Button>
        }
      />

      {/* Was six bare buttons whose only selected signal was colour and
          which the keyboard walked one tab stop at a time. */}
      <FilterChips
        label="Արագ զտիչ"
        className="mb-[var(--space-4)]"
        value={quickFilter}
        onChange={setQuickFilter}
        options={QUICK_FILTERS}
      />

      <div className="mb-[var(--space-4)] flex flex-wrap items-end gap-[var(--space-2)]">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[var(--space-3)] -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Փնտրել առաջադրանքներում"
            placeholder="Փնտրել վերնագրով, նկարագրությամբ, թեգով..."
            className={cn(fieldInputClass, "pl-9")}
          />
        </div>
        <Field label="Դասավորել" containerClassName="mb-0 w-full sm:w-56">
          {({ id }) => (
            <Select
              id={id}
              value={sort}
              onChange={(v) => setSort(v as TaskSort)}
              options={SORT_OPTIONS}
            />
          )}
        </Field>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Ընտրված առաջադրանքների գործողություններ"
          className="mb-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-primary bg-primary-bg p-[var(--space-3)]"
        >
          <span className="text-[length:var(--text-sm)] font-medium text-text">Ընտրված է {selected.size}</span>
          <Button size="sm" variant="secondary" onClick={() => handleBulk("complete")}>Կատարված</Button>
          <div className="w-44">
            <Select
              label="Նոր առաջնահերթություն"
              value={bulkPriority}
              onChange={(v) => setBulkPriority(v as TaskPriority)}
              options={PRIORITY_OPTIONS}
            />
          </div>
          {/* The button names what the dropdown beside it is for — "Կիրառել"
              on its own left a sighted reader guessing what gets applied. */}
          <Button size="sm" variant="secondary" onClick={() => handleBulk("set_priority", { priority: bulkPriority })}>
            Փոխել առաջնահերթությունը
          </Button>
          {/* The only irreversible-looking action in the strip, and it was a
              filled danger button sitting between two neutral ones. */}
          <Button size="sm" variant="ghost" onClick={() => setBulkDeleteConfirm(true)} className="text-text-muted hover:text-incorrect">
            Ջնջել
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
            Չեղարկել ընտրությունը
          </Button>
        </div>
      )}

      {loadFailed && !filtered ? (
        <ErrorState
          title="Ցանկը չհաջողվեց բեռնել։"
          hint="Ոչինչ չի կորել — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      ) : !filtered ? (
        <div className="flex flex-col gap-[var(--space-2)]">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        search.trim() || quickFilter !== "all" ? (
          <EmptyState
            icon={<Search size={26} strokeWidth={1.5} aria-hidden />}
            title="Ոչինչ չի գտնվել"
            hint="Փորձիր փոխել զտիչը կամ որոնման բառը։"
            cta={{
              label: "Մաքրել զտիչները",
              onClick: () => {
                setQuickFilter("all");
                setSearchInput("");
              },
            }}
          />
        ) : (
          /* "Nothing found" is the wrong sentence when there is nothing to
             find — an empty list and a filtered-out list were the same state. */
          <EmptyState
            icon={<ListTodo size={26} strokeWidth={1.5} aria-hidden />}
            title="Դեռ առաջադրանքներ չկան"
            hint="Ավելացրու առաջինը՝ ցանկը սկսելու համար։"
            cta={{ label: "Նոր առաջադրանք", onClick: openCreate }}
          />
        )
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          {filtered.map((task) => (
            <TaskListRow
              key={task.id}
              task={task}
              selected={selected.has(task.id)}
              onToggleSelect={toggleSelect}
              onToggleComplete={handleToggleComplete}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <TaskModal open={modalOpen} onOpenChange={setModalOpen} task={editingTask} onSaved={load} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Ջնջե՞լ առաջադրանքը"
        description={`«${pendingDelete?.title}» կտեղափոխվի զամբյուղ։`}
        confirmLabel="Ջնջել"
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title="Ջնջե՞լ ընտրված առաջադրանքները"
        description={`${selected.size} առաջադրանք կտեղափոխվի զամբյուղ։ Կարող ես վերականգնել դրանք այնտեղից։`}
        confirmLabel="Ջնջել"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
