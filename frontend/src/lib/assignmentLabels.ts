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
  if (a.assignment_type === "mock_exam") return "/mock-exams";
  // Subtopics now have their own page (see PracticeSubjectPage's spatial
  // hierarchy + SubtopicPage) — go straight there instead of through
  // /practice's old "resolve owning subject, then open it inline" redirect,
  // which no longer applies to subtopics.
  if (a.assignment_type === "subtopic" && a.subtopic) return `/practice/subtopic/${a.subtopic.id}`;
  return "/practice";
}
