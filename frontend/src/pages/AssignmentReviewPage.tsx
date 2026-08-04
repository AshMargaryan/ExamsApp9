import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MathText } from "../components/MathText";
import { useAuth } from "../auth/AuthContext";
import * as teachingApi from "../api/teaching";
import type { AssignmentDetail, ProblemQuestionReview } from "../api/teaching";
import { assignmentDisplayTitle } from "../lib/assignmentLabels";

const STATUS_LABELS: Record<AssignmentDetail["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  submitted: "Ուղարկված է՝ սպասում է հաստատման",
  completed: "Ավարտված",
};

function QuestionReview({ question, index }: { question: ProblemQuestionReview; index: number }) {
  const badgeClass = question.is_correct
    ? "border-correct bg-correct-bg text-correct"
    : "border-incorrect bg-incorrect-bg text-incorrect";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-text">
          <span className="text-text-muted">{index + 1}.</span> <MathText text={question.text} />
        </p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          {question.is_correct ? "Ճիշտ" : "Սխալ"}
        </span>
      </div>

      {question.statements.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {question.statements.map((s) => {
            const selected = question.selected_statement_ids.includes(s.id);
            const correctSelection = selected === s.is_true;
            return (
              <li
                key={s.id}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  selected
                    ? correctSelection
                      ? "border-correct bg-correct-bg text-correct"
                      : "border-incorrect bg-incorrect-bg text-incorrect"
                    : "border-border text-text-muted"
                }`}
              >
                <span className="font-medium">{s.label})</span> <MathText text={s.text} />
                {" — "}
                {s.is_true ? "Ճիշտ" : "Սխալ"}
                {selected && " (ձեր ընտրությունը)"}
              </li>
            );
          })}
        </ul>
      ) : question.choices.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {question.choices.map((c) => {
            const selected = c.id === question.selected_choice_id;
            return (
              <li
                key={c.id}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  c.is_correct
                    ? "border-correct bg-correct-bg text-correct"
                    : selected
                      ? "border-incorrect bg-incorrect-bg text-incorrect"
                      : "border-border text-text-muted"
                }`}
              >
                <MathText text={c.text} />
                {c.is_correct && " ✓"}
                {selected && !c.is_correct && " ✗ (ձեր ընտրությունը)"}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm">
          <p className="text-text-muted">
            Ձեր պատասխանը՝ <span className="text-text">{question.answer_text || "—"}</span>
          </p>
          <p className="text-text-muted">
            Ճիշտ պատասխանը՝ <span className="text-text">{question.correct_answer_text || "—"}</span>
          </p>
        </div>
      )}
    </div>
  );
}

export function AssignmentReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (id) teachingApi.fetchAssignmentDetail(Number(id)).then(setAssignment);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleApprove() {
    if (!assignment) return;
    setBusy(true);
    setError(null);
    try {
      await teachingApi.reviewAssignment(assignment.id, "approve");
      refresh();
    } catch {
      setError("Հաստատելիս սխալ տեղի ունեցավ։");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!assignment) return;
    setBusy(true);
    setError(null);
    try {
      await teachingApi.reviewAssignment(assignment.id, "reject", feedback.trim());
      setRejecting(false);
      setFeedback("");
      refresh();
    } catch {
      setError("Հետ ուղարկելիս սխալ տեղի ունեցավ։");
    } finally {
      setBusy(false);
    }
  }

  if (!assignment) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const isTeacherReviewer = user?.role === "teacher" && assignment.status === "submitted";
  const backTo = user?.role === "teacher" ? "/teacher-dashboard" : "/student-dashboard";

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to={backTo} className="text-sm text-primary hover:underline" onClick={() => navigate(backTo)}>
            ← Հետ
          </Link>
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
            {STATUS_LABELS[assignment.status]}
          </span>
        </div>

        <div className="mb-6 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h1 className="mb-1 text-xl font-semibold text-text">{assignmentDisplayTitle(assignment)}</h1>
          <p className="text-sm text-text-muted">
            {[assignment.student.first_name, assignment.student.last_name].filter(Boolean).join(" ") ||
              assignment.student.username}
          </p>

          {assignment.explanation && (
            <div className="mt-4 border-t border-border pt-4">
              <h2 className="mb-1 text-sm font-semibold text-text-muted">Աշակերտի բացատրությունը</h2>
              <p className="whitespace-pre-wrap text-text">{assignment.explanation}</p>
            </div>
          )}

          {assignment.teacher_feedback && (
            <div className="mt-4 border-t border-border pt-4">
              <h2 className="mb-1 text-sm font-semibold text-incorrect">Ուսուցչի մեկնաբանություն</h2>
              <p className="whitespace-pre-wrap text-text">{assignment.teacher_feedback}</p>
            </div>
          )}

          {isTeacherReviewer && (
            <div className="mt-4 border-t border-border pt-4">
              {!rejecting ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={busy}
                    className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    Հաստատել
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    disabled={busy}
                    className="rounded-md border border-border px-5 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted"
                  >
                    Հետ ուղարկել
                  </button>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm text-text-muted">
                    Ինչու՞ եք հետ ուղարկում (ցուցադրվում է աշակերտին)
                  </label>
                  <textarea
                    className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={busy}
                      className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                    >
                      Ուղարկել աշակերտին
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(false)}
                      className="rounded-md border border-border px-5 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted"
                    >
                      Չեղարկել
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="mt-2 text-sm text-incorrect">{error}</p>}
            </div>
          )}
        </div>

        {assignment.problem_sets.map((set) => (
          <section key={set.label} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-text">
              {set.label} {set.score !== null ? `— ${set.score}%` : ""}
            </h2>
            <div className="flex flex-col gap-3">
              {set.questions.map((q, i) => (
                <QuestionReview key={q.id} question={q} index={i} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}