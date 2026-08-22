from django.test import SimpleTestCase

from apps.mock_exams.audit import (
    Auditor, has_integer_restriction, has_minmax, language_violation,
    normalize_number, numbers_in,
)


class LanguageRuleTests(SimpleTestCase):
    def test_armenian_subject_accepts_armenian(self):
        self.assertIsNone(language_violation("math", "Գտեք քանորդի ամբողջ մասը։"))

    def test_armenian_subject_flags_wholesale_english(self):
        self.assertIsNotNone(language_violation(
            "math", "Find the remainder when dividing the given number carefully."
        ))

    def test_armenian_subject_tolerates_symbols_and_units(self):
        """Variables and units are language-neutral, not a violation."""
        self.assertIsNone(language_violation("physics", "$v = 5$ m/s, $t = 2$ s"))

    def test_english_subject_flags_armenian_prose(self):
        self.assertIsNotNone(language_violation(
            "english", "Ստուգել ժամանակաձևի հետշարժը:"
        ))

    def test_english_subject_allows_armenian_option_labels(self):
        """(Ա) is an answer label from the platform scheme, not Armenian prose."""
        self.assertIsNone(language_violation(
            "english", "Tesla is remembered (Ա) __________ his work on current."
        ))


class MinMaxDetectionTests(SimpleTestCase):
    def test_detects_armenian_and_english_terms(self):
        self.assertTrue(has_minmax("Որքա՞ն է m-ի ամենափոքր ամբողջ արժեքը"))
        self.assertTrue(has_minmax("What is the largest value"))
        self.assertFalse(has_minmax("Ինչքա՞ն է մնացորդը"))

    def test_detects_integer_restriction(self):
        self.assertTrue(has_integer_restriction("ամենափոքր ամբողջ արժեքը"))
        self.assertTrue(has_integer_restriction("smallest natural number"))
        self.assertFalse(has_integer_restriction("առավելագույն մակերեսը"))


class NumberNormalisationTests(SimpleTestCase):
    def test_latex_decimal_comma(self):
        self.assertEqual(normalize_number("$0{,}5$"), "0.5")

    def test_trailing_zeros_dropped(self):
        self.assertEqual(normalize_number("2,50"), "2.5")

    def test_numbers_in_extracts_all(self):
        self.assertEqual(
            numbers_in("$D = 6724 - 4m$, $m > 1681$"), {"6724", "4", "1681"}
        )


class AuditorChecksTests(SimpleTestCase):
    def _audit(self, q, subject="math"):
        a = Auditor()
        a.audit_question(subject, "t.json", q)
        return {f.code for f in a.findings}

    def test_flags_solution_that_stops_at_threshold(self):
        """The core defect: derivation ends at the bound, not the answer."""
        codes = self._audit({
            "number": 1, "type": "free_response",
            "question": "Որքա՞ն է m-ի ամենափոքր ամբողջ արժեքը։",
            "answer": "1682", "hint": "h",
            "solution_steps": ["$D<0 \\Rightarrow m>1681$"],
            "difficulty": "բարձր",
        })
        self.assertIn("SOLUTION", codes)

    def test_accepts_solution_that_states_the_answer(self):
        codes = self._audit({
            "number": 1, "type": "free_response",
            "question": "Որքա՞ն է m-ի ամենափոքր ամբողջ արժեքը։",
            "answer": "1682", "hint": "h",
            "solution_steps": ["$m>1681$", "Պատասխան՝ $m=1682$։"],
            "difficulty": "բարձր",
        })
        self.assertNotIn("SOLUTION", codes)

    def test_flags_correct_option_out_of_range(self):
        codes = self._audit({
            "number": 1, "type": "single_choice", "question": "Ո՞րն է", "hint": "h",
            "options": ["ա", "բ"], "correct_option": "Դ",
            "solution_steps": ["s1", "s2"], "difficulty": "հեշտ",
        })
        self.assertIn("GRADE", codes)

    def test_flags_untypable_latex_answer(self):
        codes = self._audit({
            "number": 1, "type": "free_response", "question": "Բանաձևը", "hint": "h",
            "answer": "C_4H_{10}O",
            "solution_steps": ["C_4H_{10}O"], "difficulty": "միջին",
        })
        self.assertIn("GRADE", codes)

    def test_decimal_comma_answer_is_not_a_defect(self):
        """apps.answer_matching accepts both separators, so this is fine."""
        codes = self._audit({
            "number": 1, "type": "free_response", "question": "Քանի՞ մոլ", "hint": "h",
            "answer": "2,5",
            "solution_steps": ["$\\nu=2{,}5$ մոլ", "Պատասխան՝ $2{,}5$։"],
            "difficulty": "միջին",
        })
        self.assertNotIn("GRADE", codes)

    def test_flags_matching_target_out_of_range(self):
        codes = self._audit({
            "number": 1, "type": "matching", "question": "Համապատասխանեցրե՛ք",
            "hint": "h", "solution_steps": ["s1", "s2"], "difficulty": "միջին",
            "left": [{"label": "A", "text": "x", "target": 9}],
            "right": [{"text": "1"}, {"text": "2"}],
        })
        self.assertIn("GRADE", codes)
