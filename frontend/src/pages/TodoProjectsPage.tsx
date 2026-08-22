import { useCallback, useEffect, useState } from "react";
import { listProjects, type Project } from "../api/todo";
import { ProjectCard } from "../components/todo/ProjectCard";
import { ProjectFormModal } from "../components/todo/ProjectFormModal";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { Plus, Rocket } from "lucide-react";

export function TodoProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    listProjects().then(setProjects).catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(project: Project) {
    setProjects((prev) => [project, ...(prev ?? [])]);
  }

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/todo", label: "Իմ առաջադրանքները" }}
        title="Նախագծեր"
        description="Խմբավորիր կապակցված առաջադրանքները մեկ տեղում։"
        actions={
          <Button onClick={() => setFormOpen(true)} iconLeft={<Plus size={16} strokeWidth={2} aria-hidden />}>
            Նոր նախագիծ
          </Button>
        }
      />

      {loadFailed && !projects ? (
        <ErrorState
          title="Նախագծերը չհաջողվեց բեռնել։"
          hint="Ոչինչ չի կորել — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      ) : !projects ? (
        <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Rocket size={26} strokeWidth={1.5} aria-hidden />}
          title="Դեռ նախագծեր չկան"
          hint="Խմբավորիր կապակցված առաջադրանքները մեկ նախագծի մեջ։"
          cta={{ label: "Նոր նախագիծ", onClick: () => setFormOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectFormModal open={formOpen} onOpenChange={setFormOpen} onSaved={handleSaved} />
    </div>
  );
}
