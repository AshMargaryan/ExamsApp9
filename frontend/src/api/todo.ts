import { apiClient } from "./client";

export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type RecurrenceFrequency = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export interface ProjectMini {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Project extends ProjectMini {
  description: string;
  deadline: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  task_count: number;
  completed_count: number;
  progress_percent: number;
}

export interface CategoryMini {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Category extends CategoryMini {
  is_default: boolean;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Subtask {
  id: number;
  title: string;
  is_completed: boolean;
  order: number;
}

export interface SubtaskProgress {
  completed: number;
  total: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  notes: string;
  project: number | null;
  project_detail: ProjectMini | null;
  category: number | null;
  category_detail: CategoryMini | null;
  tags_detail: string[];
  priority: TaskPriority;
  priority_display: string;
  due_date: string | null;
  due_time: string | null;
  estimated_duration_minutes: number | null;
  reminder_offset_minutes: number | null;
  recurrence_freq: RecurrenceFrequency;
  recurrence_freq_display: string;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  subtasks: Subtask[];
  subtask_progress: SubtaskProgress;
  is_completed: boolean;
  completed_at: string | null;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  notes?: string;
  project?: number | null;
  category?: number | null;
  tags?: string[];
  priority?: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  estimated_duration_minutes?: number | null;
  reminder_offset_minutes?: number | null;
  recurrence_freq?: RecurrenceFrequency;
  recurrence_interval?: number;
  recurrence_end_date?: string | null;
  subtasks_input?: string[];
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
}

export interface TodoDashboard {
  today: Task[];
  upcoming: Task[];
  overdue: Task[];
  completed_today: Task[];
  important: Task[];
  by_project: { project: ProjectMini; tasks: Task[] }[];
  today_progress: Progress;
  week_progress: Progress;
}

export type TaskQuickFilter = "today" | "overdue" | "upcoming" | "important";
export type TaskSort = "priority" | "due_date" | "created_at" | "project" | "category" | "duration" | "completion";

export interface TaskListParams {
  priority?: TaskPriority;
  project?: number;
  category?: number;
  tag?: string;
  completed?: boolean;
  filter?: TaskQuickFilter;
  sort?: TaskSort;
}

export type BulkAction =
  | "complete" | "incomplete" | "delete"
  | "set_priority" | "set_category" | "set_project" | "add_tag" | "set_due_date";

export interface BulkActionInput {
  ids: number[];
  action: BulkAction;
  priority?: TaskPriority;
  category?: number | null;
  project?: number | null;
  tag?: string;
  due_date?: string | null;
}

export async function listTasks(params?: TaskListParams): Promise<Task[]> {
  const { data } = await apiClient.get("/todo/tasks/", { params });
  return data;
}

export async function getTask(id: number): Promise<Task> {
  const { data } = await apiClient.get(`/todo/tasks/${id}/`);
  return data;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data } = await apiClient.post("/todo/tasks/", input);
  return data;
}

export async function updateTask(id: number, input: Partial<TaskInput>): Promise<Task> {
  const { data } = await apiClient.patch(`/todo/tasks/${id}/`, input);
  return data;
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/todo/tasks/${id}/`);
}

export async function toggleTaskComplete(id: number): Promise<{ task: Task; next_occurrence?: Task }> {
  const { data } = await apiClient.post(`/todo/tasks/${id}/complete/`);
  return data;
}

export async function duplicateTask(id: number): Promise<Task> {
  const { data } = await apiClient.post(`/todo/tasks/${id}/duplicate/`);
  return data;
}

export async function bulkAction(input: BulkActionInput): Promise<{ updated: number }> {
  const { data } = await apiClient.post("/todo/tasks/bulk/", input);
  return data;
}

export async function getDashboard(): Promise<TodoDashboard> {
  const { data } = await apiClient.get("/todo/dashboard/");
  return data;
}

export async function addSubtask(taskId: number, title: string): Promise<Subtask> {
  const { data } = await apiClient.post(`/todo/tasks/${taskId}/subtasks/`, { title });
  return data;
}

export async function updateSubtask(
  taskId: number, subtaskId: number, patch: Partial<Pick<Subtask, "title" | "is_completed">>,
): Promise<Subtask> {
  const { data } = await apiClient.patch(`/todo/tasks/${taskId}/subtasks/${subtaskId}/`, patch);
  return data;
}

export async function deleteSubtask(taskId: number, subtaskId: number): Promise<void> {
  await apiClient.delete(`/todo/tasks/${taskId}/subtasks/${subtaskId}/`);
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get("/todo/projects/");
  return data;
}

export async function getProject(id: number): Promise<Project> {
  const { data } = await apiClient.get(`/todo/projects/${id}/`);
  return data;
}

export interface ProjectInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  deadline?: string | null;
  is_archived?: boolean;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data } = await apiClient.post("/todo/projects/", input);
  return data;
}

export async function updateProject(id: number, input: Partial<ProjectInput>): Promise<Project> {
  const { data } = await apiClient.patch(`/todo/projects/${id}/`, input);
  return data;
}

export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(`/todo/projects/${id}/`);
}

export interface CategoryInput {
  name: string;
  color?: string;
  icon?: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/todo/categories/");
  return data;
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post("/todo/categories/", input);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/todo/categories/${id}/`);
}

export async function listTags(): Promise<Tag[]> {
  const { data } = await apiClient.get("/todo/tags/");
  return data;
}

export async function listTrash(): Promise<Task[]> {
  const { data } = await apiClient.get("/todo/trash/");
  return data;
}

export async function restoreTask(id: number): Promise<Task> {
  const { data } = await apiClient.post(`/todo/trash/${id}/restore/`);
  return data;
}

export async function permanentlyDeleteTask(id: number): Promise<void> {
  await apiClient.delete(`/todo/trash/${id}/`);
}
