import { Link } from "react-router-dom";
import type { Project } from "../../api/todo";
import { ProgressBar } from "../ui/ProgressBar";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/todo/projects/${project.id}`}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-5 transition-colors hover:border-primary"
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: `${project.color}22`, color: project.color }}
        >
          ●
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{project.name}</p>
          {project.deadline && (
            <p className="text-xs text-text-muted">
              Վերջնաժամկետ՝ {new Date(`${project.deadline}T00:00:00`).toLocaleDateString("hy-AM")}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>{project.completed_count} / {project.task_count} առաջադրանք</span>
          <span>{project.progress_percent}%</span>
        </div>
        <ProgressBar percent={project.progress_percent} colorClassName="bg-primary" />
      </div>
    </Link>
  );
}
