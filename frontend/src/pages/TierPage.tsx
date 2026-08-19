import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Check } from "lucide-react";
import {
  getTierQuestions, submitTier, revealTier, markHintViewed,
  TIER_LABELS, MATH_SUBJECT_NAME,
  type Question, type Tier, type AnswerInput, type SubmitResult,
} from "../api/practice";
import { HintButton } from "../components/HintButton";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { MathText } from "../components/MathText";
import { ScoreModal } from "../components/ScoreModal";
import { SpeakOnSelect } from "../components/SpeakOnSelect";
import { ClozeChoiceQuestion } from "../components/questions/ClozeChoiceQuestion";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { cn } from "../lib/cn";

const TIER_ORDER: Tier[] = ["easy", "medium", "hard"];

interface AnswerState {
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
}

function isAnswered(answer: AnswerState | undefined): boolean {
  if (!answer) return false;
  if (answer.selected_choice_id !== undefined) return true;
  if (answer.answer_text !== undefined && answer.answer_text.trim() !== "") return true;
  if (answer.selected_statement_ids && answer.selected_statement_ids.length > 0) return true;
  return false;
}

/*
  Answers are kept in sessionStorage per (subtopic, tier) so that closing the
  tab, following a link to the AI assistant, or a phone backgrounding the app
  mid-exercise does not silently discard work in progress (§40). Cleared as
  soon as the set is submitted, so a re-attempt always starts clean.
*/
function storageKey(subtopicId: number, tier: string): string {
  return `haygit:practice-draft:${subtopicId}:${tier}`;
}

function loadDraft(subtopicId: number, tier: string): Record<number, AnswerState> {
  try {
    const raw = sessionStorage.getItem(storageKey(subtopicId, tier));
    return raw ? (JSON.parse(raw) as Record<number, AnswerState>) : {};
  } catch {
    return {};
  }
}

export function TierPage() {
  const { subtopicId, tier } = useParams<{ subtopicId: string; tier: Tier }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navBackState = location.state as { subtopicName?: string; subjectId?: number } | null;
  const subtopicName = navBackState?.subtopicName;
  const subjectId = navBackState?.subjectId;
  const practiceHref = subjectId ? `/practice/${subjectId}` : "/practice";

  const id = Number(subtopicId);
  const tierKey = tier as Tier;

  const fetchQuestions = useCallback(() => getTierQuestions(id, tierKey), [id, tierKey]);
  const { data: questions, isLoading, error, retry } = useAsyncResource(fetchQuestions, [id, tierKey]);

  const [answers, setAnswers] = useState<Record<number, AnswerState>>(() => loadDraft(id, String(tier)));
  const [revealedMap, setRevealedMap] = useState<Record<number, Question> | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { askAboutQuestion } = useAssistantLaunch();

  // A different subtopic/tier is a different exercise: drop the previous one's
  // answers and results rather than carrying them across.
  useEffect(() => {
    setAnswers(loadDraft(id, String(tier)));
    setRevealedMap(null);
    setShowExplanations(false);
    setSubmitResult(null);
    setShowScoreModal(false);
  }, [id, tier]);

  useEffect(() => {
    if (submitResult) return;
    try {
      sessionStorage.setItem(storageKey(id, String(tier)), JSON.stringify(answers));
    } catch {
      // A full or unavailable sessionStorage must never break the exercise.
    }
  }, [answers, id, tier, submitResult]);

  const revealed = revealedMap !== null;
  const currentIndex = TIER_ORDER.indexOf(tierKey);
  const nextTier = TIER_ORDER[currentIndex + 1];
  const isMath = questions?.[0]?.subject_name === MATH_SUBJECT_NAME;

  const answeredCount = useMemo(
    () => (questions ?? []).filter((q) => isAnswered(answers[q.id])).length,
    [questions, answers],
  );
  const total = questions?.length ?? 0;
  const allAnswered = total > 0 && answeredCount === total;

  function buildAnswerInputs(): AnswerInput[] {
    return (questions ?? []).map((q) => ({
      question_id: q.id,
      ...answers[q.id],
    }));
  }

  async function doSubmit(): Promise<SubmitResult> {
    const result = await submitTier(id, tierKey, buildAnswerInputs(), revealed);
    setSubmitResult(result);
    try {
      sessionStorage.removeItem(storageKey(id, String(tier)));
    } catch {
      // ignore
    }
    return result;
  }

  async function runCheck() {
    setBusy(true);
    try {
      await doSubmit();
      const data = await revealTier(id, tierKey);
      const map: Record<number, Question> = {};
      for (const q of data) map[q.id] = q;
      setRevealedMap(map);
      // The point of practice is learning from the mistakes, so explanations
      // are opened with the result rather than hidden behind a second click.
      setShowExplanations(true);
      setShowScoreModal(true);
    } finally {
      setBusy(false);
    }
  }

  function handleCheck() {
    if (!allAnswered) {
      setConfirmIncomplete(true);
      return;
    }
    void runCheck();
  }

  function handleAskAi(q: Question) {
    askAboutQuestion({
      message: `Բացատրիր ինձ այս հարցը. «${q.text}»`,
      educationalContext: {
        question_id: q.id,
        subject: q.subject_name,
        topic: q.topic_name,
        subtopic: q.subtopic_name,
        difficulty: q.tier,
        conversation_mode: "solving_question",
      },
    });
  }

  function handleModalContinue() {
    setShowScoreModal(false);
    if (nextTier) {
      navigate(`/practice/subtopic/${id}/${nextTier}`, { state: { subtopicName, subjectId } });
    } else {
      navigate(practiceHref);
    }
  }

  const header = (
    <PageHeader
      eyebrow={`${TIER_LABELS[tierKey]} մակարդակ`}
      title={subtopicName ?? "Վարժություններ"}
      back={{ to: `/practice/subtopic/${id}`, label: "Ենթաթեմա" }}
    />
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        {header}
        <LoadingRegion className="flex flex-col gap-[var(--space-6)]">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
              <Skeleton className="h-5 w-3/4" />
              <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-2)]">
                {Array.from({ length: 4 }, (_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </div>
          ))}
        </LoadingRegion>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        {header}
        <ErrorState
          title="Չհաջողվեց բեռնել հարցերը։"
          hint="Պատասխաններդ չեն կորել։ Ստուգիր կապը և փորձիր կրկին։"
          onRetry={retry}
        />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        {header}
        <ErrorState
          title="Այս մակարդակի հարցերը դեռ պատրաստ չեն։"
          hint="Փորձիր մեկ այլ մակարդակ կամ ենթաթեմա։"
          retryLabel="Վերադառնալ ենթաթեմային"
          onRetry={() => navigate(`/practice/subtopic/${id}`)}
        />
      </div>
    );
  }

  const questionCards = (
    <div className="flex flex-col gap-[var(--space-6)]">
      {questions.map((q, idx) => {
        const revealedQ = revealedMap?.[q.id];
        const answer = answers[q.id] ?? {};
        const answered = isAnswered(answer);
        const isCloze = q.question_type === "multiple_choice" && q.text.includes("_____");

        return (
          <div
            key={q.id}
            className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]"
          >
            {/* The question number carries whether this one is answered yet, so
                a student scanning back up the page can see what they skipped
                without re-reading every question. */}
            <div className="mb-[var(--space-4)] flex items-center gap-[var(--space-2)]">
              <span
                className={cn(
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[length:var(--text-xs)] font-semibold",
                  answered || revealed
                    ? "bg-primary text-primary-contrast"
                    : "border border-dashed border-border text-text-muted",
                )}
              >
                {idx + 1}
              </span>
              {!answered && !revealed && (
                <span className="text-[length:var(--text-xs)] text-text-muted">Դեռ չպատասխանված</span>
              )}
            </div>

            {q.passage && (
              <div className="mb-[var(--space-4)] rounded-[var(--radius-md)] bg-surface-muted p-[var(--space-4)] text-[length:var(--text-base)] leading-[var(--leading-relaxed)] whitespace-pre-line text-text">
                <MathText text={q.passage} />
              </div>
            )}

            {!isCloze && (
              <p className="mb-[var(--space-4)] max-w-[var(--measure-base)] text-[length:var(--text-lg)] leading-[var(--leading-snug)] font-medium text-text">
                <MathText text={q.text} allowInsert={isMath} />
              </p>
            )}

            {isCloze ? (
              <ClozeChoiceQuestion
                index={idx + 1}
                text={q.text}
                choices={revealedQ?.choices ?? q.choices}
                selectedChoiceId={answer.selected_choice_id}
                revealed={revealed}
                onSelect={(choiceId) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: { selected_choice_id: choiceId } }))
                }
              />
            ) : (
              q.question_type === "multiple_choice" && (
                <MultipleChoiceQuestion
                  choices={revealedQ?.choices ?? q.choices}
                  selectedChoiceId={answer.selected_choice_id}
                  revealed={revealed}
                  onSelect={(choiceId) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: { selected_choice_id: choiceId } }))
                  }
                />
              )
            )}

            {q.question_type === "short_answer" && (
              <ShortAnswerQuestion
                value={answer.answer_text ?? ""}
                revealed={revealed}
                correctAnswerText={revealedQ?.correct_answer_text}
                onChange={(text) => setAnswers((prev) => ({ ...prev, [q.id]: { answer_text: text } }))}
              />
            )}

            {q.question_type === "true_false" && (
              <TrueFalseQuestion
                statements={revealedQ?.statements ?? q.statements}
                selectedIds={new Set(answer.selected_statement_ids ?? [])}
                revealed={revealed}
                onToggle={(statementId) =>
                  setAnswers((prev) => {
                    const current = new Set(prev[q.id]?.selected_statement_ids ?? []);
                    if (current.has(statementId)) current.delete(statementId);
                    else current.add(statementId);
                    return { ...prev, [q.id]: { selected_statement_ids: Array.from(current) } };
                  })
                }
                onHintOpen={() => markHintViewed(q.id)}
              />
            )}

            <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-3)]">
              <HintButton hint={q.hint ?? ""} onOpen={() => markHintViewed(q.id)} />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAskAi(q)}
                iconLeft={<Sparkles size={15} strokeWidth={1.75} />}
              >
                Հարցնել AI-ից
              </Button>
            </div>

            {revealed && showExplanations && revealedQ?.explanation && (
              <div className="mt-[var(--space-4)] rounded-[var(--radius-md)] border-l-2 border-primary bg-surface-muted p-[var(--space-4)] text-[length:var(--text-sm)] leading-[var(--leading-body)] whitespace-pre-line text-text-muted">
                <MathText text={revealedQ.explanation} allowInsert={isMath} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const scorePercent = submitResult && submitResult.total > 0
    ? Math.round((100 * submitResult.correct_count) / submitResult.total)
    : 0;

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)] pb-[var(--space-10)]">
      {header}

      {/*
        Progress was invisible before: the page showed a list of cards with no
        indication of how many questions there were or how many were done, so
        the student could not tell how much was left without scrolling to the
        bottom and counting.
      */}
      {!revealed && (
        <div className="mb-[var(--space-6)]">
          <div className="mb-[var(--space-2)] flex items-baseline justify-between gap-[var(--space-3)]">
            <span className="text-[length:var(--text-sm)] text-text-muted">
              {answeredCount} / {total} պատասխանված
            </span>
            {!allAnswered && (
              <span className="text-[length:var(--text-sm)] text-text-muted">
                Մնաց {total - answeredCount}
              </span>
            )}
          </div>
          <ProgressBar
            percent={total > 0 ? (100 * answeredCount) / total : 0}
            heightClassName="h-1.5"
            label={`${answeredCount} ${total}-ից պատասխանված`}
          />
        </div>
      )}

      {submitResult && (
        <div
          className="mb-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border p-[var(--space-4)]"
          style={{
            borderColor: `color-mix(in srgb, var(--color-${scorePercent >= 80 ? "correct" : scorePercent >= 50 ? "medium" : "incorrect"}) 40%, transparent)`,
            backgroundColor: `color-mix(in srgb, var(--color-${scorePercent >= 80 ? "correct" : scorePercent >= 50 ? "medium" : "incorrect"}) 8%, var(--color-surface))`,
          }}
        >
          <span className="text-[length:var(--text-lg)] font-semibold text-text">
            {submitResult.correct_count} / {submitResult.total} ճիշտ
          </span>
          {submitResult.attempt.revealed_answers && (
            <span className="text-[length:var(--text-sm)] text-text-muted">
              (չի հաշվվում՝ պատասխանները դիտված են)
            </span>
          )}
        </div>
      )}

      {isMath ? questionCards : <SpeakOnSelect>{questionCards}</SpeakOnSelect>}

      {/*
        One primary action at a time.

        Before, this row held two identically-weighted `bg-primary` buttons —
        "Ստուգել" and "Հաջորդը →" — and "Հաջորդը" did not advance to a next
        question at all: it silently submitted the whole set and scored it. A
        student who had answered two of five and expected to move on instead
        ended the exercise. There is now one primary button whose label says
        what it does, and the destructive reading of "next" is gone.
      */}
      <div className="mt-[var(--space-7)] flex flex-wrap items-center gap-[var(--space-3)] border-t border-border pt-[var(--space-5)]">
        {!revealed ? (
          <>
            <Button type="button" onClick={handleCheck} loading={busy} iconLeft={<Check size={16} strokeWidth={2} />}>
              Ստուգել պատասխանները
            </Button>
            {!allAnswered && (
              <span className="text-[length:var(--text-sm)] text-text-muted">
                {total - answeredCount} հարց դեռ առանց պատասխանի
              </span>
            )}
          </>
        ) : (
          <>
            <Button type="button" onClick={() => setShowScoreModal(true)}>
              {nextTier ? `Անցնել ${TIER_LABELS[nextTier]} մակարդակին` : "Վերադառնալ ենթաթեմային"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowExplanations((v) => !v)}
            >
              {showExplanations ? "Թաքցնել բացատրությունները" : "Ցույց տալ բացատրությունները"}
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmIncomplete}
        onOpenChange={setConfirmIncomplete}
        tone="primary"
        title="Ստուգե՞լ առանց բոլոր պատասխանների"
        description={`${total - answeredCount} հարց դեռ առանց պատասխանի է։ Չպատասխանվածները կհաշվվեն սխալ։`}
        confirmLabel="Այո, ստուգել"
        cancelLabel="Վերադառնալ"
        busy={busy}
        onConfirm={() => {
          setConfirmIncomplete(false);
          void runCheck();
        }}
      />

      {showScoreModal && submitResult && (
        <ScoreModal
          correctCount={submitResult.correct_count}
          total={submitResult.total}
          continueLabel={nextTier ? `Անցնել ${TIER_LABELS[nextTier]} մակարդակին` : "Վերադառնալ ցանկին"}
          onContinue={handleModalContinue}
          onClose={() => setShowScoreModal(false)}
        />
      )}
    </div>
  );
}
