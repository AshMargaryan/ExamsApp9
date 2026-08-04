import type { Assignment } from "../api/teaching";

export function assignmentTargetLabel(a: Assignment): string {
  if (a.assignment_type === "mock_exam") return a.mock_exam?.title ?? "";
  if (a.assignment_type === "topic") return a.topic?.name ?? "";
  return a.subtopic?.name ?? "";
}

export function assignmentDisplayTitle(a: Assignment): string {
  return a.title.trim() || assignmentTargetLabel(a);
}

export function assignmentLink(a: Assignment): string {
  return a.assignment_type === "mock_exam" ? "/mock-exams" : "/practice";
}
