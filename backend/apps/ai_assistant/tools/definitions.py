"""
Tool definitions the assistant can call, in OpenAI's function-calling JSON
schema shape (providers that speak a different tool-call dialect translate
from this at the provider boundary — see providers/*). Every tool here is
read-only and implicitly scoped to the authenticated conversation owner:
none of them accept a user/student identifier as a parameter, so the model
can never ask for another student's data (see tools/registry.py).
"""

from apps.profiles.subjects import SUBJECT_LABELS

# The five canonical keys (apps.profiles.subjects). Declared as an enum on
# every `subject` argument so the model can't invent a display name: the
# stored data spells the same subject differently depending on which app
# wrote it, so a free-text subject filter silently matched nothing.
SUBJECT_KEYS = sorted(SUBJECT_LABELS)

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_profile",
            "description": (
                "Get the student's own profile: grade, school, XP, level, "
                "current learning streak, number of unlocked achievements, "
                "and days remaining until their target exam date. Call this "
                "when the student asks about their own stats, level, XP, "
                "streak, or achievements."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_progress",
            "description": (
                "Get the student's learning progress: the subtopics they "
                "should work on next (weakest first, with a suggested "
                "difficulty tier), and for each of their most recent mock "
                "exams the scaled score plus an easy/medium/hard breakdown. "
                "Call this when the student asks how they're doing, what to "
                "study next, or which topics they're weak in. It does NOT "
                "return an overall accuracy percentage or a list of their "
                "strongest topics — don't promise either."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "enum": SUBJECT_KEYS,
                        "description": (
                            "Optional canonical subject key to filter to. Must be one "
                            "of the listed keys — not a display name like "
                            "'Mathematics' or 'Մաթեմատիկա'. Omit it to cover every "
                            "subject."
                        ),
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_mistakes",
            "description": (
                "Get a summary of the student's mistakes over the last 30 "
                "days, grouped by subject and topic. Each group reports how "
                "many entries it holds and how many of those were questions "
                "left blank rather than answered wrongly "
                "(not_attempted_count) — don't call a blank answer a "
                "mistake. Call this when the student asks about mistakes "
                "they've made or wants to review what they got wrong."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "enum": SUBJECT_KEYS,
                        "description": (
                            "Optional canonical subject key to filter to (not a "
                            "display name). Omit it to cover every subject."
                        ),
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max number of grouped topics to return (default 10).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_study_plan",
            "description": (
                "Get the student's study plan for today: its headline and "
                "each recommended task with its live completion status. Call "
                "this when the student asks what they should study today or "
                "about their study plan."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]
