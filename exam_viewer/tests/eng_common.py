# -*- coding: utf-8 -*-
"""
Shared builder for English mock exams (AEE-ENG-NNN), 80 questions each,
same 13-section blueprint as exam 1 (generate_english_exam1.py). Every new
exam's content is checked against a cross-exam duplicate-fact registry
(eng_used_facts.json) before being saved, so exam N can never repeat exam
N-1's (or any earlier exam's) reading topic, cloze topic, sentence, or
vocab item — same approach as the biology pipeline's bio_common.py.
"""
import json, os, re

TESTS_DIR = os.path.dirname(__file__)
OUT_DIR = os.path.normpath(os.path.join(
    TESTS_DIR, "..", "..", "backend", "apps", "mock_exams", "data", "exams", "english",
))
os.makedirs(OUT_DIR, exist_ok=True)
REGISTRY_PATH = os.path.join(TESTS_DIR, "eng_used_facts.json")

ARM = "ԱԲԳԴԵԶԷԸԹԺ"
E, M, H = "հեշտ", "միջին", "բարձր"


def _norm(s):
    return re.sub(r"\s+", " ", s.strip().lower())


# Boilerplate instructional stems that are EXPECTED to recur verbatim across
# every exam (they carry no exam-specific content — the real content is the
# passage/cloze text or the grammar sentence itself) — exempt from the
# duplicate-fact check so they don't false-positive against earlier exams.
GENERIC_STUB_PATTERNS = [
    re.compile(r"^choose the right option for gap \(\d+\)\."),
    re.compile(r"^choose the word form that best fits gap \(\d+\)\."),
    re.compile(r"^which of the following statements is not true according to the text"),
    re.compile(r"^the overall tone of the text can best be described as"),
    re.compile(r"^which of the sentences gives the main idea"),
    re.compile(r"^the pronoun \w+ in line \d+ stands for"),
    re.compile(r"^the word [\w'-]+ in line \d+ (may best be replaced by|is synonymous to)"),
    re.compile(r"^blank \(\S+\)"),
]


def _is_generic(text):
    key = _norm(text)
    return any(p.match(key) for p in GENERIC_STUB_PATTERNS)


def load_registry():
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            return json.load(f)
    return {
        "reading_topics": [], "cloze_topics": [], "wordform_topics": [], "wordbank_topics": [],
        "single_choice": [], "multi_statement": [], "matching_left": [],
        "vocab_words": [], "sentence_matching_topics": [],
    }


def save_registry(reg):
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(reg, f, ensure_ascii=False, indent=2)


class Builder:
    """One instance per exam. Call mc/ms/match_q/passage_mc to accumulate
    questions, register_topic() for passage/cloze/vocab/sentence-matching
    topics, then validate()+emit()."""

    def __init__(self, exam_id, title, registry):
        self.exam_id = exam_id
        self.title = title
        self.registry = registry
        self.cur = []
        self._pos_counter = 0
        self.new_topics = {k: [] for k in registry}
        self.dupes = []

    def _correct_pos(self, nopt=4):
        p = self._pos_counter % nopt
        self._pos_counter += 1
        return p

    def register_topic(self, kind, value):
        """kind: reading_topics|cloze_topics|wordform_topics|vocab_words|sentence_matching_topics"""
        key = _norm(value)
        if key in self.registry[kind] or key in self.new_topics[kind]:
            self.dupes.append((kind, value))
        else:
            self.new_topics[kind].append(key)

    def _check_text(self, kind, text):
        if kind in ("single_choice", "matching_left") and _is_generic(text):
            return
        key = _norm(text)
        if key in self.registry[kind] or key in self.new_topics[kind]:
            self.dupes.append((kind, text[:60]))
        else:
            self.new_topics[kind].append(key)

    def mc(self, number, topic, diff, question, correct, wrongs, hint, steps, group=None):
        assert len(wrongs) == 3, f"Q{number}: need exactly 3 wrong options"
        opts_set = set(wrongs)
        assert correct not in opts_set, f"Q{number}: correct duplicates a wrong option"
        assert len(opts_set) == 3, f"Q{number}: wrong options not distinct"
        self._check_text("single_choice", question)
        pos = self._correct_pos(4)
        opts = wrongs[:]
        opts.insert(pos, correct)
        self.cur.append({"number": number, "topic": topic, "group": group, "type": "single_choice",
                          "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                          "options": opts, "correct_option": ARM[pos]})

    def ms(self, number, topic, diff, question, statements, true_idx, hint, steps):
        for s in statements:
            self._check_text("multi_statement", s)
        labelled = [f"{ARM[i]}) {s}" for i, s in enumerate(statements)]
        idxs = sorted(true_idx)
        corr = (", ".join(ARM[i] for i in idxs[:-1]) + " և " + ARM[idxs[-1]]) if len(idxs) > 1 else ARM[idxs[0]]
        self.cur.append({"number": number, "topic": topic, "group": None, "type": "multi_statement",
                          "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                          "statements": labelled, "correct_option": corr})

    def match_q(self, number, topic, diff, question, lefts, rights, hint, steps):
        for t, _ in lefts:
            self._check_text("matching_left", t)
        left_items = [{"label": ARM[i], "text": t, "target": target} for i, (t, target) in enumerate(lefts)]
        right_items = [{"text": t} for t in rights]
        self.cur.append({"number": number, "topic": topic, "group": None, "type": "matching",
                          "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                          "left": left_items, "right": right_items})

    def passage_mc(self, passage, group_key, topic, items):
        first_n, last_n = items[0][0], items[-1][0]
        note = (f"Հարցեր {first_n}-{last_n}-ը վերաբերում են վերևում նշված տեքստին։\n"
                f"Questions {first_n}-{last_n} refer to the text above.")
        for i, (number, diff, stub, correct, wrongs, hint, steps) in enumerate(items):
            text = f"{passage}\n\n{stub}\n\n{note}" if i == 0 else f"{stub}\n\n{note}"
            self.mc(number, topic, diff, text, correct, wrongs, hint, steps, group=group_key)

    def validate(self, n_questions=80):
        self.cur.sort(key=lambda q: q["number"])
        assert [q["number"] for q in self.cur] == list(range(1, n_questions + 1)), \
            [q["number"] for q in self.cur]
        for q in self.cur:
            if q["type"] == "single_choice":
                assert len(q["options"]) == 4, q["number"]
                assert len(set(q["options"])) == 4, ("dup options", q["number"])
                assert q["correct_option"] in ARM[:4], q["number"]
            if q["type"] == "multi_statement":
                assert len(q["statements"]) == 5, q["number"]
            if q["type"] == "matching":
                assert 4 <= len(q["left"]) <= 5, q["number"]
                assert len(q["right"]) >= len(q["left"]), q["number"]
                targets = [item["target"] for item in q["left"]]
                assert all(1 <= t <= len(q["right"]) for t in targets), q["number"]
                assert len(set(targets)) == len(targets), ("dup targets", q["number"])
        cyr = re.compile(r"[Ѐ-ӿ]")
        bad = [(q["number"], cyr.search(json.dumps(q, ensure_ascii=False)).group(0))
               for q in self.cur if cyr.search(json.dumps(q, ensure_ascii=False))]
        assert not bad, f"Cyrillic hit(s): {bad}"
        return self.dupes

    def emit(self, save_registry_too=True):
        exam = {"exam_id": self.exam_id, "title": self.title, "question_count": len(self.cur),
                "subject": "english", "questions": self.cur}
        out_path = os.path.join(OUT_DIR, f"{self.exam_id.lower().replace('-', '_')}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(exam, f, ensure_ascii=False, indent=2)
        if save_registry_too:
            for kind, vals in self.new_topics.items():
                self.registry[kind].extend(vals)
            save_registry(self.registry)
        return out_path
