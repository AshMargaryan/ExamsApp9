import { useCallback, useEffect, useState } from "react";
import { AlarmClock, CalendarClock, CalendarDays, CheckCircle2, FolderKanban, Star, PartyPopper } from "lucide-react";
import {
  deleteTask, duplicateTask, getDashboard, toggleTaskComplete, type Task, type TodoDashboard,
} from "../api/todo";
import { QuickAddBar } from "../components/todo/QuickAddBar";
import { TaskCard } from "../components/todo/TaskCard";
import { TaskModal } from "../components/todo/TaskModal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Section } from "../components/ui/Section";
import { Skeleton } from "../components/ui/Skeleton";
import { extractErrorMessage, useToast } from "../context/ToastContext";

export function TodoHomePage() {
  const { showError } = useToast();
  const [dashboard, setDashboard] = useState<TodoDashboard | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  // A failed load left `dashboard` null for ever — the skeleton pulsed
  // indefinitely and the only signal was a toast that had already gone.
  const load = useCallback(() => {
    setLoadFailed(false);
    getDashboard().then(setDashboard).catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(task: Task) {
    setEditingTask(task);
    setModalOpen(true);
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

  if (loadFailed && !dashboard) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Իմ առաջադրանքները" />
        <ErrorState
          title="Առաջադրանքները չհաջողվեց բեռնել։"
          hint="Ոչինչ չի կորել — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-6)] h-9 w-64" />
        <div className="mb-[var(--space-6)] grid grid-cols-2 gap-[var(--space-3)]">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="mb-[var(--space-6)] h-14 w-full" />
        <div className="flex flex-col gap-[var(--space-2)]">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
        </div>
      </div>
    );
  }

  const cardProps = {
    onToggleComplete: handleToggleComplete,
    onEdit: openEdit,
    onDelete: setPendingDelete,
    onDuplicate: handleDuplicate,
  };
  const isFullyCaughtUp =
    dashboard.today.length === 0 && dashboard.overdue.length === 0 &&
    dashboard.upcoming.length === 0 && dashboard.important.length === 0;

  /*
    The five sections the endpoint returns overlap, and the page rendered
    them as-is: "Կարևոր" is every high/urgent task, so any task that is both
    important and due today appeared twice, roughly 200px apart, with two
    checkboxes that toggle the same thing. On the seeded account two of five
    tasks were duplicated; on a real one with a project it is three sections
    deep.

    A task is shown once, in the first section that has a claim on it, in the
    order the student would act: what is late, what is today, what is
    important, what is coming, then everything else grouped by project.
    "Կարևոր" therefore ends up meaning "important, and not already above",
    which is the only thing it can usefully mean on this page.
  */
  const seen = new Set<number>();
  function unseen(tasks: Task[]): Task[] {
    const out = tasks.filter((t) => !seen.has(t.id));
    out.forEach((t) => seen.add(t.id));
    return out;
  }
  const overdue = unseen(dashboard.overdue);
  const today = unseen(dashboard.today);
  const important = unseen(dashboard.important);
  const upcoming = unseen(dashboard.upcoming);
  const byProject = dashboard.by_project
    .map(({ project, tasks }) => ({ project, tasks: unseen(tasks) }))
    .filter(({ tasks }) => tasks.length > 0);

  const hasProgressToShow =
    dashboard.today_progress.total > 0 || dashboard.week_progress.total > 0;

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      {/*
        Was titled with a greeting — the third page in the product to open
        with "Բարի օր, {name}" rather than with its own name, which is also
        the name every sub-page's back link already uses for it.
      */}
      <PageHeader
        title="Իմ առաջադրանքները"
        actions={
          <nav aria-label="Առաջադրանքների բաժիններ" className="flex flex-wrap gap-[var(--space-2)]">
            <LinkButton to="/todo/list">Ցանկ</LinkButton>
            <LinkButton to="/todo/projects">Նախագծեր</LinkButton>
            <LinkButton to="/todo/trash" variant="ghost">Զամբյուղ</LinkButton>
          </nav>
        }
      />

      {/* Two progress cards reading "0 / 0 առաջադրանք" under an empty bar is
          a hundred pixels spent saying nothing. They appear once there is
          something to measure. */}
      {hasProgressToShow && (
        <div className="mb-[var(--space-6)] grid grid-cols-2 gap-[var(--space-3)]">
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]">
            <p className="mb-[var(--space-2)] text-[length:var(--text-xs)] font-medium text-text-muted">Այսօրվա առաջընթաց</p>
            <ProgressBar percent={dashboard.today_progress.percent} />
            <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] tabular-nums text-text-muted">
              {dashboard.today_progress.completed} / {dashboard.today_progress.total} առաջադրանք
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]">
            <p className="mb-[var(--space-2)] text-[length:var(--text-xs)] font-medium text-text-muted">Այս շաբաթվա առաջընթաց</p>
            <ProgressBar percent={dashboard.week_progress.percent} colorClassName="bg-accent" />
            <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] tabular-nums text-text-muted">
              {dashboard.week_progress.completed} / {dashboard.week_progress.total} առաջադրանք
            </p>
          </div>
        </div>
      )}

      <div className="mb-[var(--space-6)]">
        <QuickAddBar onCreated={load} />
      </div>

      {isFullyCaughtUp ? (
        <EmptyState
          icon={<PartyPopper size={26} strokeWidth={1.5} aria-hidden />}
          title="Դու ամեն ինչ կատարել ես"
          hint="Կատարման ենթակա առաջադրանքներ չկան։ Նորը ավելացրու վերևի տողում։"
        />
      ) : (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><AlarmClock size={17} strokeWidth={1.75} className="text-incorrect" />Ուշացած ({overdue.length})</span>}>
              <div className="flex flex-col gap-2">
                {overdue.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><CalendarDays size={17} strokeWidth={1.75} className="text-text-muted" />Այսօր ({today.length})</span>}>
            {today.length === 0 ? (
              <p className="text-sm text-text-muted">Այսօրվա համար առաջադրանքներ չկան։</p>
            ) : (
              <div className="flex flex-col gap-2">
                {today.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            )}
          </Section>

          {important.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><Star size={17} strokeWidth={1.75} className="text-text-muted" />Կարևոր</span>}>
              <div className="flex flex-col gap-2">
                {important.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          {upcoming.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><CalendarClock size={17} strokeWidth={1.75} className="text-text-muted" />Առաջիկա 7 օրում</span>}>
              <div className="flex flex-col gap-2">
                {upcoming.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          {byProject.length > 0 && (
            <Section
                spacing="none"
                level={3}
                title={<span className="flex items-center gap-2"><FolderKanban size={17} strokeWidth={1.75} className="text-text-muted" />Ըստ նախագծերի</span>}
                action={<LinkButton to="/todo/projects">Բոլորը</LinkButton>}
              >
              <div className="flex flex-col gap-4">
                {byProject.map(({ project, tasks }) => (
                  <div key={project.id}>
                    <p className="mb-2 text-sm font-medium text-text">{project.name}</p>
                    <div className="flex flex-col gap-2">
                      {tasks.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {dashboard.completed_today.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><CheckCircle2 size={17} strokeWidth={1.75} className="text-correct" />Կատարված այսօր ({dashboard.completed_today.length})</span>}>
              <div className="flex flex-col gap-2">
                {dashboard.completed_today.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}
        </div>
      )}

      <TaskModal open={modalOpen} onOpenChange={setModalOpen} task={editingTask} onSaved={load} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Ջնջե՞լ առաջադրանքը"
        description={`«${pendingDelete?.title}» կտեղափոխվի զամբյուղ և կարող ես վերականգնել այն այնտեղից։`}
        confirmLabel="Ջնջել"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
