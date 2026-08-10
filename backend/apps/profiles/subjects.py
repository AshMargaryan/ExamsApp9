"""
Canonical subject-key taxonomy, shared by profile analytics (subject
mastery, skill map) and the subject XP ledger (apps.rankings.SubjectXP).

These 5 keys match apps.mock_exams.MockExamSubject and
apps.flashcards.FlashcardSubject choices exactly. apps.practice.Subject is
free-text content (currently seeded for math + english only), so it needs
its own name mapping rather than a shared choices field — verify against
real Subject rows if new practice content is added for another subject.
"""

SUBJECT_LABELS = {
    "math": "Մաթեմատիկա",
    "physics": "Ֆիզիկա",
    "biology": "Կենսաբանություն",
    "chemistry": "Քիմիա",
    "english": "Անգլերեն",
}

PRACTICE_SUBJECT_NAMES = {
    "math": "Մաթեմատիկա",
    "english": "Անգլերեն",
}

_PRACTICE_NAME_TO_KEY = {name: key for key, name in PRACTICE_SUBJECT_NAMES.items()}


def canonical_key_for_practice_subject(subject) -> str | None:
    """apps.practice.Subject instance -> canonical key, or None if that
    subject's name isn't one of the mapped ones (shouldn't happen given
    current content, but content could be added under an unmapped name)."""
    if subject is None:
        return None
    return _PRACTICE_NAME_TO_KEY.get(subject.name)
