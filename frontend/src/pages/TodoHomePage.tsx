import { useEffect, useState } from "react";
import { AlarmClock, CalendarClock, CalendarDays, CheckCircle2, FolderKanban, Star, PartyPopper } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  deleteTask, duplicateTask, getDashboard, toggleTaskComplete, type Task, type TodoDashboard,
} from "../api/todo";
import { QuickAddBar } from "../components/todo/QuickAddBar";
import { TaskCard } from "../components/todo/TaskCard";
import { TaskModal } from "../components/todo/TaskModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Modal } from "../components/ui/Modal";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Section } from "../components/ui/Section";
import { extractErrorMessage, useToast } from "../context/ToastContext";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Բարի լույս";
  if (hour < 18) return "Բարի օր";
  return "Բարի երեկո";
}

export function TodoHomePage() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [dashboard, setDashboard] = useState<TodoDashboard | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  function load() {
    getDashboard().then(setDashboard).catch((err) => showError(extractErrorMessage(err)));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

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

  if (!dashboard) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* The 👋 was the only emoji left in a page title. Nothing else is
            needed: the greeting already is the warmth. */}
        <h1 className="font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)] text-text">
          {greeting()}{user?.first_name ? `, ${user.first_name}` : ""}
        </h1>
        <nav className="flex flex-wrap gap-2">
          <LinkButton to="/todo/list">Ցանկ</LinkButton>
          <LinkButton to="/todo/projects">Նախագծեր</LinkButton>
          <LinkButton to="/todo/trash" variant="ghost">Զամբյուղ</LinkButton>
        </nav>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-text-muted">Այսօրվա առաջընթաց</p>
          <ProgressBar percent={dashboard.today_progress.percent} />
          <p className="mt-2 text-xs text-text-muted">
            {dashboard.today_progress.completed} / {dashboard.today_progress.total} առաջադրանք
          </p>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-text-muted">Այս շաբաթվա առաջընթաց</p>
          <ProgressBar percent={dashboard.week_progress.percent} colorClassName="bg-accent" />
          <p className="mt-2 text-xs text-text-muted">
            {dashboard.week_progress.completed} / {dashboard.week_progress.total} առաջադրանք
          </p>
        </div>
      </div>

      <div className="mb-6">
        <QuickAddBar onCreated={load} />
      </div>

      {isFullyCaughtUp ? (
        <EmptyState
          icon={<PartyPopper size={26} strokeWidth={1.5} aria-hidden />}
          title="Դու ամեն ինչ կատարել ես"
          hint="Կատարման ենթակա առաջադրանքներ չկան։"
          cta={{ label: "Ավելացնել առաջադրանք", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {dashboard.overdue.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><AlarmClock size={17} strokeWidth={1.75} className="text-incorrect" />Ուշացած ({dashboard.overdue.length})</span>}>
              <div className="flex flex-col gap-2">
                {dashboard.overdue.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><CalendarDays size={17} strokeWidth={1.75} className="text-text-muted" />Այսօր ({dashboard.today.length})</span>}>
            {dashboard.today.length === 0 ? (
              <p className="text-sm text-text-muted">Այսօրվա համար առաջադրանքներ չկան։</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dashboard.today.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            )}
          </Section>

          {dashboard.important.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><Star size={17} strokeWidth={1.75} className="text-text-muted" />Կարևոր</span>}>
              <div className="flex flex-col gap-2">
                {dashboard.important.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          {dashboard.upcoming.length > 0 && (
            <Section spacing="none" level={3} title={<span className="flex items-center gap-2"><CalendarClock size={17} strokeWidth={1.75} className="text-text-muted" />Առաջիկա 7 օրում</span>}>
              <div className="flex flex-col gap-2">
                {dashboard.upcoming.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
              </div>
            </Section>
          )}

          {dashboard.by_project.length > 0 && (
            <Section
                spacing="none"
                level={3}
                title={<span className="flex items-center gap-2"><FolderKanban size={17} strokeWidth={1.75} className="text-text-muted" />Ըստ նախագծերի</span>}
                action={<LinkButton to="/todo/projects">Բոլորը</LinkButton>}
              >
              <div className="flex flex-col gap-4">
                {dashboard.by_project.map(({ project, tasks }) => (
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

      <Modal
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Ջնջե՞լ առաջադրանքը"
        description={`«${pendingDelete?.title}» կտեղափոխվի զամբյուղ և կարող ես վերականգնել այն այնտեղից։`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">Ջնջել</Button>
          </>
        }
      />
    </div>
  );
}
