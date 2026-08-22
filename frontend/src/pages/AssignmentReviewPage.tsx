import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CircleCheck, CircleX, ClipboardList, Minus } from "lucide-react";
import { MathText } from "../components/MathText";
import { useAuth } from "../auth/AuthContext";
import * as teachingApi from "../api/teaching";
import type {
  AssignmentDetail, ProblemQuestionReview, ProblemSet,
} from "../api/teaching";
import { assignmentDisplayTitle, assignmentLink } from "../lib/assignmentLabels";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, FormAlert } from "../components/ui/Field";
import { FilterChips } from "../components/ui/FilterChips";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Skeleton } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { cn } from "../lib/cn";

/*
  What this page is for, and what it used to do instead.

  Two people open it. A teacher opens it to decide one thing — approve this
  submission, or send it back — and the page answered by rendering every
  question in the assignment: on a real seeded mock-exam assignment, seventy
  cards, roughly thirty thousand pixels, with the only summary being a bare
  `— 0%` appended to a section heading. A student opens it to find out what
  they got wrong, and reached that the same way.

  So the page now leads with the outcome and the decision, and the questions
  become something you filter into rather than scroll through — the same
  answer MockExamResultsPage already arrived at, using the same `FilterChips`
  so the two review surfaces read as one product.

  Three factual defects were fixed on the way:

  1. A mock exam's `score` is a **scaled score out of 20**, not a percentage
     (mock_exams.MockExamAttempt.scaled_score — the exam pages print
     "14 / 20"). Practice's is a percentage. The page printed `%` on both, so
     a 14/20 exam was reported to the teacher as 14%.
  2. A `matching` question has both `choices` and `statements`, so it fell
     into the true/false branch and was drawn as a list of statements each
     labelled "Ճիշտ" or "Սխալ" — read off an `is_true` that is documented as
     unused for matching items. It renders as pairs now.
  3. Most assignments carry no problem sets at all: `build_problem_sets`
     returns nothing unless the student has a *completed* attempt dated after
     the assignment. That is the common case on real data, and the page
     rendered a header followed by blank space.
*/

const STATUS_LABELS: Record<AssignmentDetail["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  submitted: "Սպասում է ստուգման",
  completed: "Ավարտված",
};

/* `submitted` is the one status that asks something of the reader, so it is
   the one that carries the accent. `incorrect` is deliberately unused: an
   assignment still in progress is not a failure. */
const STATUS_TONES: Record<AssignmentDetail["status"], "neutral" | "primary" | "accent" | "correct"> = {
  assigned: "neutral",
  in_progress: "primary",
  submitted: "accent",
  completed: "correct",
};

function fullName(user: { first_name?: string; last_name?: string; username: string }): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

/** A set's score, in the units it is actually stored in. */
function formatSetScore(score: number | null, type: AssignmentDetail["assignment_type"]): string | null {
  if (score === null) return null;
  return type === "mock_exam" ? `${score} / 20` : `${Math.round(score)}%`;
}

// ---------------------------------------------------------------------------
// One question
// ---------------------------------------------------------------------------

function OptionRow({ text, state, note }: {
  text: string;
  state: "correct" | "wrong" | "quiet";
  /** What this row *is* to the reader — "your answer", "the right answer". */
  note?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-[var(--space-2)] rounded-[var(--radius-md)] border",
        "px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)]",
        state === "correct" && "border-correct bg-correct-bg text-correct",
        state === "wrong" && "border-incorrect bg-incorrect-bg text-incorrect",
        state === "quiet" && "border-border text-text-muted",
      )}
    >
      {/* Correctness was carried by a background colour and a `✓` glyph
          appended into the option's own sentence. The icon sits outside the
          text, survives greyscale, and is not read aloud as "check mark". */}
      <span className="mt-0.5 shrink-0">
        {state === "correct" ? (
          <CircleCheck size={15} strokeWidth={2} aria-hidden />
        ) : state === "wrong" ? (
          <CircleX size={15} strokeWidth={2} aria-hidden />
        ) : (
          <Minus size={15} strokeWidth={2} aria-hidden className="opacity-40" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <MathText text={text} />
        {note && <span className="ms-1 text-[length:var(--text-xs)] opacity-80">({note})</span>}
      </span>
    </li>
  );
}

function ChoiceReview({ question, answerLabel }: { question: ProblemQuestionReview; answerLabel: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {question.choices.map((c) => {
        const chosen = c.id === question.selected_choice_id;
        return (
          <OptionRow
            key={c.id}
            text={c.text}
            state={c.is_correct ? "correct" : chosen ? "wrong" : "quiet"}
            note={chosen ? answerLabel : undefined}
          />
        );
      })}
    </ul>
  );
}

function StatementReview({ question, answerLabel }: { question: ProblemQuestionReview; answerLabel: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {question.statements.map((s) => {
        const marked = question.selected_statement_ids.includes(s.id);
        const right = marked === s.is_true;
        return (
          <OptionRow
            key={s.id}
            text={`${s.label}) ${s.text}`}
            state={right ? "correct" : "wrong"}
            note={`${s.is_true ? "ճիշտ պնդում" : "սխալ պնդում"}${marked ? ` · ${answerLabel}` : ""}`}
          />
        );
      })}
    </ul>
  );
}

/** Left item → the right item that was connected to it, beside the one that
 *  should have been. Rendered as pairs rather than as the exam runner's line
 *  diagram: a teacher scanning seventy questions needs to read the answer,
 *  not re-draw it. */
function MatchingReview({ question, answerLabel }: { question: ProblemQuestionReview; answerLabel: string }) {
  const numberOf = (choiceId: number | undefined) => {
    if (choiceId === undefined) return null;
    const c = question.choices.find((x) => x.id === choiceId);
    return c ? c.order + 1 : null;
  };

  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      <ul className="flex flex-col gap-1.5">
        {question.statements.map((s) => {
          const chosen = numberOf(question.match_pairs[String(s.id)]);
          const target = s.match_target;
          const right = chosen !== null && chosen === target;
          return (
            <OptionRow
              key={s.id}
              text={`${s.label}) ${s.text}`}
              state={right ? "correct" : "wrong"}
              note={
                chosen === null
                  ? `չի կապվել · ճիշտը՝ ${target ?? "—"}`
                  : right
                    ? `${answerLabel}՝ ${chosen}`
                    : `${answerLabel}՝ ${chosen} · ճիշտը՝ ${target ?? "—"}`
              }
            />
          );
        })}
      </ul>
      <ol className="flex flex-col gap-1 text-[length:var(--text-xs)] text-text-muted">
        {[...question.choices]
          .sort((a, b) => a.order - b.order)
          .map((c) => (
            <li key={c.id} className="flex gap-[var(--space-2)]">
              <span className="shrink-0 tabular-nums font-medium text-text">{c.order + 1}.</span>
              <span className="min-w-0">
                <MathText text={c.text} />
              </span>
            </li>
          ))}
      </ol>
    </div>
  );
}

function QuestionReview({ question, index, answerLabel }: {
  question: ProblemQuestionReview;
  index: number;
  answerLabel: string;
}) {
  const isMatching = question.question_type === "matching";
  const hasStatements = question.statements.length > 0;
  const hasChoices = question.choices.length > 0;

  return (
    <li className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]">
      <div className="mb-[var(--space-3)] flex items-start justify-between gap-[var(--space-3)]">
        <p className="min-w-0 text-text">
          <span className="tabular-nums text-text-muted">{index + 1}.</span>{" "}
          <MathText text={question.text} />
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5",
            "text-[length:var(--text-xs)] font-medium",
            question.is_correct
              ? "border-correct bg-correct-bg text-correct"
              : "border-incorrect bg-incorrect-bg text-incorrect",
          )}
        >
          {question.is_correct ? (
            <CircleCheck size={13} strokeWidth={2} aria-hidden />
          ) : (
            <CircleX size={13} strokeWidth={2} aria-hidden />
          )}
          {question.is_correct ? "Ճիշտ" : "Սխալ"}
        </span>
      </div>

      {isMatching && hasStatements && hasChoices ? (
        <MatchingReview question={question} answerLabel={answerLabel} />
      ) : hasStatements ? (
        <StatementReview question={question} answerLabel={answerLabel} />
      ) : hasChoices ? (
        <ChoiceReview question={question} answerLabel={answerLabel} />
      ) : (
        <dl className="grid gap-x-[var(--space-3)] gap-y-1 text-[length:var(--text-sm)] sm:grid-cols-[auto_1fr]">
          <dt className="text-text-muted">{answerLabel}՝</dt>
          <dd className={cn("min-w-0", question.answer_text ? "text-text" : "text-text-muted")}>
            {question.answer_text ? <MathText text={question.answer_text} /> : "չի պատասխանել"}
          </dd>
          <dt className="text-text-muted">Ճիշտ պատասխանը՝</dt>
          <dd className="min-w-0 text-text">
            {question.correct_answer_text ? <MathText text={question.correct_answer_text} /> : "—"}
          </dd>
        </dl>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// The teacher's decision
// ---------------------------------------------------------------------------

function ReviewActions({ assignmentId, onReviewed }: {
  assignmentId: number;
  onReviewed: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    // Sending a submission back with no reason is the least useful feedback
    // the product can produce, and the field was optional — the label even
    // promised the student would read it. It is required now, and the
    // requirement is stated on the field rather than after the attempt.
    if (action === "reject" && !feedback.trim()) {
      setFeedbackError("Գրիր, թե ինչն է պետք ուղղել — աշակերտը սա է կարդալու։");
      return;
    }
    setBusy(true);
    setError(null);
    setFeedbackError(null);
    try {
      await teachingApi.reviewAssignment(assignmentId, action, feedback.trim());
      setRejecting(false);
      setFeedback("");
      onReviewed();
    } catch {
      setError(
        action === "approve"
          ? "Հաստատելը չհաջողվեց։ Ստուգիր կապը և փորձիր կրկին։"
          : "Հետ ուղարկելը չհաջողվեց։ Գրածդ պահպանված է — փորձիր կրկին։",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-accent-line bg-accent-bg p-[var(--space-4)]">
      <p className="text-[length:var(--text-sm)] font-medium text-text">Այս աշխատանքը սպասում է քո ստուգմանը։</p>

      <div className="mt-[var(--space-3)]">{error && <FormAlert message={error} />}</div>

      {!rejecting ? (
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button size="md" onClick={() => run("approve")} loading={busy}>
            Հաստատել
          </Button>
          <Button variant="secondary" size="md" onClick={() => setRejecting(true)} disabled={busy}>
            Հետ ուղարկել
          </Button>
        </div>
      ) : (
        <div>
          <Field
            label="Ինչը պետք է ուղղել"
            hint="Աշակերտը կտեսնի այս մեկնաբանությունը առաջադրանքի էջում։"
            error={feedbackError ?? undefined}
          >
            {(props) => (
              <textarea
                {...props}
                value={feedback}
                onChange={(e) => {
                  setFeedback(e.target.value);
                  if (feedbackError) setFeedbackError(null);
                }}
                rows={3}
                className={cn(props.className, "resize-none")}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button size="md" onClick={() => run("reject")} loading={busy}>
              Ուղարկել աշակերտին
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setRejecting(false);
                setFeedbackError(null);
              }}
              disabled={busy}
            >
              Չեղարկել
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type QuestionFilter = "all" | "wrong";

export function AssignmentReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  /* Null until the reader chooses, so the default can depend on data that
     does not exist at mount: "the wrong ones" is the useful opening view,
     but opening a flawless submission on an empty state is not. */
  const [chosenFilter, setChosenFilter] = useState<QuestionFilter | null>(null);

  const assignment = useAsyncResource<AssignmentDetail>(
    () => teachingApi.fetchAssignmentDetail(Number(id)),
    [id],
  );

  const isTeacher = user?.role === "teacher";
  const backTo = isTeacher
    ? { to: "/teacher-dashboard", label: "Ուսուցչի վահանակ" }
    : { to: "/student-dashboard", label: "Իմ առաջադրանքները" };

  /* "ձեր պատասխանը" was shown to whoever opened the page — including the
     teacher, to whom it meant the *student's* answer. Each reader is told
     whose answer they are looking at, in the register the rest of the
     product uses. */
  const answerLabel = isTeacher ? "աշակերտի պատասխանը" : "քո պատասխանը";

  const data = assignment.data;

  const totals = useMemo(() => {
    const sets: ProblemSet[] = data?.problem_sets ?? [];
    const questions = sets.flatMap((s) => s.questions);
    const correct = questions.filter((q) => q.is_correct).length;
    return { questions, correct, wrong: questions.length - correct };
  }, [data]);

  if (assignment.error) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Առաջադրանք" back={backTo} />
        <ErrorState
          title="Առաջադրանքը չհաջողվեց բեռնել։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={assignment.retry}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-40" />
        <Skeleton className="mb-[var(--space-6)] h-8 w-2/3" />
        <Skeleton className="mb-[var(--space-6)] h-32 w-full" />
        <div className="flex flex-col gap-[var(--space-4)]">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const canReview = isTeacher && data.status === "submitted";
  const counterpart = isTeacher ? data.student : data.teacher;
  const filter: QuestionFilter = chosenFilter ?? (totals.wrong > 0 ? "wrong" : "all");
  const setFilter = setChosenFilter;
  const overallScore =
    data.problem_sets.length === 1
      ? formatSetScore(data.problem_sets[0].score, data.assignment_type)
      : null;
  const visible =
    filter === "all"
      ? data.problem_sets
      : data.problem_sets
          .map((s) => ({ ...s, questions: s.questions.filter((q) => !q.is_correct) }))
          .filter((s) => s.questions.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={backTo}
        eyebrow={fullName(counterpart)}
        title={assignmentDisplayTitle(data)}
        size="prose"
        actions={<Badge tone={STATUS_TONES[data.status]}>{STATUS_LABELS[data.status]}</Badge>}
      />

      {/* The outcome, before the evidence. A teacher's first question is
          "how did they do", and it used to be answerable only by reading
          seventy cards or by parsing a bare percentage inside a heading. */}
      {totals.questions.length > 0 && (
        <div className="mb-[var(--space-6)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
          <div className="mb-[var(--space-4)] flex items-baseline gap-[var(--space-2)]">
            <span className="text-[length:var(--text-4xl)] font-bold tabular-nums text-primary">
              {totals.correct}
            </span>
            <span className="text-[length:var(--text-lg)] text-text-muted">
              / {totals.questions.length} ճիշտ
            </span>
          </div>
          <div className="grid grid-cols-2 gap-[var(--space-3)]">
            <StatTile label="Սխալ" value={String(totals.wrong)} />
            {/* Only when there is exactly one set does a headline score mean
                anything; several sets each carry their own, printed beside
                their own heading below. */}
            {data.problem_sets.length === 1 && overallScore && (
              <StatTile
                label={data.assignment_type === "mock_exam" ? "Գնահատական" : "Արդյունք"}
                value={overallScore}
              />
            )}
          </div>
        </div>
      )}

      {canReview && (
        <div className="mb-[var(--space-6)]">
          <ReviewActions assignmentId={data.id} onReviewed={assignment.retry} />
        </div>
      )}

      {(data.instructions || data.explanation || data.teacher_feedback) && (
        <div className="mb-[var(--space-6)] flex flex-col gap-[var(--space-4)]">
          {data.instructions && (
            <Section title="Հանձնարարականը" level={3} spacing="none">
              <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
                {data.instructions}
              </p>
            </Section>
          )}
          {data.explanation && (
            <Section
              title={isTeacher ? "Աշակերտի բացատրությունը" : "Քո բացատրությունը"}
              level={3}
              spacing="none"
            >
              <p className="whitespace-pre-wrap text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
                {data.explanation}
              </p>
            </Section>
          )}
          {data.teacher_feedback && (
            /* Was headed in `text-incorrect` — a teacher's comment is not an
               error, and painting it in the product's wrong-answer colour
               made every piece of feedback read as a reprimand. */
            <Section title="Ուսուցչի մեկնաբանությունը" level={3} spacing="none">
              <p className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-primary-line bg-primary-bg p-[var(--space-3)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
                {data.teacher_feedback}
              </p>
            </Section>
          )}
        </div>
      )}

      {totals.questions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={26} strokeWidth={1.5} aria-hidden />}
          title="Ստուգված պատասխաններ դեռ չկան։"
          hint={
            data.assignment_type === "mock_exam"
              ? "Այստեղ կհայտնվի թեստի ամբողջական վերլուծությունը, երբ այն ավարտվի։"
              : "Այստեղ կհայտնվեն այս թեմայի վարժությունները, երբ դրանք լուծվեն մինչև վերջ։"
          }
        />
      ) : (
        <Section
          title="Հարցերը"
          level={2}
          spacing="tight"
          description={
            filter === "all"
              ? `${totals.questions.length} հարց`
              : `${totals.wrong} սխալ ${totals.questions.length} հարցից`
          }
        >
          <FilterChips
            label="Ցուցադրել հարցերը"
            className="mb-[var(--space-4)]"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "wrong", label: "Սխալ", count: totals.wrong },
              { value: "all", label: "Բոլորը", count: totals.questions.length },
            ]}
          />

          {visible.length === 0 ? (
            <EmptyState
              tone="positive"
              icon={<CircleCheck size={26} strokeWidth={1.5} aria-hidden />}
              title="Այստեղ սխալ պատասխաններ չկան։"
              hint="Անցիր «Բոլորը»՝ ամբողջ աշխատանքը տեսնելու համար։"
              cta={{ label: "Ցույց տալ բոլորը", onClick: () => setFilter("all") }}
            />
          ) : (
            <div className="flex flex-col gap-[var(--space-6)]">
              {visible.map((set) => {
                const score = formatSetScore(set.score, data.assignment_type);
                return (
                  <div key={set.label}>
                    <div className="mb-[var(--space-3)] flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
                      <h3 className="min-w-0 font-display text-[length:var(--text-lg)] font-semibold text-text">
                        {set.label}
                      </h3>
                      {score && (
                        <span className="shrink-0 text-[length:var(--text-sm)] tabular-nums text-text-muted">
                          {score}
                        </span>
                      )}
                    </div>
                    <ul className="flex flex-col gap-[var(--space-3)]">
                      {set.questions.map((q, i) => (
                        <QuestionReview key={q.id} question={q} index={i} answerLabel={answerLabel} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* The page ended after the last question with nothing to do — on a
          surface whose whole point is deciding what happens next. */}
      {/* Not on `submitted`: the ball is with the teacher, and inviting the
          student back in would suggest their work had not been sent. */}
      {!isTeacher && (data.status === "assigned" || data.status === "in_progress") && (
        <div className="mt-[var(--space-8)] flex flex-wrap gap-[var(--space-3)]">
          <LinkButton to={assignmentLink(data)} variant="primary" size="md">
            Շարունակել առաջադրանքը
          </LinkButton>
        </div>
      )}
    </div>
  );
}
