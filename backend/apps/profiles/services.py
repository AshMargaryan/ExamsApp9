from .models import LearningEvent


def record_event(
    user,
    event_type,
    *,
    subject_key="",
    topic_label="",
    source="",
    session=None,
    target_id=None,
    result="",
    metadata=None,
    occurred_at=None,
):
    """Append one LearningEvent row. The only intended write path for the
    learning-events log — call this from wherever an event actually
    happens (practice/mock_exams/flashcards/ai_assistant/...), never from
    student-facing input. `event_type` should be a LearningEventType value."""
    kwargs = {
        "user": user,
        "event_type": event_type,
        "subject_key": subject_key,
        "topic_label": topic_label,
        "source": source,
        "session": session,
        "target_id": target_id,
        "result": result,
        "metadata": metadata or {},
    }
    if occurred_at is not None:
        kwargs["occurred_at"] = occurred_at
    return LearningEvent.objects.create(**kwargs)
