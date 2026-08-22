import type { NextMission } from "../api/profile";

/*
  Where "Հաջորդ քայլը → Սկսել" actually goes.

  This mapping was duplicated in three components (the home mission hero, the
  insight card, the study-plan coach column) and they could drift. One copy.

  `mistake_review` is the case that used to be wrong: a weak topic with no
  practice subtopic fell through to the mock-exam list, so a mission titled
  "review «Number theory»" opened a page full of full-length exams. It now
  opens the review session for exactly that topic's mistakes.
*/
export function missionHref(mission: NextMission): string | null {
  if (!mission.available) return null;

  switch (mission.cta.type) {
    case "practice_subtopic":
      return `/practice/subtopic/${mission.cta.subtopic_id}/${mission.cta.tier}`;
    case "mistake_review": {
      const params = new URLSearchParams({ subject: mission.cta.subject_name });
      if (mission.cta.topic_label) params.set("topic", mission.cta.topic_label);
      return `/mistake-notebook/review?${params.toString()}`;
    }
    case "mock_exams":
      return "/mock-exams";
    default:
      return null;
  }
}

/** Same thing, for call sites that need a definite destination. */
export function missionHrefOrFallback(mission: NextMission, fallback = "/mock-exams"): string {
  return missionHref(mission) ?? fallback;
}
