import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, HelpCircle, NotebookText, Play, Sparkles, Tag, type LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  classifyMistake,
  listMistakes,
  type ErrorCategory,
  type MistakeEntry,
  type MistakeSource,
} from "../api/mistakes";
import { MistakeRetryPanel } from "../components/mistakes/MistakeRetryPanel";
import { askAiAboutMistake } from "../components/mistakes/askAiAboutMistake";
import { MathText } from "../components/MathText";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Metric } from "../components/ui/Metric";
import { Skeleton } from "../components/ui/Skeleton";
import { localizeSubjectName, subjectIconForName } from "../lib/subjects";

/*
  The mistake log, organised the way mistakes actually cluster: by subject,
  then by topic.

  A flat newest-first list answers "what did I get wrong most recently", which
  is almost never the question. The question is "where do I keep going wrong" —
  so topics are the unit here, each one carrying its count and a single button
  that opens the focused review session for exactly that slice.

  Individual mistakes are still reachable (expand a topic), because sometimes
  you do just want to reread one.
*/

const SOURCE_TABS: { key: MistakeSource | "all"; label: string }[] = [
  { key: "all", label: "Բոլորը" },
  { key: "practice", label: "Առարկաներ" },
  { key: "mock_exam", label: "Ամբողջական թեստեր" },
  { key: "flashcard", label: "Բառաքարտեր" },
];

const SOURCE_LABEL: Record<MistakeSource, string> = {
  practice: "Առարկաներ",
  mock_exam: "Ամբողջական թեստ",
  flashcard: "Բառաքարտ",
};

const CATEGORY_LABEL: Record<ErrorCategory, string> = {
  unclassified: "Դեռ չդասակարգված",
  careless_slip: "Անուշադրության սխալ",
  conceptual_gap: "Հասկացողության բաց",
  process_error: "Սխալ մեթոդ",
  misread_question: "Սխալ ընկալված հարց",
};

const CATEGORY_CLASS: Record<ErrorCategory, string> = {
  unclassified: "border-border bg-surface-muted text-text-muted",
  careless_slip: "border-primary/40 bg-primary/10 text-primary",
  conceptual_gap: "border-incorrect/40 bg-incorrect/10 text-incorrect",
  process_error: "border-primary/40 bg-primary/10 text-primary",
  misread_question: "border-border bg-surface-muted text-text-muted",
};

interface TopicGroup {
  topic: string;
  entries: MistakeEntry[];
  openCount: number;
}

interface SubjectGroup {
  subject: string;
  Icon: LucideIcon;
  entries: MistakeEntry[];
  openCount: number;
  topics: TopicGroup[];
}

/** A mistake counts as "open" until it has been re-answered correctly. */
function isOpen(entry: MistakeEntry): boolean {
  return entry.last_retry_correct !== true;
}

function group(entries: MistakeEntry[]): SubjectGroup[] {
  const bySubject = new Map<string, MistakeEntry[]>();
  for (const e of entries) {
    const key = e.subject_name || "Այլ";
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(e);
  }

  return Array.from(bySubject.entries())
    .map(([subject, subjectEntries]) => {
      const byTopic = new Map<string, MistakeEntry[]>();
      for (const e of subjectEntries) {
        const key = e.topic_label || "Առանց թեմայի";
        if (!byTopic.has(key)) byTopic.set(key, []);
        byTopic.get(key)!.push(e);
      }
      const topics = Array.from(byTopic.entries())
        .map(([topic, topicEntries]) => ({
          topic,
          entries: topicEntries,
          openCount: topicEntries.filter(isOpen).length,
        }))
        // Worst first — the topic with the most unresolved mistakes is the
        // one worth opening.
        .sort((a, b) => b.openCount - a.openCount || b.entries.length - a.entries.length);

      return {
        subject,
        Icon: subjectIconForName(subject),
        entries: subjectEntries,
        openCount: subjectEntries.filter(isOpen).length,
        topics,
      };
    })
    .sort((a, b) => b.openCount - a.openCount || b.entries.length - a.entries.length);
}

function MistakeDetail({ entry: initial }: { entry: MistakeEntry }) {
  const { showError } = useToast();
  const { askAboutQuestion } = useAssistantLaunch();
  const [entry, setEntry] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(initial.retry_count);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(initial.last_retry_correct);
  const [classifying, setClassifying] = useState(false);
  const [classifyFailed, setClassifyFailed] = useState(false);

  async function handleClassify() {
    setClassifying(true);
    setClassifyFailed(false);
    try {
      const updated = await classifyMistake(entry.id);
      setEntry(updated);
      if (updated.classified_at === null) setClassifyFailed(true);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
        <span className="flex items-center gap-2">
          {SOURCE_LABEL[entry.source]}
          {entry.mistake_type === "not_attempted" && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5">Բաց թողնված</span>
          )}
        </span>
        <span>{new Date(entry.created_at).toLocaleDateString("hy-AM")}</span>
      </div>

      <p className="text-[15px] leading-relaxed text-text">
        <MathText text={entry.question_text} />
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-incorrect/30 bg-incorrect/[0.06] px-3 py-2">
          <p className="text-[10.5px] text-text-muted">Քո պատասխանը</p>
          <p className="mt-0.5 text-[13px] text-incorrect">
            {entry.mistake_type === "not_attempted" ? "Չես նշել" : <MathText text={entry.your_answer_text} />}
          </p>
        </div>
        <div className="rounded-md border border-correct/30 bg-correct/[0.06] px-3 py-2">
          <p className="text-[10.5px] text-text-muted">Ճիշտ պատասխանը</p>
          <p className="mt-0.5 text-[13px] text-correct">
            <MathText text={entry.correct_answer_text} />
          </p>
        </div>
      </div>

      {entry.explanation && (
        <p className="mt-2.5 text-[13px] leading-relaxed text-text-muted">
          <MathText text={entry.explanation} />
        </p>
      )}

      {entry.classified_at && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${CATEGORY_CLASS[entry.error_category]}`}
          >
            <Tag size={11} strokeWidth={1.75} /> {CATEGORY_LABEL[entry.error_category]}
          </span>
          {entry.error_explanation && <p className="text-[11.5px] text-text-muted">{entry.error_explanation}</p>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {entry.retryable && !retrying && (
          <Button variant="secondary" size="sm" onClick={() => setRetrying(true)}>
            Կրկնել
          </Button>
        )}
        {entry.mistake_type !== "not_attempted" && !entry.classified_at && (
          <Button
            variant="ghost"
            size="sm"
            loading={classifying}
            onClick={handleClassify}
            iconLeft={<HelpCircle size={13} strokeWidth={1.75} />}
          >
            Ինչու՞ եմ սխալվել
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => askAboutQuestion(askAiAboutMistake(entry))}
          iconLeft={<Sparkles size={13} strokeWidth={1.75} />}
        >
          Հարցնել AI-ին
        </Button>
        {retryCount > 0 && (
          <span className="text-[11px] text-text-muted">
            {retryCount} փորձ
            {lastCorrect !== null && (
              <> · վերջինը՝ {lastCorrect ? <span className="text-correct">ճիշտ</span> : <span className="text-incorrect">սխալ</span>}</>
            )}
          </span>
        )}
        {classifyFailed && <span className="text-[11px] text-text-muted">AI-ն այժմ հասանելի չէ։</span>}
      </div>

      {retrying && (
        <MistakeRetryPanel
          entry={entry}
          onResult={(r) => {
            setLastCorrect(r.is_correct);
            setRetryCount((c) => c + 1);
          }}
        />
      )}
    </div>
  );
}

function TopicRow({ subject, group: g }: { subject: string; group: TopicGroup }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const sessionHref = `/mistake-notebook/review?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(
    g.entries[0]?.topic_label ?? "",
  )}`;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface">
      <div className="flex items-center gap-3 p-3.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronDown
            size={15}
            strokeWidth={2}
            aria-hidden
            className={`shrink-0 text-text-muted transition-transform duration-[var(--motion-fast)] ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">{g.topic}</span>
            <span className="mt-0.5 block text-[11.5px] text-text-muted">
              {g.openCount > 0 ? `${g.openCount} բաց սխալ` : "Բոլորը ուղղված են"}
              {g.entries.length !== g.openCount && ` · ընդամենը ${g.entries.length}`}
            </span>
          </span>
        </button>

        {g.entries[0]?.topic_label && (
          <Button
            size="sm"
            variant={g.openCount > 0 ? "primary" : "secondary"}
            onClick={() => navigate(sessionHref)}
            iconLeft={<Play size={13} strokeWidth={2.5} />}
          >
            Վերանայել
          </Button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-border p-3.5">
          {g.entries.map((e) => (
            <MistakeDetail key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}

type Status = "loading" | "ready" | "error";

export function MistakeNotebookPage() {
  const [tab, setTab] = useState<MistakeSource | "all">("all");
  const [status, setStatus] = useState<Status>("loading");
  const [entries, setEntries] = useState<MistakeEntry[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    listMistakes(tab === "all" ? {} : { source: tab })
      .then((data) => {
        setEntries(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [tab]);

  useEffect(load, [load]);

  const groups = useMemo(() => group(entries), [entries]);
  const openTotal = entries.filter(isOpen).length;
  const resolvedTotal = entries.length - openTotal;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Գլխավոր
      </Link>

      <h1 className="flex items-center gap-2.5 text-[26px] leading-tight font-semibold text-text sm:text-[30px]">
        <NotebookText size={26} strokeWidth={1.75} className="shrink-0 text-primary" />
        Սխալների տետր
      </h1>
      <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-text-muted">
        Ամեն սխալ խմբավորված է ըստ թեմայի, որովհետև կրկնվող սխալները հենց այնտեղ են ապրում։ Ընտրիր թեման և
        վերանայիր ամբողջը մեկ նստաշրջանում։
      </p>

      {status === "ready" && entries.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-9 gap-y-3">
          <Metric label="բաց սխալ" value={openTotal} size="lg" tone={openTotal > 0 ? "incorrect" : "correct"} />
          <Metric label="ուղղված" value={resolvedTotal} size="lg" tone="correct" />
          <Metric label="թեմա" value={groups.reduce((n, g) => n + g.topics.length, 0)} size="lg" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Աղբյուր">
        {SOURCE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === t.key
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border text-text-muted hover:border-primary hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {status === "loading" ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : status === "error" ? (
          <ErrorState title="Չհաջողվեց բեռնել սխալների տետրը։" onRetry={load} />
        ) : entries.length === 0 ? (
          <EmptyState
            tone="positive"
            icon={<NotebookText size={26} strokeWidth={1.75} />}
            title="Այստեղ դեռ սխալներ չկան"
            hint="Երբ որևէ հարցում սխալվես, այն ինքնաբերաբար կհայտնվի այստեղ՝ բացատրությամբ և կրկնելու հնարավորությամբ։"
          />
        ) : (
          <div className="flex flex-col gap-7">
            {groups.map((g) => (
              <section key={g.subject}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                    <g.Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
                    {localizeSubjectName(g.subject)}
                    <span className="text-sm font-normal text-text-muted">
                      {g.openCount > 0 ? `${g.openCount} բաց` : "ուղղված"}
                    </span>
                  </h2>
                  <Link
                    to={`/mistake-notebook/review?subject=${encodeURIComponent(g.subject)}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Վերանայել ամբողջ առարկան
                    <ArrowRight size={13} strokeWidth={2} />
                  </Link>
                </div>
                <div className="flex flex-col gap-2.5">
                  {g.topics.map((t) => (
                    <TopicRow key={t.topic} subject={g.subject} group={t} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
