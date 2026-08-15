"""
Tool definitions the assistant can call, in OpenAI's function-calling JSON
schema shape (providers that speak a different tool-call dialect translate
from this at the provider boundary — see providers/*). Every tool here is
read-only and implicitly scoped to the authenticated conversation owner:
none of them accept a user/student identifier as a parameter, so the model
can never ask for another student's data (see tools/registry.py).
"""

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
                "Get the student's learning progress: overall accuracy, "
                "their weakest and strongest subtopics, and a per-difficulty "
                "breakdown (easy/medium/hard) from their most recent mock "
                "exams. Call this when the student asks how they're doing, "
                "what to study next, or which topics they're weak or strong "
                "in."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Optional subject name to filter to, e.g. 'Mathematics'.",
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
                "Get a summary of the student's recent mistakes, grouped by "
                "subject and topic. Call this when the student asks about "
                "mistakes they've made or wants to review what they got "
                "wrong."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {
                        "type": "string",
                        "description": "Optional subject name to filter to.",
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
