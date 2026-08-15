import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { getHierarchy } from "../api/practice";
import { PRACTICE_SUBJECT_NAMES, subjectMeta } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";
import { BookOpen, ClipboardCheck, Layers, Plus } from "lucide-react";

function HubCard({
  to, icon, title, subtitle, dashed,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  dashed?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-2 rounded-[var(--radius)] border p-6 text-center transition-colors hover:border-primary ${
        dashed ? "border-dashed border-primary text-primary" : "border-border bg-surface"
      }`}
    >
      <span className="flex text-3xl" aria-hidden>
        {icon}
      </span>
      <p className={`text-lg font-medium ${dashed ? "" : "text-text"}`}>{title}</p>
      <p className="text-sm text-text-muted">{subtitle}</p>
    </Link>
  );
}

export function SubjectHubPage() {
  const { subject } = useParams<{ subject: string }>();
  const meta = subjectMeta(subject);
  // undefined = still checking, null = no practice content for this subject, number = practice subject id
  const [practiceSubjectId, setPracticeSubjectId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    setPracticeSubjectId(undefined);
    const name = subject ? PRACTICE_SUBJECT_NAMES[subject as keyof typeof PRACTICE_SUBJECT_NAMES] : undefined;
    if (!name) {
      setPracticeSubjectId(null);
      return;
    }
    let alive = true;
    getHierarchy().then((subjects) => {
      if (!alive) return;
      const found = subjects.find((s) => s.name === name);
      setPracticeSubjectId(found ? found.id : null);
    });
    return () => {
      alive = false;
    };
  }, [subject]);

  if (!meta) {
    return (
      <div className="p-8">
        <p className="text-lg text-text-muted">Առարկան չի գտնվել։</p>
        <LinkButton to="/subjects">← Առարկաներ</LinkButton>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/subjects" className="mb-4">← Առարկաներ</LinkButton>
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-semibold text-text">
        <span aria-hidden>{meta.icon}</span> {meta.label}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {practiceSubjectId === undefined ? (
          <div className="h-32 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
        ) : practiceSubjectId === null ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-border p-6 text-center text-text-muted">
            <span className="flex text-3xl" aria-hidden>
              <BookOpen size={30} strokeWidth={1.75} />
            </span>
            <p className="text-lg font-medium">Պարապել</p>
            <p className="text-sm">Այս առարկայի նյութը շուտով կավելացվի։</p>
          </div>
        ) : (
          <HubCard
            to={`/practice/${practiceSubjectId}`}
            icon={<BookOpen size={30} strokeWidth={1.75} />}
            title="Պարապել"
            subtitle="Թեմաներով ուսուցում ու վարժություններ"
          />
        )}

        <HubCard
          to={`/mock-exams?subject=${meta.key}`}
          icon={<ClipboardCheck size={30} strokeWidth={1.75} />}
          title="Թեստ"
          subtitle="Ամբողջական թեստ, արդյունքը՝ վերջում"
        />

        <HubCard
          to={`/flashcards?subject=${meta.key}`}
          icon={<Layers size={30} strokeWidth={1.75} />}
          title="Բառաքարտեր"
          subtitle="Կրկնիր առկա փաթեթները"
        />

        <HubCard
          to={`/flashcards?subject=${meta.key}&tab=mine&create=1`}
          icon={<Plus size={30} strokeWidth={1.75} />}
          title="Ստեղծել նոր բառաքարտեր"
          subtitle="Քո սեփական փաթեթը այս առարկայի համար"
          dashed
        />
      </div>
    </div>
  );
}
