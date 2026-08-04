import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../../api/profile";
import type { Profile } from "../../api/profile";
import * as teachingApi from "../../api/teaching";
import type { Assignment } from "../../api/teaching";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { AssignmentProgressBar } from "./AssignmentProgressBar";
import { TestStatusIndicator } from "./TestStatusIndicator";

const STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  submitted: "Սպասում է հաստատման",
  completed: "Ավարտված",
};

export function StudentReviewPanel({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);

  useEffect(() => {
    setProfile(null);
    setAssignments(null);
    profileApi.fetchUserProfile(studentId).then(setProfile);

    function loadAssignments() {
      teachingApi.fetchAssignments(studentId).then((list) => {
        setAssignments(list);
        list
          .filter((a) => a.status === "submitted" && !a.seen_by_teacher)
          .forEach((a) => teachingApi.markAssignmentSeen(a.id));
      });
    }
    loadAssignments();
    const interval = setInterval(loadAssignments, 5000);
    return () => clearInterval(interval);
  }, [studentId]);

  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Աշակերտի ակնարկ</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="text-lg text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        </div>

        {!profile && <p className="text-text-muted">Բեռնվում է...</p>}

        {profile && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-2xl font-semibold text-text-muted">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text">{fullName || profile.username}</p>
                <p className="text-text-muted">@{profile.username}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <p className="text-lg font-semibold text-text">{profile.stats.accuracy_percentage}%</p>
                <p className="text-xs text-text-muted">Ճշգրտություն</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">{profile.stats.tests_completed}</p>
                <p className="text-xs text-text-muted">Ավարտված թեստեր</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">
                  {(profile.stats.weekly_study_seconds / 3600).toFixed(1)}
                </p>
                <p className="text-xs text-text-muted">Ժամ այս շաբաթ</p>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-text-muted">Առաջադրանքներ</h3>
              {assignments === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {assignments?.length === 0 && <p className="text-text-muted">Առաջադրանքներ դեռ չկան։</p>}
              <div className="flex flex-col gap-2">
                {assignments?.map((a) => (
                  <Link
                    key={a.id}
                    to={`/assignments/${a.id}`}
                    className="rounded-[var(--radius)] border border-border bg-bg p-3 transition-colors hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-text">{assignmentDisplayTitle(a)}</p>
                        <p className="text-xs text-text-muted">{assignmentTargetLabel(a)}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                        {a.status === "submitted" && (
                          <span className="h-2 w-2 rounded-full bg-primary" title="Սպասում է հաստատման" />
                        )}
                        {STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    {(a.status === "assigned" || a.status === "in_progress") &&
                      (a.assignment_type === "mock_exam" ? (
                        a.test_status && <TestStatusIndicator status={a.test_status} className="mt-2" />
                      ) : (
                        <AssignmentProgressBar percent={a.progress} className="mt-2" />
                      ))}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}