"""
Dispatches a tool call (by name, with model-supplied arguments) to its
handler, always binding `user` from the authenticated conversation owner —
never from the arguments dict — so a tool call can never reach another
student's data. A failing tool returns an {"error": ...} dict instead of
raising, so one bad/hallucinated call never breaks the whole chat turn.
"""

from . import handlers
from .handlers import UnknownSubject

TOOLS = {
    "get_profile": handlers.get_profile,
    "get_progress": handlers.get_progress,
    "get_mistakes": handlers.get_mistakes,
    "get_study_plan": handlers.get_study_plan,
}


def execute(tool_name: str, arguments: dict, *, user) -> dict:
    handler = TOOLS.get(tool_name)
    if handler is None:
        return {"error": f"Unknown tool '{tool_name}'."}

    arguments = {k: v for k, v in (arguments or {}).items() if k != "user"}
    try:
        return handler(user=user, **arguments)
    except UnknownSubject as exc:
        # Surfaced verbatim (no "failed" wrapper) because it names the valid
        # values — the model can fix the argument and retry within the same
        # turn instead of reporting an outage to the student.
        return {"error": str(exc)}
    except TypeError as exc:
        return {"error": f"Invalid arguments for '{tool_name}': {exc}"}
    except Exception as exc:  # noqa: BLE001 - a tool failure must never 500 the turn
        return {"error": f"'{tool_name}' failed: {exc}"}
