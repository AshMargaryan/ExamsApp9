from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import PracticeAttempt

from .models import Assignment, AssignmentStatus, AssignmentType


@receiver(post_save, sender=PracticeAttempt)
def complete_assignments_on_practice_attempt(sender, instance, **kwargs):
    """
    A finished (non-revealed) practice attempt auto-completes any matching
    subtopic assignment, and — if every subtopic in the topic now has a
    completed attempt from this student — the parent topic assignment too.
    This is pure completion-detection wired onto existing save points, not
    submission content or grading (still future work).
    """
    if instance.completed_at is None or instance.revealed_answers:
        return

    Assignment.objects.filter(
        student=instance.user,
        assignment_type=AssignmentType.SUBTOPIC,
        subtopic=instance.subtopic,
    ).exclude(status=AssignmentStatus.COMPLETED).update(status=AssignmentStatus.COMPLETED)

    topic = instance.subtopic.topic
    topic_assignments = Assignment.objects.filter(
        student=instance.user, assignment_type=AssignmentType.TOPIC, topic=topic,
    ).exclude(status=AssignmentStatus.COMPLETED)
    if not topic_assignments.exists():
        return

    subtopic_ids = set(topic.subtopics.values_list("id", flat=True))
    completed_subtopic_ids = set(
        PracticeAttempt.objects.filter(
            user=instance.user,
            subtopic_id__in=subtopic_ids,
            completed_at__isnull=False,
            revealed_answers=False,
        ).values_list("subtopic_id", flat=True)
    )
    if subtopic_ids and subtopic_ids <= completed_subtopic_ids:
        topic_assignments.update(status=AssignmentStatus.COMPLETED)


@receiver(post_save, sender=MockExamAttempt)
def complete_assignments_on_mock_exam_attempt(sender, instance, **kwargs):
    if instance.status != MockExamAttemptStatus.COMPLETED:
        return

    Assignment.objects.filter(
        student=instance.user,
        assignment_type=AssignmentType.MOCK_EXAM,
        mock_exam=instance.exam,
    ).exclude(status=AssignmentStatus.COMPLETED).update(status=AssignmentStatus.COMPLETED)