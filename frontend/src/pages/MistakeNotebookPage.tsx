import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listMistakes, type MistakeEntry, type MistakeSource } from "../api/mistakes";
import { MistakeRetryPanel } from "../components/mistakes/MistakeRetryPanel";
import { MathText } from "../components/MathText";

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

function groupBySubject(entries: MistakeEntry[]): [string, MistakeEntry[]][] {
  const groups = new Map<string, MistakeEntry[]>();
  for (const entry of entries) {
    const key = entry.subject_name || "Այլ";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return Array.from(groups.entries());
}

function MistakeCard({ entry }: { entry: MistakeEntry }) {
  const [retrying, setRetrying] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(entry.last_retry_correct);
  const [retryCount, setRetryCount] = useState(entry.retry_count);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
        <span>
          {SOURCE_LABEL[entry.source]}
          {entry.topic_label && ` · ${entry.topic_label}`}
        </span>
        <span>{new Date(entry.created_at).toLocaleString("hy-AM")}</span>
      </div>

      <p className="mb-3 text-lg text-text">
        <MathText text={entry.question_text} />
      </p>

      <div className="mb-1 text-sm text-incorrect">
        Ձեր պատասխանը՝ <MathText text={entry.your_answer_text} />
      </div>
      <div className="mb-2 text-sm text-correct">
        Ճիշտ պատասխանը՝ <MathText text={entry.correct_answer_text} />
      </div>

      {entry.explanation && (
        <p className="mb-2 text-sm text-text-muted">
          <MathText text={entry.explanation} />
        </p>
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
      <Link to="/" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Գլխավոր
      </Link>
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
