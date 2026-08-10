import { useEffect, useState } from "react";
import * as profileApi from "../../api/profile";
import type { SkillMap } from "../../api/profile";
import { ProgressBar } from "../ui/ProgressBar";

export function SkillMapDrilldown({ subjectKey }: { subjectKey: string }) {
  const [skillMap, setSkillMap] = useState<SkillMap | null>(null);

  useEffect(() => {
    setSkillMap(null);
    profileApi.fetchSkillMap(subjectKey).then(setSkillMap);
  }, [subjectKey]);

  if (skillMap === null) return <p className="mt-3 text-xs text-text-muted">Բեռնվում է...</p>;

  if (!skillMap.available) {
    return <p className="mt-3 text-xs text-text-muted">{skillMap.reason}</p>;
  }

  const topics = skillMap.topics ?? [];
  if (topics.length === 0) {
    return <p className="mt-3 text-xs text-text-muted">Այս առարկայի համար դեռ թեմաներ չկան։</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      {topics.map((topic) => (
        <div key={topic.id}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-text">
              {topic.name} <span className="text-text-muted">· {topic.domain}</span>
            </span>
            <span className="text-text-muted">
              {topic.mastery !== null ? `${topic.mastery}%` : "🔒"}
            </span>
          </div>
          <ProgressBar percent={topic.mastery ?? 0} heightClassName="h-1" />
        </div>
      ))}
    </div>
  );
}
