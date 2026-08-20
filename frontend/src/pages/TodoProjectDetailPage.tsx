import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, FolderOpen } from "lucide-react";
import {
  deleteProject, deleteTask, duplicateTask, getProject, listTasks, toggleTaskComplete,
  type Project, type Task,
} from "../api/todo";
import { ProjectFormModal } from "../components/todo/ProjectFormModal";
import { TaskCard } from "../components/todo/TaskCard";
import { TaskModal } from "../components/todo/TaskModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Modal } from "../components/ui/Modal";
import { ProgressBar } from "../components/ui/ProgressBar";
import { extractErrorMessage, useToast } from "../context/ToastContext";

export function TodoProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { showError } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);

  function load() {
    getProject(projectId).then(setProject).catch((err) => showError(extractErrorMessage(err)));
    listTasks({ project: projectId, sort: "due_date" }).then(setTasks).catch((err) => showError(extractErrorMessage(err)));
  }

  useEffect(load, [projectId]);

  function openCreate() {
    setEditingTask(null);
    setTaskModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setTaskModalOpen(true);
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

  async function handleDeleteProject() {
    try {
      await deleteProject(projectId);
      navigate("/todo/projects");
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  if (!project || !tasks) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-32 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/todo/projects" className="mb-4">← Նախագծեր</LinkButton>

      <div className="mb-6 rounded-[var(--radius)] border border-border bg-surface p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${project.color}22`, color: project.color }}
            >
              ●
            </span>
            <div>
              <h1 className="text-xl font-semibold text-text">{project.name}</h1>
              {project.description && <p className="mt-0.5 text-sm text-text-muted">{project.description}</p>}
              {project.deadline && (
                <p className="mt-0.5 text-xs text-text-muted">
                  Վերջնաժամկետ՝ {new Date(`${project.deadline}T00:00:00`).toLocaleDateString("hy-AM")}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Խմբագրել նախագիծը"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteProjectConfirm(true)}
              aria-label="Ջնջել նախագիծը"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-incorrect-bg hover:text-incorrect"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>{project.completed_count} / {project.task_count} առաջադրանք</span>
          <span>{project.progress_percent}%</span>
        </div>
        <ProgressBar percent={project.progress_percent} colorClassName="bg-primary" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Առաջադրանքներ</h2>
        <Button size="sm" onClick={openCreate}>+ Նոր առաջադրանք</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={26} strokeWidth={1.5} aria-hidden />}
          title="Այս նախագծում դեռ առաջադրանքներ չկան"
          cta={{ label: "Ավելացնել առաջադրանք", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onEdit={openEdit}
              onDelete={setPendingDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSaved={(saved) => setProject(saved)}
      />

      <TaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        defaultProjectId={projectId}
        onSaved={load}
      />

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
        open={deleteProjectConfirm}
        onOpenChange={setDeleteProjectConfirm}
        title="Ջնջե՞լ նախագիծը"
        description="Նախագիծը կջնջվի, բայց դրա առաջադրանքները կմնան (առանց նախագծի)։"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteProjectConfirm(false)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleDeleteProject} className="flex-1">Ջնջել</Button>
          </>
        }
      />
    </div>
  );
}
