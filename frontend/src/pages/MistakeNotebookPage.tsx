import { useEffect, useState } from "react";
import { HelpCircle, Sparkles, Tag } from "lucide-react";
import { classifyMistake, listMistakes, type ErrorCategory, type MistakeEntry, type MistakeSource } from "../api/mistakes";
import { MistakeRetryPanel } from "../components/mistakes/MistakeRetryPanel";
import { MathText } from "../components/MathText";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { Button } from "../components/ui/Button";
import { LinkButton } from "../components/ui/LinkButton";

const TABS: { key: MistakeSource | "all"; label: string; icon: string }[] = [
  { key: "all", label: "Բոլորը", icon: "📓" },
  { key: "practice", label: "Առարկաներ", icon: "📚" },
  { key: "mock_exam", label: "Ամբողջական թեստեր", icon: "📝" },
  { key: "flashcard", label: "Բառաքարտեր", icon: "🗂️" },
];

const SOURCE_LABEL: Record<MistakeSource, string> = {
  practice: "Առարկաներ",
  mock_exam: "Ամբողջական թեստ",
  flashcard: "Բառաքարտ",
};

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  unclassified: "Դեռ չդասակարգված",
  careless_slip: "Անուշադրության սխալ",
  conceptual_gap: "Հասկացողության բաց",
  process_error: "Սխալ մեթոդ",
  misread_question: "Սխալ ընկալված հարց",
};

const CATEGORY_CLASSES: Record<ErrorCategory, string> = {
  unclassified: "border-border bg-surface-muted text-text-muted",
  careless_slip: "border-primary/40 bg-primary/10 text-primary",
  conceptual_gap: "border-incorrect/40 bg-incorrect/10 text-incorrect",
  process_error: "border-primary/40 bg-primary/10 text-primary",
  misread_question: "border-border bg-surface-muted text-text-muted",
};

// Past-mistake review is already graded, so unlike a live mock exam it's
// safe (and useful) to hand the AI the full answer-options list.
function formatChoicesForAi(renderData: MistakeEntry["render_data"]): string {
  if (renderData.choices?.length) {
    return "Պատասխանի տարբերակներ.\n" + renderData.choices.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  }
  if (renderData.statements?.length) {
    return "Պնդումներ.\n" + renderData.statements.map((s) => `${s.label}. ${s.text}`).join("\n");
  }
  if (renderData.left?.length || renderData.right?.length) {
    const left = (renderData.left ?? []).map((s) => `${s.label}. ${s.text}`).join("; ");
    const right = (renderData.right ?? []).map((c) => `${c.text}`).join("; ");
    return `Ձախ սյունակ. ${left}\nԱջ սյունակ. ${right}`;
  }
  return "";
}

function groupBySubject(entries: MistakeEntry[]): [string, MistakeEntry[]][] {
  const groups = new Map<string, MistakeEntry[]>();
  for (const entry of entries) {
    const key = entry.subject_name || "Այլ";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries());
}

function MistakeCard({ entry: initialEntry }: { entry: MistakeEntry }) {
  const { showError } = useToast();
  const [retrying, setRetrying] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(initialEntry.last_retry_correct);
  const [retryCount, setRetryCount] = useState(initialEntry.retry_count);
  const [entry, setEntry] = useState(initialEntry);
  const [classifying, setClassifying] = useState(false);
  const [classifyFailed, setClassifyFailed] = useState(false);
  const { askAboutQuestion } = useAssistantLaunch();

  async function handleClassify() {
    setClassifying(true);
    setClassifyFailed(false);
    try {
      const updated = await classifyMistake(entry.id);
      setEntry(updated);
      if (updated.classified_at === null) {
        setClassifyFailed(true);
      }
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setClassifying(false);
    }
  }

  function handleAskAi() {
    const hint = entry.classified_at
      ? ` (հավանական պատճառ. ${entry.error_category_display})`
      : "";
    const choicesText = formatChoicesForAi(entry.render_data);
    askAboutQuestion({
      message:
        `Ինչու՞ եմ սխալվել այս հարցում. «${entry.question_text}»: ` +
        `Իմ պատասխանը՝ «${entry.your_answer_text}», ճիշտ պատասխանը՝ «${entry.correct_answer_text}»։${hint}` +
        `${choicesText ? `\n\n${choicesText}` : ""}`,
      educationalContext: {
        subject: entry.subject_name,
        topic: entry.topic_label || undefined,
        conversation_mode: "why_am_i_wrong",
      },
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span className="flex items-center gap-2">
          {SOURCE_LABEL[entry.source]}
          {entry.topic_label && ` · ${entry.topic_label}`}
          {entry.mistake_type === "not_attempted" && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-text-muted">
              Բաց թողնված
            </span>
          )}
        </span>
        <span>{new Date(entry.created_at).toLocaleString("hy-AM")}</span>
      </div>

      <p className="mb-3 text-lg text-text">
        <MathText text={entry.question_text} />
      </p>

      {entry.mistake_type === "not_attempted" ? (
        <div className="mb-1 text-sm text-text-muted">Պատասխան չեք նշել</div>
      ) : (
        <div className="mb-1 text-sm text-incorrect">
          Ձեր պատասխանը՝ <MathText text={entry.your_answer_text} />
        </div>
      )}
      <div className="mb-2 text-sm text-correct">
        Ճիշտ պատասխանը՝ <MathText text={entry.correct_answer_text} />
      </div>

      {entry.explanation && (
        <p className="mb-2 text-sm text-text-muted">
          <MathText text={entry.explanation} />
        </p>
      )}

      {entry.mistake_type !== "not_attempted" && (
        <div className="mb-2">
          {entry.classified_at ? (
            <div className="flex flex-col gap-1.5">
              <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASSES[entry.error_category]}`}>
                <Tag size={11} strokeWidth={1.75} /> {CATEGORY_LABELS[entry.error_category]}
              </span>
              {entry.error_explanation && <p className="text-xs text-text-muted">{entry.error_explanation}</p>}
              <Button variant="ghost" size="sm" onClick={handleAskAi} className="h-7 w-fit px-2 text-xs">
                <Sparkles size={12} strokeWidth={1.75} /> Քննարկել AI-ի հետ
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleClassify} disabled={classifying} className="h-7 px-2 text-xs">
                {classifying ? "Վերլուծվում է..." : (
                  <>
                    <HelpCircle size={12} strokeWidth={1.75} /> Ինչու՞ եմ սխալվել
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleAskAi} className="h-7 px-2 text-xs">
                <Sparkles size={12} strokeWidth={1.75} /> Քննարկել AI-ի հետ
              </Button>
              {classifyFailed && (
                <span className="text-xs text-text-muted">AI-ն այժմ հասանելի չէ, փորձեք ավելի ուշ։</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {entry.retryable && !retrying && (
          <button
            type="button"
            onClick={() => setRetrying(true)}
            className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            🔁 Կրկնել
          </button>
        )}
        {retryCount > 0 && (
          <span className="text-xs text-text-muted">
            Փորձված է {retryCount} անգամ
            {lastCorrect !== null && (
              <> · վերջինը՝ {lastCorrect ? <span className="text-correct">ճիշտ</span> : <span className="text-incorrect">սխալ</span>}</>
            )}
          </span>
        )}
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

export function MistakeNotebookPage() {
  const [tab, setTab] = useState<MistakeSource | "all">("all");
  const [entries, setEntries] = useState<MistakeEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    listMistakes(tab === "all" ? undefined : tab).then(setEntries);
  }, [tab]);

  const groups = entries ? groupBySubject(entries) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/" className="mb-4">← Գլխավոր</LinkButton>
      <h1 className="mb-1 text-3xl font-semibold text-text">📓 Սխալների տետր</h1>
      <p className="mb-6 text-sm text-text-muted">
        Ձեր բոլոր սխալ պատասխանները մեկ տեղում՝ կրկնիր ու ամրապնդիր։
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border text-text hover:border-primary"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {!entries ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
          Այստեղ դեռ սխալներ չկան։ Այնպես պահիր՛ 🎉
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([subject, subjectEntries]) => (
            <div key={subject}>
              <h2 className="mb-3 text-lg font-semibold text-text">
                {subject} <span className="text-sm font-normal text-text-muted">({subjectEntries.length})</span>
              </h2>
              <div className="flex flex-col gap-4">
                {subjectEntries.map((entry) => (
                  <MistakeCard key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
