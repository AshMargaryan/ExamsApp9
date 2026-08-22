from django.test import SimpleTestCase

from apps.answer_matching import answers_match, normalize_answer, to_decimal


class NormalizeAnswerTests(SimpleTestCase):
    def test_strips_latex_noise_and_case(self):
        self.assertEqual(normalize_answer("$2{,}5$"), "2,5")
        self.assertEqual(normalize_answer("  Na OH "), "na oh")

    def test_unicode_minus_folds_to_ascii(self):
        self.assertEqual(normalize_answer("−1"), "-1")

    def test_none_and_blank(self):
        self.assertEqual(normalize_answer(None), "")
        self.assertEqual(normalize_answer("   "), "")


class ToDecimalTests(SimpleTestCase):
    def test_both_decimal_separators(self):
        self.assertEqual(to_decimal("2,5"), to_decimal("2.5"))

    def test_rejects_non_numeric(self):
        self.assertIsNone(to_decimal("2,5 մոլ"))
        self.assertIsNone(to_decimal("փայտամած"))


class AnswersMatchTests(SimpleTestCase):
    def test_decimal_comma_and_dot_are_interchangeable(self):
        """The bank stores '2,5'; a student typing '2.5' is not wrong."""
        self.assertTrue(answers_match("2.5", "2,5"))
        self.assertTrue(answers_match("2,5", "2,5"))
        self.assertTrue(answers_match("2,5", "2.5"))

    def test_trailing_zeros_ignored(self):
        self.assertTrue(answers_match("2,50", "2,5"))
        self.assertTrue(answers_match("20.0", "20"))

    def test_whitespace_and_leading_plus(self):
        self.assertTrue(answers_match("  1682 ", "1682"))
        self.assertTrue(answers_match("+1682", "1682"))

    def test_negative_forms(self):
        self.assertTrue(answers_match("−1", "-1"))
        self.assertTrue(answers_match("-1", "-1"))

    def test_unit_suffix_accepted_when_value_matches(self):
        """Question text fixes the unit; the bank stores only the value."""
        self.assertTrue(answers_match("2,5 մոլ", "2,5"))
        self.assertTrue(answers_match("20 կՋ", "20"))

    def test_latex_wrapped_student_input(self):
        self.assertTrue(answers_match("$2{,}5$", "2,5"))

    def test_molecular_formula_subscript_notation(self):
        """`C_4H_{10}O` and `C4H10O` are the same formula; only one is typable."""
        self.assertTrue(answers_match("C4H10O", "C_4H_{10}O"))
        self.assertTrue(answers_match("c4h10o", "C4H10O"))
        self.assertFalse(answers_match("C4H10", "C4H10O"))

    # --- must still be rejected -------------------------------------------

    def test_different_values_rejected(self):
        self.assertFalse(answers_match("2,6", "2,5"))
        self.assertFalse(answers_match("110,25", "111"))
        self.assertFalse(answers_match("1681", "1682"))

    def test_blank_is_wrong(self):
        self.assertFalse(answers_match("", "1682"))
        self.assertFalse(answers_match("   ", "1682"))
        self.assertFalse(answers_match(None, "1682"))

    def test_text_answers_still_compared_exactly(self):
        self.assertTrue(answers_match("Փայտամած", "փայտամած"))
        self.assertFalse(answers_match("լաստ", "փայտամած"))

    def test_number_not_accepted_for_text_answer(self):
        self.assertFalse(answers_match("5", "փայտամած"))

    def test_trailing_garbage_after_wrong_number_rejected(self):
        self.assertFalse(answers_match("3 մոլ", "2,5"))
