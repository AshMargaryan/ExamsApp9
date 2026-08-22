import type { ReactNode } from "react";
import { BookOpen, ClipboardCheck, Layers, NotebookText } from "lucide-react";
import type { StudyTask, StudyTaskType } from "../../api/studyPlan";

/** Armenian duration, spoken the way a student would say it: "1ժ 30ր". */
export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}ժ ${rest}ր` : `${hours}ժ`;
  }
  return `${minutes} ր`;
}

/*
  One place that knows what each task type *is*.

  The icon says which of the four learning surfaces a task belongs to at a
  glance, and the label names it for screen readers, which would otherwise hear
  only the title. Lucide rather than emoji so the row keeps a single visual
  language with the rest of the app.
*/
export const TASK_META: Record<StudyTaskType, { icon: ReactNode; label: string }> = {
  flashcard_review: { icon: <Layers size={14} strokeWidth={1.75} />, label: "Բառաքարտեր" },
  practice_weak_topic: { icon: <BookOpen size={14} strokeWidth={1.75} />, label: "Վարժություններ" },
  mistake_retry: { icon: <NotebookText size={14} strokeWidth={1.75} />, label: "Սխալների վերանայում" },
  mock_exam_retake: { icon: <ClipboardCheck size={14} strokeWidth={1.75} />, label: "Ամբողջական թեստ" },
};

/**
 * Where a task's CTA goes.
 *
 * Normally the server's own `link_path`. Mistake tasks are the exception: the
 * link is rebuilt here from the task's subject/topic so the deep-link works
 * even for a plan row generated before the server started emitting it — a plan
 * is created once per day and cached, so without this the fix wouldn't reach
 * anyone until tomorrow. Both sides produce the same URL.
 */
export function taskHref(task: StudyTask): string {
  if (task.task_type === "mistake_retry") {
    const params = new URLSearchParams({ subject: task.subject_name });
    if (task.topic_label) params.set("topic", task.topic_label);
    return `/mistake-notebook/review?${params.toString()}`;
  }
  return task.link_path;
}
