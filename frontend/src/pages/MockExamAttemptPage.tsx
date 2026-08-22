import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Flag, Sparkles } from "lucide-react";
import {
  getAttempt, saveDraft, finishAttempt, formatSeconds, markHintViewed, DIFFICULTY_LABELS,
  type AnswerInput, type MockExamQuestion, type AttemptDetail,
} from "../api/mockExams";
import { HintButton } from "../components/HintButton";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState } from "../components/ui/ErrorState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import { ExamTimer } from "../components/mockexam/ExamTimer";
import { QuestionNavigator, type QuestionNavState } from "../components/mockexam/QuestionNavigator";
import { QuestionText } from "../components/QuestionText";
import { QuestionFigure } from "../components/QuestionFigure";
import { cn } from "../lib/cn";
import { scrollToElement } from "../lib/scrollToElement";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { MatchingQuestion } from "../components/questions/MatchingQuestion";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";

const AUTOSAVE_INTERVAL_MS = 30_000;

// Height of the sticky control bar (controls row + progress row), so a
// question jumped to from the navigator is not hidden behind it.
const STICKY_HEADER_OFFSET = 120;

// Builds the answer-options block sent to the AI so it can discuss the
// actual choices the student is looking at. Deliberately omits is_correct /
// is_true / match_target — the exam is still in progress and unsubmitted,
// so the AI must never be able to hand back which option is right.
function formatChoicesForAi(q: MockExamQuestion): string {
  if (q.question_type === "single_choice" && q.choices.length) {
    return "Պատասխանի տարբերակներ.\n" + q.choices.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  }
  if (q.question_type === "multi_statement" && q.statements.length) {
    return "Պնդումներ.\n" + q.statements.map((s) => `${s.label}. ${s.text}`).join("\n");
  }
  if (q.question_type === "matching" && (q.statements.length || q.choices.length)) {
    const left = q.statements.map((s) => `${s.label}. ${s.text}`).join("; ");
    const right = q.choices.map((c) => `${c.order}. ${c.text}`).join("; ");
    return `Ձախ սյունակ. ${left}\nԱջ սյունակ. ${right}`;
  }
  return "";
}

// Remembers, per attempt, whether the student wants the floating AI
// assistant available while taking this specific test.
const aiChoiceKey = (attemptId: number) => `mockexam_ai_choice_${attemptId}`;

interface AnswerState {
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
  match_pairs?: Record<number, number>;
}

export function MockExamAttemptPage() {
  useStudyActivityTracker();

  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const id = Number(attemptId);

  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [draftToast, setDraftToast] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [attemptToken, setAttemptToken] = useState(0);
  const { askAboutQuestion, assistantSuppressed, setAssistantSuppressed } = useAssistantLaunch();

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    let active = true;
    setLoadError(false);
    getAttempt(id)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setRemainingSeconds(d.remaining_seconds);
        const initial: Record<number, AnswerState> = {};
        for (const q of d.questions) {
          const saved = d.answers[q.id];
          if (saved) {
            initial[q.id] = {
              selected_choice_id: saved.selected_choice_id ?? undefined,
              answer_text: saved.answer_text,
              selected_statement_ids: saved.selected_statement_ids,
              match_pairs: saved.match_pairs,
            };
          }
        }
        setAnswers(initial);
      })
      // A failed load used to leave "Բեռնվում է..." on screen permanently —
      // during an exam, with no explanation and no way back.
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [id, attemptToken]);

  function toggleFlag(questionId: number) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function jumpToQuestion(index: number) {
    const q = detail?.questions[index];
    if (!q) return;
    // Clear the sticky exam control bar, or the jumped-to question lands underneath it.
    scrollToElement(questionRefs.current[q.id], STICKY_HEADER_OFFSET);
  }

  // Apply the AI on/off choice the student made on the exam setup screen.
  useEffect(() => {
    if (!detail) return;
    setAssistantSuppressed(localStorage.getItem(aiChoiceKey(id)) === "no");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, id]);

  // Restore the floating assistant for the rest of the app once the
  // student leaves this attempt, regardless of what they chose here.
  useEffect(() => () => setAssistantSuppressed(false), [setAssistantSuppressed]);

  function buildAnswerInputs(): AnswerInput[] {
    if (!detail) return [];
    return detail.questions.map((q) => ({
      question_id: q.id,
      ...answersRef.current[q.id],
    }));
  }

  const doSaveDraft = useCallback(async (silent: boolean) => {
    if (!detail) return;
    await saveDraft(id, buildAnswerInputs(), remainingRef.current);
    if (!silent) {
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, detail]);

  const doFinish = useCallback(async () => {
    setBusy(true);
    setFinishError(null);
    try {
      await finishAttempt(id, buildAnswerInputs());
      localStorage.removeItem(aiChoiceKey(id));
      navigate(`/mock-exams/attempt/${id}/results`);
    } catch (err) {
      // Attempt was already finished elsewhere (e.g. the timer auto-submitted
      // it right as the student also clicked Ավարտել) — the result already
      // exists, so just go look at it instead of showing an error.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        navigate(`/mock-exams/attempt/${id}/results`);
        return;
      }
      setFinishError("Չհաջողվեց ավարտել թեստը։ Փորձիր կրկին։");
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, detail]);

  // Exit to the main menu, saving the current answers as a resumable draft.
  const handleExit = useCallback(async () => {
    setBusy(true);
    try {
      await doSaveDraft(true);
    } catch {
      // Ignore save errors — the periodic autosave has most likely persisted
      // the latest answers; still let the user leave.
    } finally {
      navigate("/");
    }
  }, [doSaveDraft, navigate]);

  /*
    Leaving a timed exam is not the same as leaving a page: the clock keeps
    running. The old exit button explained that only through a `title`
    tooltip, which a touch device never shows at all, so on a phone this was
    an unlabelled one-tap exit from a live exam.
  */
  function handleExitClick() {
    if (detail?.attempt.duration_minutes !== null && (remainingSeconds ?? 0) > 0) {
      setShowExitConfirm(true);
    } else {
      void handleExit();
    }
  }

  /*
    Countdown ticker (timed exams only).

    `expired` is deliberately separate from the tick. A student who starts a
    120-minute exam, closes the tab, and comes back two days later used to
    have the attempt submitted the instant the page mounted — the ticker saw
    remaining <= 1, called doFinish(), and they landed on a 0/20 result page
    with no explanation of what had just happened to them. Time running out
    is a legitimate rule, but it has to be *told* to the student rather than
    executed silently on arrival. Arriving late now shows the expiry notice
    below; only a clock that runs out while they are actually sitting there
    auto-submits.
  */
  const alreadyExpired =
    detail !== null &&
    detail.attempt.duration_minutes !== null &&
    (detail.remaining_seconds ?? 0) <= 0;

  useEffect(() => {
    if (!detail || detail.attempt.duration_minutes === null || alreadyExpired) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          doFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [detail, doFinish, alreadyExpired]);

  // Autosave.
  useEffect(() => {
    if (!detail) return;
    const interval = setInterval(() => doSaveDraft(true), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detail, doSaveDraft]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <ErrorState
          title="Չհաջողվեց բացել թեստը։"
          hint="Պատասխաններդ պահպանված են։ Ստուգիր կապը և փորձիր կրկին։"
          onRetry={() => setAttemptToken((n) => n + 1)}
        />
      </div>
    );
  }

  if (detail && alreadyExpired) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <h1 className="font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold text-text">
          {detail.attempt.exam.title}
        </h1>
        <div className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-accent-line bg-accent-bg p-[var(--space-6)]">
          <p className="font-display text-[length:var(--text-lg)] font-semibold text-text">
            Այս թեստի ժամանակը սպառվել է։
          </p>
          <p className="mt-[var(--space-2)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
            Թեստը սահմանափակված էր {detail.attempt.duration_minutes} րոպեով, և այդ ժամանակը լրացել է,
            քանի դեռ բաց չէիր այս էջը։ Պահպանված պատասխաններդ հաշվարկվել են։
          </p>
          <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
            <Button onClick={() => navigate(`/mock-exams/attempt/${id}/results`)}>
              Տեսնել արդյունքը
            </Button>
            <Button variant="secondary" onClick={() => navigate("/mock-exams")}>
              Բոլոր թեստերը
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <LoadingRegion className="flex flex-col gap-[var(--space-6)]">
          <Skeleton className="h-12 w-full" />
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

  const { attempt, questions } = detail;

  function setAnswer(questionId: number, value: AnswerState) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function isAnswered(a: AnswerState | undefined): boolean {
    return Boolean(
      a && (a.selected_choice_id || a.answer_text || a.selected_statement_ids?.length || (a.match_pairs && Object.keys(a.match_pairs).length))
    );
  }

  const unansweredCount = questions.filter((q) => !isAnswered(answers[q.id])).length;

  function handleAskAi(q: MockExamQuestion) {
    const choicesText = formatChoicesForAi(q);
    askAboutQuestion({
      message: `Բացատրիր ինձ այս հարցը. «${q.text}»${choicesText ? `\n\n${choicesText}` : ""}`,
      educationalContext: {
        subject: attempt.exam.title,
        topic: q.topic,
        difficulty: q.difficulty,
        conversation_mode: "solving_question",
      },
    });
  }

  function handleFinishClick() {
    if (attempt.duration_minutes !== null && (remainingSeconds ?? 0) > 0) {
      setShowFinishConfirm(true);
    } else {
      doFinish();
    }
  }

  const answeredCount = questions.length - unansweredCount;
  const navStates: QuestionNavState[] = questions.map((q) => ({
    answered: isAnswered(answers[q.id]),
    flagged: flagged.has(q.id),
  }));

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      {/*
        The exam control bar.

        The bug this fixes: there used to be TWO buttons on this screen both
        labelled "Ավարտել". The one in this bar called doSaveDraft — it saved
        — and the one at the bottom of the page irreversibly ended the exam.
        In a timed, high-stakes test, the same word meant "save my progress"
        and "hand in my paper" eight hundred pixels apart. The save action is
        now called what it is, and only the finish action is styled as the
        page's primary.
      */}
      <div className="sticky top-0 z-20 -mx-[var(--space-4)] mb-[var(--space-6)] border-b border-border bg-surface/95 px-[var(--space-4)] py-[var(--space-3)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
          <div className="flex min-w-0 items-center gap-[var(--space-2)]">
            <Button variant="ghost" size="sm" onClick={handleExitClick} disabled={busy}>
              ← Դուրս գալ
            </Button>
            <Button variant="secondary" size="sm" onClick={() => doSaveDraft(false)} disabled={busy}>
              Պահպանել
            </Button>
            {draftToast && (
              <span role="status" className="text-[length:var(--text-sm)] text-correct">
                Պահպանված է
              </span>
            )}
          </div>
          <div className="flex items-center gap-[var(--space-3)]">
            {remainingSeconds !== null && <ExamTimer remainingSeconds={remainingSeconds} />}
            <Button size="sm" onClick={handleFinishClick} loading={busy}>
              Ավարտել
            </Button>
          </div>
        </div>

        {/* Progress was only reported as one line of text at the very bottom of
            the page, so a student had to scroll past every question to find
            out how many they had left. */}
        <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-3)]">
          <ProgressBar
            percent={questions.length ? (100 * answeredCount) / questions.length : 0}
            heightClassName="h-1"
            label={`${answeredCount} ${questions.length}-ից պատասխանված`}
          />
          <span className="shrink-0 text-[length:var(--text-xs)] tabular-nums text-text-muted">
            {answeredCount}/{questions.length}
          </span>
        </div>
      </div>

      <h1 className="mb-[var(--space-1)] font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold text-text">
        {attempt.exam.title}
      </h1>
      <p className="mb-[var(--space-6)] text-[length:var(--text-sm)] text-text-muted">
        {questions.length} հարց
      </p>

      <QuestionNavigator states={navStates} onJump={jumpToQuestion} className="mb-[var(--space-6)]" />

      <div className="flex flex-col gap-[var(--space-6)]">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id] ?? {}}
            hintsEnabled={attempt.hints_enabled}
            aiEnabled={!assistantSuppressed}
            flagged={flagged.has(q.id)}
            onToggleFlag={() => toggleFlag(q.id)}
            registerRef={(el) => {
              questionRefs.current[q.id] = el;
            }}
            onChange={(value) => setAnswer(q.id, value)}
            onAskAi={() => handleAskAi(q)}
          />
        ))}
      </div>

      <div className="mt-[var(--space-7)] flex flex-col items-end gap-[var(--space-2)] border-t border-border pt-[var(--space-5)]">
        {unansweredCount > 0 && (
          <p className="text-[length:var(--text-sm)] text-text-muted">
            {unansweredCount} հարց դեռ չպատասխանված է — կհաշվվի որպես բաց թողնված, ոչ թե սխալ։
          </p>
        )}
        {finishError && (
          <p role="alert" className="text-[length:var(--text-sm)] text-incorrect">
            {finishError}
          </p>
        )}
        <Button size="lg" onClick={handleFinishClick} loading={busy}>
          Ավարտել թեստը
        </Button>
      </div>

      <ConfirmDialog
        open={showFinishConfirm}
        onOpenChange={setShowFinishConfirm}
        tone="primary"
        title="Ավարտե՞լ թեստը"
        description={`Դեռ մնում է ${formatSeconds(remainingSeconds ?? 0)}${
          unansweredCount > 0 ? `, և ${unansweredCount} հարց առանց պատասխանի է` : ""
        }։ Ավարտելուց հետո պատասխանները փոխել հնարավոր չէ։`}
        confirmLabel="Այո, ավարտել"
        cancelLabel="Շարունակել թեստը"
        busy={busy}
        onConfirm={() => {
          setShowFinishConfirm(false);
          void doFinish();
        }}
      />

      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        tone="primary"
        title="Դուրս գա՞լ թեստից"
        description="Պատասխաններդ կպահպանվեն և կարող ես շարունակել ավելի ուշ։ Ժամանակը շարունակում է հաշվարկվել։"
        confirmLabel="Պահպանել և դուրս գալ"
        cancelLabel="Մնալ"
        busy={busy}
        onConfirm={() => {
          setShowExitConfirm(false);
          void handleExit();
        }}
      />
    </div>
  );
}

function QuestionCard({
  question, index, answer, hintsEnabled, aiEnabled, flagged, onToggleFlag, registerRef, onChange, onAskAi,
}: {
  question: MockExamQuestion;
  index: number;
  answer: AnswerState;
  hintsEnabled: boolean;
  aiEnabled: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
  onChange: (value: AnswerState) => void;
  onAskAi: () => void;
}) {
  return (
    <div
      ref={registerRef}
      className={cn(
        "scroll-mt-32 rounded-[var(--radius-lg)] border bg-surface p-[var(--space-5)] transition-colors",
        flagged ? "border-accent-line" : "border-border",
      )}
    >
      <div className="mb-[var(--space-3)] flex items-center justify-between gap-[var(--space-3)]">
        <div className="flex min-w-0 items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted">
          <span>{DIFFICULTY_LABELS[question.difficulty]}</span>
          {question.topic && <span className="truncate">· {question.topic}</span>}
        </div>
        {/* Marking a question to come back to is the one thing every paper
            exam lets you do and this runner did not. */}
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={cn(
            "inline-flex shrink-0 items-center gap-[var(--space-1)] rounded-[var(--radius-md)] px-[var(--space-2)] py-[var(--space-1)]",
            "text-[length:var(--text-xs)] font-medium transition-colors",
            flagged
              ? "bg-accent-bg text-accent"
              : "text-text-muted hover:bg-surface-muted hover:text-text",
          )}
        >
          <Flag size={13} strokeWidth={2.25} aria-hidden />
          {flagged ? "Նշված" : "Նշել"}
        </button>
      </div>
      <QuestionText text={question.text} index={index} />

      <QuestionFigure svg={question.figure_svg} />

      {question.question_type === "single_choice" && (
        <MultipleChoiceQuestion
          choices={question.choices}
          selectedChoiceId={answer.selected_choice_id}
          revealed={false}
          onSelect={(choiceId) => onChange({ selected_choice_id: choiceId })}
        />
      )}

      {question.question_type === "free_response" && (
        <ShortAnswerQuestion
          value={answer.answer_text ?? ""}
          revealed={false}
          onChange={(text) => onChange({ answer_text: text })}
        />
      )}

      {question.question_type === "multi_statement" && (
        <TrueFalseQuestion
          statements={question.statements}
          selectedIds={new Set(answer.selected_statement_ids ?? [])}
          revealed={false}
          showHint={false}
          onToggle={(statementId) => {
            const current = new Set(answer.selected_statement_ids ?? []);
            if (current.has(statementId)) current.delete(statementId);
            else current.add(statementId);
            onChange({ selected_statement_ids: Array.from(current) });
          }}
        />
      )}

      {question.question_type === "matching" && (
        <MatchingQuestion
          leftItems={question.statements}
          rightItems={question.choices}
          value={answer.match_pairs ?? {}}
          revealed={false}
          onChange={(pairs) => onChange({ match_pairs: pairs })}
        />
      )}

      {(hintsEnabled && question.hint) || aiEnabled ? (
        <div className="mt-3 flex items-center gap-4">
          {hintsEnabled && question.hint && (
            <HintButton hint={question.hint} onOpen={() => markHintViewed(question.id)} />
          )}
          {aiEnabled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAskAi}
              iconLeft={<Sparkles size={15} strokeWidth={1.75} />}
              className="border-primary/30 text-primary hover:border-primary hover:bg-primary/10"
            >
              Հարցնել AI-ից
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
