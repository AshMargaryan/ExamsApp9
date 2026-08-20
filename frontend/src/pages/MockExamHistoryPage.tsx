import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardList, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getExamAttemptHistory, type MockExamAttempt } from "../api/mockExams";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { cn } from "../lib/cn";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("hy-AM", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MockExamHistoryPage() {
  const { examId } = useParams<{ examId: string }>();
  const [attempts, setAttempts] = useState<MockExamAttempt[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    getExamAttemptHistory(Number(examId)).then(setAttempts).catch(() => setLoadFailed(true));
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Նախորդ փորձերը" back={{ to: "/mock-exams", label: "Ամբողջական թեստեր" }} />
        <ErrorState
          title="Փորձերի պատմությունը չհաջողվեց բեռնել։"
          hint="Արդյունքները պահպանված են — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      </div>
    );
  }

  if (!attempts) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-40" />
        <Skeleton className="mb-[var(--space-6)] h-9 w-2/3" />
        <div className="flex flex-col gap-[var(--space-3)]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  /*
    The endpoint returns newest first. The comparison a student wants — "am I
    getting better at this exam?" — is against the attempt *before* each one,
    so the deltas are computed against the next item in the list.

    The page previously showed a flat list of date / score / raw count with no
    hierarchy and no comparison at all: the date, the least important fact,
    came first and the score sat in the middle of the row. A history page that
    does not show whether you are improving is a log, not a history.
  */
  // `scaled_score` is nullable on the wire (an attempt can be completed
  // before scoring lands), so every comparison goes through this.
  const scoreOf = (a: MockExamAttempt | undefined): number | null =>
    a && a.scaled_score !== null ? a.scaled_score : null;
  const scores = attempts.map(scoreOf).filter((n): n is number => n !== null);
  const best = scores.length > 0 ? Math.max(...scores) : null;
  const latestScore = scoreOf(attempts[0]);
  const previousScore = scoreOf(attempts[1]);
  const latestDelta =
    latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/mock-exams", label: "Ամբողջական թեստեր" }}
        // Was `attempts[0]?.exam.title ?? "Նախորդ պատասխանները"` — so with no
        // attempts the page could not say which exam it was about.
        title={attempts[0]?.exam.title ?? "Նախորդ փորձերը"}
        description={attempts.length > 0 ? `${attempts.length} ավարտված փորձ` : undefined}
      />

      {attempts.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} strokeWidth={1.5} aria-hidden />}
          title="Դեռ ավարտված փորձեր չկան։"
          hint="Առաջին փորձից հետո այստեղ կտեսնես, թե ինչպես է փոխվում միավորդ։"
        />
      ) : (
        <>
          <div className="mb-[var(--space-6)] grid grid-cols-3 gap-[var(--space-3)]">
            <StatTile label="Լավագույն" value={best === null ? "—" : String(best)} />
            <StatTile label="Վերջին" value={latestScore === null ? "—" : String(latestScore)} />
            <StatTile
              label="Փոփոխություն"
              value={latestDelta === null ? "—" : `${latestDelta > 0 ? "+" : ""}${Math.round(latestDelta * 100) / 100}`}
              tone={latestDelta === null || Math.abs(latestDelta) < 0.01 ? undefined : latestDelta > 0 ? "correct" : "incorrect"}
            />
          </div>

          <ul className="flex flex-col gap-[var(--space-2)]">
            {attempts.map((a, i) => {
              const score = scoreOf(a);
              const prevScore = scoreOf(attempts[i + 1]);
              const delta = score !== null && prevScore !== null ? score - prevScore : null;
              const isBest = score !== null && best !== null && score === best && best > 0;
              const DeltaIcon = delta === null || Math.abs(delta) < 0.01 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
              return (
                <li key={a.id}>
                  <Link
                    to={`/mock-exams/attempt/${a.id}/results`}
                    className={cn(
                      "flex items-center gap-[var(--space-4)] rounded-[var(--radius-lg)] border bg-surface",
                      "px-[var(--space-4)] py-[var(--space-3)] transition-colors hover:border-primary",
                      isBest ? "border-primary" : "border-border",
                    )}
                  >
                    {/* The score leads: it is what the row is about. */}
                    <span className="flex shrink-0 items-baseline gap-1">
                      <span className="text-[length:var(--text-2xl)] font-semibold tabular-nums text-text">
                        {score ?? "—"}
                      </span>
                      <span className="text-[length:var(--text-sm)] text-text-muted">/ 20</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[length:var(--text-sm)] tabular-nums text-text">
                        {a.raw_score} / {a.exam.question_count} ճիշտ
                      </span>
                      <span className="block truncate text-[length:var(--text-xs)] text-text-muted">
                        {formatDate(a.completed_at)}
                      </span>
                    </span>
                    {isBest && (
                      <span className="shrink-0 rounded-full border border-primary px-2 py-0.5 text-[length:var(--text-xs)] font-medium text-primary">
                        Լավագույն
                      </span>
                    )}
                    {delta !== null && (
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 text-[length:var(--text-sm)] tabular-nums",
                          Math.abs(delta) < 0.01
                            ? "text-text-muted"
                            : delta > 0
                              ? "text-correct"
                              : "text-incorrect",
                        )}
                        aria-label={`Նախորդի համեմատ՝ ${delta > 0 ? "+" : ""}${Math.round(delta * 100) / 100}`}
                      >
                        {/* Direction is an icon as well as a colour, so the
                            comparison survives greyscale. */}
                        <DeltaIcon size={14} strokeWidth={2} aria-hidden />
                        {Math.abs(delta) < 0.01 ? "0" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100) / 100}`}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-[var(--space-6)] text-center">
            <LinkButton to="/mock-exams">Ամբողջական թեստեր</LinkButton>
          </div>
        </>
      )}
    </div>
  );
}
