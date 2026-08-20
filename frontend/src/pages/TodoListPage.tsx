import { useEffect, useState } from "react";
import {
  bulkAction, deleteTask, duplicateTask, listTasks, toggleTaskComplete,
  type BulkAction, type Task, type TaskListParams, type TaskPriority, type TaskQuickFilter, type TaskSort,
} from "../api/todo";
import { PRIORITY_OPTIONS } from "../components/todo/PriorityBadge";
import { TaskListRow } from "../components/todo/TaskListRow";
import { TaskModal } from "../components/todo/TaskModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Modal } from "../components/ui/Modal";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { Search } from "lucide-react";

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

const inputClass =
  "rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-primary";

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

  function load() {
    const params: TaskListParams = { sort };
    if (quickFilter === "completed") params.completed = true;
    else if (quickFilter !== "all") params.filter = quickFilter;
    listTasks(params).then(setTasks).catch((err) => showError(extractErrorMessage(err)));
  }

  useEffect(load, [quickFilter, sort]);

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <LinkButton to="/todo" className="mb-1">← Իմ առաջադրանքները</LinkButton>
          <h1 className="text-2xl font-semibold text-text">Ամբողջ ցանկը</h1>
        </div>
        <Button onClick={openCreate}>+ Նոր առաջադրանք</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setQuickFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              quickFilter === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Փնտրել վերնագրով, նկարագրությամբ, թեգով..."
          className={`${inputClass} min-w-[14rem] flex-1`}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as TaskSort)} className={inputClass}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-primary bg-primary/5 p-3">
          <span className="text-sm font-medium text-text">Ընտրված է {selected.size}</span>
          <Button size="sm" variant="secondary" onClick={() => handleBulk("complete")}>Կատարված</Button>
          <select
            value={bulkPriority}
            onChange={(e) => setBulkPriority(e.target.value as TaskPriority)}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => handleBulk("set_priority", { priority: bulkPriority })}>
            Փոխել առաջնահերթությունը
          </Button>
          <Button size="sm" variant="danger" onClick={() => setBulkDeleteConfirm(true)}>Ջնջել</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
            Չեղարկել ընտրությունը
          </Button>
        </div>
      )}

      {!filtered ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search size={26} strokeWidth={1.5} aria-hidden />} title="Ոչինչ չի գտնվել" hint="Փորձիր փոխել ֆիլտրերը կամ որոնման բառը։" />
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

      <Modal
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Ջնջե՞լ առաջադրանքը"
        description={`«${pendingDelete?.title}» կտեղափոխվի զամբյուղ։`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">Ջնջել</Button>
          </>
        }
      />

      <Modal
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
        title="Ջնջե՞լ ընտրված առաջադրանքները"
        description={`${selected.size} առաջադրանք կտեղափոխվի զամբյուղ։`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleBulkDelete} className="flex-1">Ջնջել</Button>
          </>
        }
      />
    </div>
  );
}
