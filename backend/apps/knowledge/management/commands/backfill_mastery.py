from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.flashcards.models import FlashcardReview
from apps.knowledge.services import recompute_subject_mastery, recompute_topic_mastery
from apps.mock_exams.models import MockExamAnswer
from apps.practice.models import AttemptAnswer, Subtopic
from apps.profiles.subjects import SUBJECT_LABELS

User = get_user_model()


class Command(BaseCommand):
    help = (
        "Backfills apps.knowledge SubjectMastery/TopicMastery from existing "
        "practice/mock-exam/flashcard history. The Knowledge Engine's "
        "signals only fire on new saves going forward, so any activity that "
        "happened before it existed needs this one-off pass — otherwise a "
        "returning student with years of history would show 'no data' "
        "until their next answer. Safe to re-run: recompute functions do a "
        "full, idempotent rescan every time, never an additive update."
    )

    def handle(self, *args, **options):
        user_ids = set(AttemptAnswer.objects.values_list("attempt__user_id", flat=True))
        user_ids |= set(
            MockExamAnswer.objects.exclude(is_correct=None).values_list("attempt__user_id", flat=True)
        )
        user_ids |= set(FlashcardReview.objects.values_list("user_id", flat=True))
        users_by_id = {u.id: u for u in User.objects.filter(id__in=user_ids)}

        subject_count = 0
        for user in users_by_id.values():
            for subject_key in SUBJECT_LABELS:
                recompute_subject_mastery(user, subject_key)
                subject_count += 1
        self.stdout.write(f"Recomputed {subject_count} subject-mastery rows for {len(users_by_id)} users.")

        topic_pairs = set(
            AttemptAnswer.objects
            .filter(attempt__completed_at__isnull=False, attempt__revealed_answers=False)
            .values_list("attempt__user_id", "attempt__subtopic_id")
            .distinct()
        )
        subtopics_by_id = {s.id: s for s in Subtopic.objects.filter(id__in={p[1] for p in topic_pairs})}
        for user_id, subtopic_id in topic_pairs:
            user = users_by_id.get(user_id) or User.objects.filter(id=user_id).first()
            subtopic = subtopics_by_id.get(subtopic_id)
            if user and subtopic:
                recompute_topic_mastery(user, subtopic)
        self.stdout.write(f"Recomputed {len(topic_pairs)} topic-mastery rows.")
        self.stdout.write(self.style.SUCCESS("Mastery backfill complete."))
