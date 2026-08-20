import { useEffect, useState } from "react";
import { listProjects, type Project } from "../api/todo";
import { ProjectCard } from "../components/todo/ProjectCard";
import { ProjectFormModal } from "../components/todo/ProjectFormModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { Rocket } from "lucide-react";

export function TodoProjectsPage() {
  const { showError } = useToast();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    listProjects().then(setProjects).catch((err) => showError(extractErrorMessage(err)));
  }, []);

  function handleSaved(project: Project) {
    setProjects((prev) => [project, ...(prev ?? [])]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <LinkButton to="/todo" className="mb-1">← Իմ առաջադրանքները</LinkButton>
          <h1 className="text-2xl font-semibold text-text">Նախագծեր</h1>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ Նոր նախագիծ</Button>
      </div>

      {!projects ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Rocket size={26} strokeWidth={1.5} aria-hidden />}
          title="Դեռ նախագծեր չկան"
          hint="Խմբավորիր կապակցված առաջադրանքները մեկ նախագծի մեջ։"
          cta={{ label: "Նոր նախագիծ", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormModal open={formOpen} onOpenChange={setFormOpen} onSaved={handleSaved} />
    </div>
  );
}
