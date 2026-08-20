import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { retryMistake, type MistakeEntry, type MistakeRetryResult } from "../../api/mistakes";
import { MathText } from "../MathText";
import { Button } from "../ui/Button";
import { MultipleChoiceQuestion } from "../questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../questions/TrueFalseQuestion";
import { MatchingQuestion } from "../questions/MatchingQuestion";

const CHOICE_TYPES = new Set(["multiple_choice", "single_choice"]);
const TEXT_TYPES = new Set(["short_answer", "free_response"]);
const STATEMENT_TYPES = new Set(["true_false", "multi_statement"]);

const SUBMIT_BUTTON =
  "mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50";

interface Props {
  entry: MistakeEntry;
  onResult: (result: MistakeRetryResult) => void;
}

export function MistakeRetryPanel({ entry, onResult }: Props) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | undefined>();
  const [answerText, setAnswerText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [matchPairs, setMatchPairs] = useState<Record<number, number>>({});
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MistakeRetryResult | null>(null);

  async function submit(payload: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const r = await retryMistake(entry.id, payload);
      setResult(r);
      onResult(r);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div
        className={`mt-3 rounded-md border p-4 ${
          result.is_correct ? "border-correct bg-correct-bg" : "border-incorrect bg-incorrect-bg"
        }`}
      >
        {/* Correctness was carried by a colour, a word and a 🎉. The icon
            makes it legible in greyscale, which is the point of rule 7. */}
        <p className={`flex items-center gap-1.5 font-medium ${result.is_correct ? "text-correct" : "text-incorrect"}`}>
          {result.is_correct ? (
            <CircleCheck size={16} strokeWidth={2} aria-hidden />
          ) : (
            <CircleX size={16} strokeWidth={2} aria-hidden />
          )}
          {result.is_correct ? "Ճիշտ է հիմա" : "Դեռ սխալ է"}
        </p>
        {!result.is_correct && (
          <p className="mt-1 text-sm text-text">
            Ճիշտ պատասխան՝ <MathText text={result.correct_answer_text} />
          </p>
        )}
        {result.explanation && (
          <p className="mt-1 text-sm text-text-muted">
            <MathText text={result.explanation} />
          </p>
        )}
      </div>
    );
  }

  if (entry.source === "flashcard") {
    return (
      <div className="mt-3 rounded-md border border-border bg-surface-muted p-4">
        {!flipped ? (
          <Button variant="secondary" size="sm" onClick={() => setFlipped(true)}>
            Ցույց տալ պատասխանը
          </Button>
        ) : (
          <>
            <p className="mb-3 text-text">
              <MathText text={entry.render_data.back_text ?? ""} />
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit({ knew_it: true })}
                className="rounded-md border border-correct px-3 py-1.5 text-sm font-medium text-correct transition-colors hover:bg-correct-bg disabled:opacity-50"
              >
                Գիտեի
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit({ knew_it: false })}
                className="rounded-md border border-incorrect px-3 py-1.5 text-sm font-medium text-incorrect transition-colors hover:bg-incorrect-bg disabled:opacity-50"
              >
                Դեռ չգիտեմ
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (CHOICE_TYPES.has(entry.question_type)) {
    return (
      <div className="mt-3">
        <MultipleChoiceQuestion
          choices={entry.render_data.choices ?? []}
          selectedChoiceId={selectedChoiceId}
          revealed={false}
          onSelect={setSelectedChoiceId}
        />
        <button
          type="button"
          disabled={submitting || selectedChoiceId === undefined}
          onClick={() => submit({ selected_choice_id: selectedChoiceId })}
          className={SUBMIT_BUTTON}
        >
          Ստուգել
        </button>
      </div>
    );
  }

  if (TEXT_TYPES.has(entry.question_type)) {
    return (
      <div className="mt-3">
        <ShortAnswerQuestion value={answerText} onChange={setAnswerText} revealed={false} />
        <button
          type="button"
          disabled={submitting || !answerText.trim()}
          onClick={() => submit({ answer_text: answerText })}
          className={SUBMIT_BUTTON}
        >
          Ստուգել
        </button>
      </div>
    );
  }

  if (STATEMENT_TYPES.has(entry.question_type)) {
    return (
      <div className="mt-3">
        <TrueFalseQuestion
          statements={entry.render_data.statements ?? []}
          selectedIds={selectedIds}
          revealed={false}
          showHint={false}
          onToggle={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit({ selected_statement_ids: Array.from(selectedIds) })}
          className={SUBMIT_BUTTON}
        >
          Ստուգել
        </button>
      </div>
    );
  }

  if (entry.question_type === "matching") {
    return (
      <div className="mt-3">
        <MatchingQuestion
          leftItems={entry.render_data.left ?? []}
          rightItems={entry.render_data.right ?? []}
          value={matchPairs}
          onChange={setMatchPairs}
          revealed={false}
        />
        <button
          type="button"
          disabled={submitting || Object.keys(matchPairs).length === 0}
          onClick={() => submit({ match_pairs: matchPairs })}
          className={SUBMIT_BUTTON}
        >
          Ստուգել
        </button>
      </div>
    );
  }

  return null;
}
