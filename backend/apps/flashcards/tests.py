from django.test import TestCase

from .models import FlashcardProgress
from .views import MAX_INTERVAL_DAYS, _schedule


class ScheduleIntervalCapTests(TestCase):
    """_schedule's interval*ease_factor growth is unbounded across repeated
    "good"/"easy" grades — without a cap, a long correct streak eventually
    overflows datetime.timedelta (see apps.knowledge.services, which hit
    this same bug first). Never construct FlashcardProgress with an interval
    beyond the cap."""

    def _progress(self, interval_days, ease_factor=3.0):
        return FlashcardProgress(interval_days=interval_days, ease_factor=ease_factor)

    def test_good_grade_caps_at_max_interval(self):
        progress = self._progress(MAX_INTERVAL_DAYS - 1)
        _schedule(progress, "good")
        self.assertLessEqual(progress.interval_days, MAX_INTERVAL_DAYS)

    def test_easy_grade_caps_at_max_interval(self):
        progress = self._progress(MAX_INTERVAL_DAYS - 1)
        _schedule(progress, "easy")
        self.assertLessEqual(progress.interval_days, MAX_INTERVAL_DAYS)

    def test_hard_grade_caps_at_max_interval(self):
        progress = self._progress(MAX_INTERVAL_DAYS)
        _schedule(progress, "hard")
        self.assertLessEqual(progress.interval_days, MAX_INTERVAL_DAYS)

    def test_repeated_easy_grades_never_exceed_cap(self):
        progress = self._progress(1)
        for _ in range(50):
            _schedule(progress, "easy")
            self.assertLessEqual(progress.interval_days, MAX_INTERVAL_DAYS)

    def test_again_grade_resets_interval_to_zero(self):
        progress = self._progress(MAX_INTERVAL_DAYS)
        _schedule(progress, "again")
        self.assertEqual(progress.interval_days, 0)
