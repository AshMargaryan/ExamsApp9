/*
  STREAMING STATUS LABELS — THE HONESTY RULE
  ======================================================================

  A status label may only be shown if it is derived from a real event in
  the stream.

  Exactly one event qualifies. `{"type":"tool_call","tool_name":"..."}` is
  emitted immediately before the tool runs
  (backend/apps/ai_assistant/services/message_service.py:336) and carries
  the real tool name. There is NO completion event, NO iteration event,
  and no signal for "reading", "understanding", or "thinking". A UI that
  showed those stages would be inventing them.

  So the rule this module implements is:

    real tool_name  → the specific Armenian label below
    anything else   → one neutral indicator, no words invented

  Why it matters beyond correctness: a fabricated progress sequence
  teaches a 16-year-old that the machine is doing something it is not,
  and the moment they notice the labels are the same every time, every
  other claim the tutor makes gets discounted with them.

  FIXES AUDIT DEFECT D1: today the raw string `get_mistakes` is rendered
  verbatim to Armenian students (TypingIndicator.tsx:13, fed from
  useConversationChat.ts:193). The data was always right; only the
  presentation was raw. The display wiring belongs to Slice 2 — this is
  the mapping it will use.
*/

/** The four tools that exist, per backend/apps/ai_assistant/tools/definitions.py:10-88. */
export const ASSISTANT_TOOL_NAMES = [
  "get_profile",
  "get_progress",
  "get_mistakes",
  "get_study_plan",
] as const;

export type AssistantToolName = (typeof ASSISTANT_TOOL_NAMES)[number];

/*
  Labels are written in the present continuous and in the first person,
  because that is what is literally true at the moment the event fires:
  the tutor is, right now, opening the student's own data. They name the
  student's thing ("քո սխալները"), not the system's ("mistakes API"),
  so the student can tell that the answer about to arrive is about them.
*/
const TOOL_LABELS: Record<AssistantToolName, string> = {
  get_profile: "Նայում եմ քո պրոֆիլը…",
  get_progress: "Նայում եմ քո առաջընթացը…",
  get_mistakes: "Նայում եմ քո վերջին սխալները…",
  get_study_plan: "Նայում եմ այսօրվա պլանը…",
};

/**
 * The single neutral indicator used whenever no tool event has arrived.
 * Deliberately says nothing about what is happening internally, because
 * nothing in the stream tells us.
 */
export const NEUTRAL_ACTIVITY_LABEL = "Պատրաստում եմ պատասխանը…";

/**
 * Maps a `tool_call` event's `tool_name` to a label a student can read.
 *
 * An unrecognised name — a tool added to the backend after this file was
 * written — returns null rather than the raw identifier. Showing nothing
 * is a small failure; showing `get_flashcard_stats` to an Armenian
 * 11th-grader is the defect we are fixing.
 */
export function toolActivityLabel(toolName: string | null | undefined): string | null {
  if (!toolName) return null;
  return TOOL_LABELS[toolName as AssistantToolName] ?? null;
}

/**
 * What the indicator should say, given the last tool event seen (or none).
 * Always returns a string, so the caller never has to decide what to do
 * with a null — and never has to invent a stage.
 */
export function activityLabelFor(toolName: string | null | undefined): string {
  return toolActivityLabel(toolName) ?? NEUTRAL_ACTIVITY_LABEL;
}
