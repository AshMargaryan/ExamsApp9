import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCw, Sparkles, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listMistakes, type MistakeEntry } from "../api/mistakes";
import { MistakeRetryPanel } from "../components/mistakes/MistakeRetryPanel";
import { MathText } from "../components/MathText";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Skeleton } from "../components/ui/Skeleton";
import { askAiAboutMistake } from "../components/mistakes/askAiAboutMistake";
import { localizeSubjectName } from "../lib/subjects";

/*
  A focused, one-at-a-time review of a single slice of the mistake log.

  This is where a study-plan mistake task lands. Previously it dropped the
  student at the whole notebook — every subject, every topic, newest first —
  and left them to find the twelve algebra mistakes the task was actually
  about. The task now links here with ?subject=&topic=, and this page shows
  exactly that set, one card at a time, with a progress rail.

  Scoped by label rather than by a list of ids: the plan is generated once a
  day, and a topic the student is actively getting wrong will accumulate more
  mistakes during it. Filtering by (subject, topic) picks those up; a frozen
  id list would silently miss them.
*/

type Status = "loading" | "ready" | "error";

function SessionSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-2 w-full" />
      <Skeleton className="mt-6 h-64" />
    </div>
  );
}

export function MistakeReviewSessionPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { askAboutQuestion } = useAssistantLaunch();

  const subject = params.get("subject") ?? undefined;
  const topic = params.get("topic") ?? undefined;
  const source = (params.get("source") as MistakeEntry["source"] | null) ?? undefined;

  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<MistakeEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<number, boolean>>({});
  const [retryOpen, setRetryOpen] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    // `unresolved` is deliberately NOT set: a mistake the student got right on
    // a previous attempt is still worth seeing in a session about this topic,
    // and hiding it would make the count disagree with the task's title.
    listMistakes({ subject, topic, source })
      .then((data) => {
        setEntries(data);
        setIndex(0);
        setOutcomes({});
        setRetryOpen(false);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [subject, topic, source]);

  useEffect(load, [load]);

  const entry = entries[index];
  const reviewedCount = Object.keys(outcomes).length;
  const correctCount = useMemo(() => Object.values(outcomes).filter(Boolean).length, [outcomes]);
  const finished = entries.length > 0 && index >= entries.length;

  // `subject`/`topic` stay raw for the API query above; only the heading
  // is localized.
  const heading = topic || localizeSubjectName(subject) || "Սխալների վերանայում";

  function goNext() {
    setRetryOpen(false);
    setIndex((i) => i + 1);
  }

  if (status === "loading") return <SessionSkeleton />;

  if (status === "error") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Չհաջողվեց բեռնել այս սխալները։"
          hint="Սա սովորաբար ժամանակավոր խնդիր է։"
          onRetry={load}
        />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          to="/mistake-notebook"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Սխալների տետր
        </Link>
        <EmptyState
          tone="positive"
          icon={<Check size={26} strokeWidth={2} />}
          title={`«${heading}» թեմայում սխալներ չկան`}
          hint="Կա՛մ դեռ չես սխալվել այստեղ, կա՛մ արդեն ուղղել ես բոլորը։"
          cta={{ label: "Վերադառնալ պլանին", onClick: () => navigate("/study-plan") }}
        />
      </div>
    );
  }

  if (finished) {
    const pct = entries.length > 0 ? (correctCount / Math.max(1, reviewedCount)) * 100 : 0;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-[calc(var(--radius)*1.15)] border border-border bg-surface p-7 text-center">
          <div className="flex justify-center">
            <ProgressRing value={reviewedCount > 0 ? pct : null} size={132} thickness={9} label="Ճշտություն">
              <span className="text-2xl leading-none font-semibold tabular-nums text-text">
                {reviewedCount > 0 ? `${Math.round(pct)}%` : "—"}
              </span>
            </ProgressRing>
          </div>
          <h1 className="mt-5 text-xl font-semibold text-text">Վերանայումն ավարտված է</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
            «{heading}» — անցար {entries.length} սխալ
            {reviewedCount > 0 && `, կրկին լուծեցիր ${reviewedCount}-ը, որից ${correctCount}-ը ճիշտ`}։
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Button onClick={() => navigate("/study-plan")}>Վերադառնալ պլանին</Button>
            <Button variant="secondary" onClick={load} iconLeft={<RotateCw size={14} strokeWidth={2} />}>
              Կրկնել նորից
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/mistake-notebook"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Սխալների տետր
        </Link>
        <button
          type="button"
          onClick={() => navigate("/study-plan")}
          aria-label="Փակել վերանայումը"
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <h1 className="text-lg font-semibold text-text">{heading}</h1>
      <p className="mt-0.5 text-xs text-text-muted">
        {subject && topic ? `${localizeSubjectName(subject)} · ` : ""}
        {/* Own element with a live region: the position is the one thing that
            changes on every "next", and it should be announced. */}
        <span role="status" aria-label={`Հարց ${index + 1} ${entries.length}-ից`}>
          {`${index + 1} / ${entries.length}`}
        </span>
      </p>

      {/* Segment rail — one segment per mistake, filled as you pass it. */}
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {entries.map((e, i) => (
          <span
            key={e.id}
            className="h-1 flex-1 rounded-full transition-colors duration-[var(--motion-normal)]"
            style={{
              background:
                outcomes[e.id] === true
                  ? "var(--color-correct)"
                  : outcomes[e.id] === false
                    ? "var(--color-incorrect)"
                    : i === index
                      ? "var(--color-primary)"
                      : "var(--color-surface-muted)",
            }}
          />
        ))}
      </div>

      <article
        key={entry.id}
        className="mt-5 animate-[slide-up-in_var(--motion-normal)_var(--ease-out)] rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6"
      >
        <p className="text-[11px] font-semibold tracking-[0.1em] text-text-muted">
          {entry.topic_label || entry.subject_name}
        </p>

        <p className="mt-2.5 text-[17px] leading-relaxed text-text">
          <MathText text={entry.question_text} />
        </p>

        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-incorrect/30 bg-incorrect/[0.06] px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-text-muted">Քո պատասխանը</dt>
            <dd className="mt-0.5 text-sm text-incorrect">
              {entry.mistake_type === "not_attempted" ? (
                "Պատասխան չես նշել"
              ) : (
                <MathText text={entry.your_answer_text} />
              )}
            </dd>
          </div>
          <div className="rounded-[var(--radius)] border border-correct/30 bg-correct/[0.06] px-3.5 py-2.5">
            <dt className="text-[11px] font-medium text-text-muted">Ճիշտ պատասխանը</dt>
            <dd className="mt-0.5 text-sm text-correct">
              <MathText text={entry.correct_answer_text} />
            </dd>
          </div>
        </dl>

        {entry.explanation && (
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-text-muted">
            <MathText text={entry.explanation} />
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border pt-4">
          {entry.retryable && !retryOpen && outcomes[entry.id] === undefined && (
            <Button size="sm" onClick={() => setRetryOpen(true)} iconLeft={<RotateCw size={14} strokeWidth={2} />}>
              Կրկնել հարցը
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => askAboutQuestion(askAiAboutMistake(entry))}
            iconLeft={<Sparkles size={14} strokeWidth={1.75} />}
          >
            Հարցնել AI-ին
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={goNext}
            iconRight={<ArrowRight size={14} strokeWidth={2} />}
          >
            {index === entries.length - 1 ? "Ավարտել" : "Հաջորդը"}
          </Button>
        </div>

        {retryOpen && (
          <MistakeRetryPanel
            entry={entry}
            onResult={(r) => setOutcomes((prev) => ({ ...prev, [entry.id]: r.is_correct }))}
          />
        )}

        {outcomes[entry.id] !== undefined && (
          <p
            className={`mt-3 text-sm font-medium ${outcomes[entry.id] ? "text-correct" : "text-incorrect"}`}
            role="status"
          >
            {outcomes[entry.id] ? "Ճիշտ է — այս մեկը փակված է։" : "Դեռ սխալ է։ Կրկնիր այս թեման ևս մեկ անգամ։"}
          </p>
        )}
      </article>
    </div>
  );
}
