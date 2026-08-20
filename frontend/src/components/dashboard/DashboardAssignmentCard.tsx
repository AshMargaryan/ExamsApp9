import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as teachingApi from "../../api/teaching";
import type { Assignment } from "../../api/teaching";
import { assignmentDisplayTitle, assignmentLink, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { AssignmentProgressBar } from "../teaching/AssignmentProgressBar";
import { AssignmentSubmitForm } from "../teaching/AssignmentSubmitForm";
import { TestStatusIndicator } from "../teaching/TestStatusIndicator";
import { LinkButton } from "../ui/LinkButton";

function navState(assignment: Assignment): Record<string, number | undefined> | undefined {
  if (assignment.assignment_type === "subtopic") return { subtopicId: assignment.subtopic?.id };
  if (assignment.assignment_type === "topic") return { topicId: assignment.topic?.id };
  if (assignment.assignment_type === "mock_exam") return { examId: assignment.mock_exam?.id };
  return undefined;
}

function ClampedText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p
        className="text-sm leading-relaxed text-text"
        style={
          expanded
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-1.5 text-xs text-text-muted underline"
      >
        {expanded ? "Ցույց տալ քիչ" : "Կարդալ ավելին"}
      </button>
    </div>
  );
}

/** Wide, mockup-styled assignment card for the dashboard's horizontal-scroll rows. */
export function DashboardAssignmentCard({
  assignment,
  onStart,
  onRefresh,
}: {
  assignment: Assignment;
  onStart: (id: number) => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const teacherName =
    [assignment.teacher.first_name, assignment.teacher.last_name].filter(Boolean).join(" ") ||
    assignment.teacher.username;
  const wasRejected = assignment.status === "in_progress" && !!assignment.teacher_feedback;
  const canWorkOn = assignment.status === "assigned" || assignment.status === "in_progress";
  const isTest = assignment.assignment_type === "mock_exam";
  const isApproved = assignment.status === "completed" && !!assignment.teacher_feedback;

  function handleOpen() {
    if (assignment.status === "assigned") onStart(assignment.id);
  }

  async function handleRedo() {
    await teachingApi.redoAssignment(assignment.id);
    navigate(assignmentLink(assignment), { state: navState(assignment) });
  }

  const tinted = wasRejected || isApproved;

  return (
    <div
      className={`flex w-[380px] shrink-0 flex-col gap-4 rounded-[var(--radius-lg)] border p-6 ${
        tinted ? "border-border bg-surface-muted" : "border-border bg-surface"
      }`}
      style={{ scrollSnapAlign: "start" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 truncate text-lg font-semibold text-text">{assignmentDisplayTitle(assignment)}</p>
          <p className="text-xs text-text-muted">
            {teacherName} · {assignmentTargetLabel(assignment)}
          </p>
          {assignment.due_date && (
            <p className="mt-1 text-xs text-text-muted">
              Վերջնաժամկետ՝ {new Date(assignment.due_date).toLocaleDateString("hy-AM")}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ${
            assignment.is_overdue
              ? "border border-incorrect text-incorrect"
              : assignment.status === "completed" || assignment.status === "submitted"
                ? "bg-text text-bg"
                : "border border-text-muted text-text-muted"
          }`}
        >
          {assignment.is_overdue
            ? "Ուշացած"
            : wasRejected
              ? "Մերժված"
              : assignment.status === "submitted"
                ? "Սպասում է հաստատման"
                : assignment.status === "completed"
                  ? "Հաստատված"
                  : "Չսկսված"}
        </span>
      </div>

      {assignment.instructions && (
        <div className="border-l-2 border-border pl-3.5">
          <ClampedText text={assignment.instructions} />
        </div>
      )}

      {wasRejected && assignment.teacher_feedback && (
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Ուսուցչի կարծիքը</p>
          <ClampedText text={assignment.teacher_feedback} />
        </div>
      )}

      {assignment.status === "submitted" && assignment.explanation && (
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Ձեր նշումը</p>
          <ClampedText text={assignment.explanation} />
        </div>
      )}

      {isApproved && (
        <div className="border-l-2 border-text pl-3.5">
          <p className="text-sm leading-relaxed text-text">{assignment.teacher_feedback}</p>
        </div>
      )}

      <div className="flex-1" />

      {canWorkOn &&
        (isTest ? (
          assignment.test_status && <TestStatusIndicator status={assignment.test_status} />
        ) : (
          <AssignmentProgressBar percent={assignment.progress} />
        ))}

      {canWorkOn && !wasRejected && (
        <div className="flex gap-2.5">
          <Link
            to={assignmentLink(assignment)}
            state={navState(assignment)}
            onClick={handleOpen}
            className="flex-1 rounded-xl bg-text px-4 py-3 text-center text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Կատարել
          </Link>
        </div>
      )}
      {canWorkOn && wasRejected && (
        <button
          type="button"
          onClick={handleRedo}
          className="rounded-xl bg-text px-4 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Կատարել նորից
        </button>
      )}
      {canWorkOn && (
        <div className="border-t border-border pt-3.5">
          <AssignmentSubmitForm assignment={assignment} onSubmitted={onRefresh} />
        </div>
      )}
      {(assignment.status === "submitted" || assignment.status === "completed") && (
        <LinkButton to={`/assignments/${assignment.id}`}>
          Մանրամասն →
        </LinkButton>
      )}
    </div>
  );
}
