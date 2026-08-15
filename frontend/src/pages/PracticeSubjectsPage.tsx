import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getHierarchy, type SubjectNode } from "../api/practice";
import { Battery } from "../components/Battery";
import { LinkButton } from "../components/ui/LinkButton";

type NavState = { subtopicId?: number; topicId?: number } | null;

// Resolves an assignment deep-link (state carrying a subtopicId/topicId with
// no known subject) to the subject that owns it, then redirects into
// /practice/:subjectId. Runs before the subject-picker grid renders.
function findOwningSubjectId(subjects: SubjectNode[], navState: NavState): number | null {
  if (!navState || (!navState.subtopicId && !navState.topicId)) return null;
  for (const subject of subjects) {
    for (const domain of subject.domains) {
      for (const topic of domain.topics) {
        if (navState.topicId === topic.id) return subject.id;
        if (topic.subtopics.some((s) => s.id === navState.subtopicId)) return subject.id;
      }
    }
  }
  return null;
}

export function PracticeSubjectsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as NavState;

  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);

  useEffect(() => {
    getHierarchy().then(setSubjects);
  }, []);

  useEffect(() => {
    if (!subjects) return;
    const subjectId = findOwningSubjectId(subjects, navState);
    if (subjectId !== null) {
      navigate(`/practice/${subjectId}`, { state: navState, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, location.key]);

  if (!subjects) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <LinkButton to="/">← Գլխավոր</LinkButton>
      <h1 className="mt-2 mb-6 text-3xl font-semibold text-text">Պարապել</h1>

      {subjects.length === 0 && (
        <p className="text-lg text-text-muted">Դեռ ոչ մի առարկա հասանելի չէ։</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            to={`/practice/${subject.id}`}
            className="rounded-[var(--radius)] border border-border bg-surface p-6 transition-colors hover:border-primary"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-xl font-semibold text-text">{subject.name}</span>
              <Battery percent={subject.progress.percent} avgScore={subject.progress.avg_score} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
