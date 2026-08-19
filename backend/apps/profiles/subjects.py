"""
Canonical subject-key taxonomy, shared by profile analytics (subject
mastery, skill map) and the subject XP ledger (apps.rankings.SubjectXP).

These 5 keys match apps.mock_exams.MockExamSubject and
apps.flashcards.FlashcardSubject choices exactly. apps.practice.Subject is
free-text content, so it needs its own name mapping rather than a shared
choices field — verify against real Subject rows if new practice content is
added for another subject.
"""

from apps.mock_exams.models import MockExamSubject

SUBJECT_LABELS = {
    "math": "Մաթեմատիկա",
    "physics": "Ֆիզիկա",
    "biology": "Կենսաբանություն",
    "chemistry": "Քիմիա",
    "english": "Անգլերեն",
}

PRACTICE_SUBJECT_NAMES = {
    "math": "Մաթեմատիկա",
    "physics": "Ֆիզիկա",
    "english": "Անգլերեն",
}

_PRACTICE_NAME_TO_KEY = {name: key for key, name in PRACTICE_SUBJECT_NAMES.items()}

# apps.mock_exams.MockExamSubject and apps.flashcards.FlashcardSubject share
# identical (value, English label) pairs, so one reverse map covers both —
# used for MistakeEntry.subject_name snapshots, which store
# card.deck.get_subject_display() / exam.get_subject_display() (English)
# rather than the canonical key itself.
_ENGLISH_LABEL_TO_KEY = {label: key for key, label in MockExamSubject.choices}


def canonical_key_for_practice_subject(subject) -> str | None:
    """apps.practice.Subject instance -> canonical key, or None if that
    subject's name isn't one of the mapped ones (shouldn't happen given
    current content, but content could be added under an unmapped name)."""
    if subject is None:
        return None
    return _PRACTICE_NAME_TO_KEY.get(subject.name)


def subject_key_for_name(name: str) -> str | None:
    """Best-effort reverse lookup from a free-text display name back to the
    canonical key — for data that snapshotted a display string instead of
    the key (e.g. MistakeEntry.subject_name), which can be either an
    Armenian practice subject name or an English MockExamSubject/
    FlashcardSubject label depending on where the mistake came from."""
    if not name:
        return None
    return _PRACTICE_NAME_TO_KEY.get(name) or _ENGLISH_LABEL_TO_KEY.get(name)
