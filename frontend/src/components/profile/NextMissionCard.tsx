import { useNavigate } from "react-router-dom";
import type { NextMission } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";

export function NextMissionCard({ mission }: { mission: NextMission }) {
  const navigate = useNavigate();

  if (!mission.available) {
    return (
      <div className="rounded-[var(--radius)] border-2 border-dashed border-border bg-surface p-6">
        <p className="mb-3 text-sm font-semibold text-text">🎯 Ձեր հաջորդ առաքելությունը</p>
        <EmptyState icon="📚" title="Ձեր ճամփորդությունն սկսվում է այստեղ" hint={mission.reason} />
      </div>
    );
  }

  function start() {
    if (!mission.available) return;
    if (mission.cta.type === "practice_subtopic") {
      navigate(`/practice/subtopic/${mission.cta.subtopic_id}/${mission.cta.tier}`);
    } else {
      navigate("/mock-exams");
    }
  }

  return (
    <div className="rounded-[var(--radius)] border-2 border-primary bg-surface p-6">
      <p className="mb-3 text-sm font-semibold text-primary">🎯 Ձեր հաջորդ առաքելությունը</p>
      <h3 className="text-xl font-bold text-text">{mission.title}</h3>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
        {mission.question_count !== null && <span>{mission.question_count} հարց</span>}
        {mission.estimated_minutes !== null && <span>~{mission.estimated_minutes} րոպե</span>}
        {mission.potential_xp !== null && <span className="font-medium text-primary">+{mission.potential_xp} XP</span>}
      </div>

      <p className="mt-3 text-sm text-text-muted">{mission.reason}</p>

      <button
        type="button"
        onClick={start}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover sm:w-auto"
      >
        Սկսել առաքելությունը →
      </button>
    </div>
  );
}
