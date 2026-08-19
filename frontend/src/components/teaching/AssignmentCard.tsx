import { useNavigate } from "react-router-dom";
import * as teachingApi from "../../api/teaching";
import type { Assignment } from "../../api/teaching";
import { assignmentDisplayTitle, assignmentLink, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import { AssignmentProgressBar } from "./AssignmentProgressBar";
import { AssignmentSubmitForm } from "./AssignmentSubmitForm";
import { TestStatusIndicator } from "./TestStatusIndicator";

const STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  submitted: "Ուղարկված է՝ սպասում է հաստատման",
  completed: "Ավարտված",
};

// Mirrors ExamCard's StatusBadge tone mapping so "completed" reads as success
// everywhere in the app, not just on exams.
const STATUS_TONE: Record<Assignment["status"], "neutral" | "primary" | "correct"> = {
  assigned: "neutral",
  in_progress: "neutral",
  submitted: "primary",
  completed: "correct",
};

function navState(assignment: Assignment): Record<string, number | undefined> | undefined {
  if (assignment.assignment_type === "subtopic") return { subtopicId: assignment.subtopic?.id };
  if (assignment.assignment_type === "topic") return { topicId: assignment.topic?.id };
  if (assignment.assignment_type === "mock_exam") return { examId: assignment.mock_exam?.id };
  return undefined;
}

export function AssignmentCard({
  assignment,
  onStart,
  onRefresh,
  compact = false,
}: {
  assignment: Assignment;
  onStart: (id: number) => void;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const teacherName =
    [assignment.teacher.first_name, assignment.teacher.last_name].filter(Boolean).join(" ") ||
    assignment.teacher.username;
  const wasRejected = assignment.status === "in_progress" && assignment.teacher_feedback;
  const canWorkOn = assignment.status === "assigned" || assignment.status === "in_progress";
  const isTest = assignment.assignment_type === "mock_exam";

  function handleOpen() {
    if (assignment.status === "assigned") onStart(assignment.id);
  }

  async function handleRedo() {
    await teachingApi.redoAssignment(assignment.id);
    navigate(assignmentLink(assignment), { state: navState(assignment) });
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-text">{assignmentDisplayTitle(assignment)}</p>
          <p className="text-sm text-text-muted">
            {teacherName} · {assignmentTargetLabel(assignment)}
          </p>
          {!compact && assignment.instructions && (
            <p className="mt-1 text-sm text-text-muted">{assignment.instructions}</p>
          )}
          {assignment.due_date && (
            <p className="text-xs text-text-muted">
              Վերջնաժամկետ՝ {new Date(assignment.due_date).toLocaleDateString("hy-AM")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={assignment.is_overdue ? "incorrect" : STATUS_TONE[assignment.status]}>
            {assignment.is_overdue ? "Ուշացած" : STATUS_LABELS[assignment.status]}
          </Badge>
          <div className="flex gap-3">
            {canWorkOn && !wasRejected && (
              <LinkButton
                to={assignmentLink(assignment)}
                state={navState(assignment)}
                onClick={handleOpen}
              >
                Կատարել
              </LinkButton>
            )}
            {canWorkOn && wasRejected && (
              <Button variant="secondary" size="sm" onClick={handleRedo}>
                Կրկին անել
              </Button>
            )}
            {canWorkOn && compact && (
              <LinkButton to="/student-dashboard">
                Ուղարկել պատասխանը
              </LinkButton>
            )}
            {(assignment.status === "submitted" || assignment.status === "completed") && (
              <LinkButton to={`/assignments/${assignment.id}`}>
                Մանրամասն
              </LinkButton>
            )}
          </div>
        </div>
      </div>

      {canWorkOn &&
        (isTest ? (
          assignment.test_status && <TestStatusIndicator status={assignment.test_status} className="mt-3" />
        ) : (
          <AssignmentProgressBar percent={assignment.progress} className="mt-3" />
        ))}

      {!compact && wasRejected && (
        <div className="mt-3 rounded-[var(--radius)] border border-incorrect/30 bg-incorrect/5 p-3">
          <p className="text-sm font-medium text-incorrect">Ուսուցչի մեկնաբանություն</p>
          <p className="text-sm text-text">{assignment.teacher_feedback}</p>
        </div>
      )}

      {!compact && canWorkOn && (
        <div className="mt-3 border-t border-border pt-3">
          <AssignmentSubmitForm assignment={assignment} onSubmitted={onRefresh} />
        </div>
      )}

      {!compact && assignment.status === "submitted" && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm text-text-muted">Ձեր բացատրությունը՝</p>
          <p className="text-sm text-text">{assignment.explanation}</p>
        </div>
      )}
    </div>
  );
}
