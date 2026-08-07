import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  getTierQuestions, submitTier, revealTier,
  TIER_LABELS, MATH_SUBJECT_NAME,
  type Question, type Tier, type AnswerInput, type SubmitResult,
} from "../api/practice";
import { HintButton } from "../components/HintButton";
import { MathText } from "../components/MathText";
import { ScoreModal } from "../components/ScoreModal";
import { SpeakOnSelect } from "../components/SpeakOnSelect";
import { ClozeChoiceQuestion } from "../components/questions/ClozeChoiceQuestion";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { ToolsDock } from "../components/ToolsDock";
import { NotepadProvider } from "../context/NotepadContext";

const TIER_ORDER: Tier[] = ["easy", "medium", "hard"];

interface AnswerState {
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
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

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [revealedMap, setRevealedMap] = useState<Record<number, Question> | null>(null);
  const [showExplanations, setShowExplanations] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQuestions(null);
    setAnswers({});
    setRevealedMap(null);
    setShowExplanations(false);
    setSubmitResult(null);
    setShowScoreModal(false);
    getTierQuestions(id, tier as Tier).then(setQuestions);
  }, [id, tier]);

  if (!questions) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const revealed = revealedMap !== null;
  const currentIndex = TIER_ORDER.indexOf(tier as Tier);
  const nextTier = TIER_ORDER[currentIndex + 1];
  const isMath = questions[0]?.subject_name === MATH_SUBJECT_NAME;

  function buildAnswerInputs(): AnswerInput[] {
    return questions!.map((q) => ({
      question_id: q.id,
      ...answers[q.id],
    }));
  }

  async function doSubmit(): Promise<SubmitResult> {
    const result = await submitTier(id, tier as Tier, buildAnswerInputs(), revealed);
    setSubmitResult(result);
    return result;
  }

  async function handleCheck() {
    setBusy(true);
    try {
      await doSubmit();
      const data = await revealTier(id, tier as Tier);
      const map: Record<number, Question> = {};
      for (const q of data) map[q.id] = q;
      setRevealedMap(map);
      setShowScoreModal(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    setBusy(true);
    try {
      if (!submitResult) await doSubmit();
      setShowScoreModal(true);
    } finally {
      setBusy(false);
    }
  }

  function handleModalContinue() {
    setShowScoreModal(false);
    if (nextTier) {
      navigate(`/practice/subtopic/${id}/${nextTier}`, { state: { subtopicName, subjectId } });
    } else {
      navigate(practiceHref);
    }
  }

  const questionCards = (
    <div className="flex flex-col gap-6">
      {questions.map((q, idx) => {
          const revealedQ = revealedMap?.[q.id];
          const answer = answers[q.id] ?? {};

          const isCloze = q.question_type === "multiple_choice" && q.text.includes("_____");

          return (
            <div key={q.id} className="rounded-[var(--radius)] border border-border bg-surface p-6">
              {q.passage && (
                <div className="mb-4 rounded-md bg-surface-muted p-4 text-lg leading-relaxed italic whitespace-pre-line text-text">
                  <MathText text={q.passage} />
                </div>
              )}

              {!isCloze && (
                <p className="mb-4 text-xl font-medium text-text">
                  {idx + 1}. <MathText text={q.text} allowInsert={isMath} />
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
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { selected_choice_id: choiceId },
                    }))
                  }
                />
              ) : (
                q.question_type === "multiple_choice" && (
                  <MultipleChoiceQuestion
                    choices={revealedQ?.choices ?? q.choices}
                    selectedChoiceId={answer.selected_choice_id}
                    revealed={revealed}
                    onSelect={(choiceId) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: { selected_choice_id: choiceId },
                      }))
                    }
                  />
                )
              )}

              {q.question_type === "short_answer" && (
                <ShortAnswerQuestion
                  value={answer.answer_text ?? ""}
                  revealed={revealed}
                  correctAnswerText={revealedQ?.correct_answer_text}
                  onChange={(text) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { answer_text: text },
                    }))
                  }
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
                      return {
                        ...prev,
                        [q.id]: { selected_statement_ids: Array.from(current) },
                      };
                    })
                  }
                />
              )}

              <div className="mt-3">
                <HintButton hint={q.hint ?? ""} />
              </div>

              {revealed && showExplanations && revealedQ?.explanation && (
                <div className="mt-3 rounded-md bg-surface-muted p-4 text-base leading-relaxed text-text-muted whitespace-pre-line">
                  <MathText text={revealedQ.explanation} allowInsert={isMath} />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  return (
    <NotepadProvider>
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to={practiceHref} className="text-sm text-primary hover:underline">
        ← Վերադառնալ ցանկին
      </Link>

      <h1 className="mt-2 mb-1 text-3xl font-semibold text-text">
        {subtopicName ?? `Ենթաթեմա #${id}`}
      </h1>
      <p className="mb-6 text-lg text-text-muted">{TIER_LABELS[tier as Tier]} մակարդակ</p>

      {submitResult && (
        <div className="mb-6 rounded-md border border-primary bg-surface-muted px-4 py-3 text-lg text-text">
          Արդյունք՝ {submitResult.correct_count} / {submitResult.total} ճիշտ
          {submitResult.attempt.revealed_answers && (
            <span className="ml-2 text-sm text-text-muted">(չի հաշվվում՝ պատասխանները դիտված են)</span>
          )}
        </div>
      )}

      {isMath ? questionCards : <SpeakOnSelect>{questionCards}</SpeakOnSelect>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={busy}
          className="rounded-md bg-primary px-5 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          Ստուգել
        </button>

        {revealed && (
          <button
            type="button"
            onClick={() => setShowExplanations(true)}
            className="rounded-md border border-border px-5 py-2 font-medium text-text transition-colors hover:border-primary"
          >
            Ցույց տալ բացատրությունները
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={busy}
          className="ml-auto rounded-md bg-accent px-5 py-2 font-medium text-primary-contrast transition-colors disabled:opacity-60"
        >
          Հաջորդը →
        </button>
      </div>

      {showScoreModal && submitResult && (
        <ScoreModal
          correctCount={submitResult.correct_count}
          total={submitResult.total}
          continueLabel={nextTier ? `Անցնել ${TIER_LABELS[nextTier]} մակարդակին` : "Վերադառնալ ցանկին"}
          onContinue={handleModalContinue}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {isMath && <ToolsDock />}
    </div>
    </NotepadProvider>
  );
}