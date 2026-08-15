from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.flashcards.models import FlashcardReview
from apps.mock_exams.models import MockExamAnswer
from apps.practice.models import AttemptAnswer
from apps.profiles.subjects import canonical_key_for_practice_subject

from .services import recompute_subject_mastery, recompute_topic_mastery


@receiver(post_save, sender=AttemptAnswer)
def _on_attempt_answer_saved(sender, instance, **kwargs):
    subtopic = instance.attempt.subtopic
    user = instance.attempt.user
    recompute_topic_mastery(user, subtopic, latest_is_correct=instance.is_correct)
    subject_key = canonical_key_for_practice_subject(subtopic.topic.domain.subject)
    if subject_key:
        recompute_subject_mastery(user, subject_key)


@receiver(post_save, sender=MockExamAnswer)
def _on_mock_exam_answer_saved(sender, instance, **kwargs):
    # Draft answers are saved with is_correct=None before the attempt is
    # finished — only a graded answer is real mastery evidence.
    if instance.is_correct is None:
        return
    recompute_subject_mastery(instance.attempt.user, instance.attempt.exam.subject)


@receiver(post_save, sender=FlashcardReview)
def _on_flashcard_review_saved(sender, instance, **kwargs):
    recompute_subject_mastery(instance.user, instance.card.deck.subject)
