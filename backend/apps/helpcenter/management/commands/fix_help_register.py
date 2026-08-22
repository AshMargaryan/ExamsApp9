"""Convert help-centre article copy from the formal register to "դու".

Why this is a management command and not a data file
----------------------------------------------------
Every other body of content in this product is authored in JSON under
``apps/*/data/`` and imported idempotently — the mock exams, the flashcard
decks, the learning material. The help centre is the exception: there is no
seed file, no fixture, and ``helpcenter/migrations/0001_initial.py`` carries no
data. The articles exist **only in whichever database they were typed into**,
so a file change could not reach them and this command is the only reproducible
way to apply the fix.

Why the rewrites are a table and not a rule
-------------------------------------------
The obvious implementation — regex the ``-եք`` imperative ending and the
``ձեր``/``ձեզ`` pronouns — is wrong, and DESIGN.md §4 records why: **not every
``եք`` is formal.** "Դուք և {name} այժմ ընկերներ եք" is two people, not
politeness, and a blanket sweep turns a correct plural into a grammatical
error. So each rewrite below is an exact string, reviewed once, applied only
where it matches.

That leaves the risk that a database contains articles this table has never
seen. The command therefore also *reports* anything that still looks formal
after the pass, without touching it — so the gap is visible rather than
silently skipped.

Idempotent: a rewrite whose "before" is absent is a no-op, and rerunning after
a successful pass changes nothing and exits reporting zero changes.

    python manage.py fix_help_register --dry-run   # report only
    python manage.py fix_help_register             # apply
"""

import re

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.helpcenter.models import Article, Category

# (slug, field, before, after). Reviewed individually; see the module docstring.
REWRITES = [
    # --- reset-password ----------------------------------------------------
    ("reset-password", "content", "1. Բացեք **Կարգավորումներ**", "1. Բացիր **Կարգավորումներ**"),
    ("reset-password", "content", "2. Սեղմեք *Փոխել գաղտնաբառը*", "2. Սեղմիր *Փոխել գաղտնաբառը*"),
    ("reset-password", "content", "3. Մուտքագրեք նոր գաղտնաբառ", "3. Մուտքագրիր նոր գաղտնաբառ"),
    # Armenian ends an exclamation with ՜ over the stressed vowel, never with
    # a Latin "!". The sentence is a plain statement, so it takes ։.
    ("reset-password", "content", "Այսքանն է!", "Այսքանն է։"),
    # --- delete-account ----------------------------------------------------
    (
        "delete-account",
        "summary",
        "Ինչ անել, եթե ցանկանում եք ջնջել ձեր հաշիվը։",
        "Ինչ անել, եթե ցանկանում ես ջնջել քո հաշիվը։",
    ),
    (
        "delete-account",
        "content",
        "Դիմեք աջակցության թիմին հաշիվը ջնջելու համար։",
        "Դիմիր աջակցության թիմին հաշիվը ջնջելու համար։",
    ),
    # --- ask-ai ------------------------------------------------------------
    (
        "ask-ai",
        "summary",
        "AI Օգնականը կարող է օգնել ձեզ ուսումնական հարցերում։",
        "AI Օգնականը կարող է օգնել քեզ ուսումնական հարցերում։",
    ),
    (
        "ask-ai",
        "content",
        "Բացեք **AI Օգնական** բաժինը և գրեք ձեր հարցը։",
        "Բացիր **AI Օգնական** բաժինը և գրիր քո հարցը։",
    ),
]

# Markers that *suggest* the formal register. Deliberately a reporting aid, not
# a rewriting rule: "ընկերներ եք" is a true plural and must survive untouched,
# which is exactly why nothing below is applied automatically.
FORMAL_HINTS = [
    (re.compile(r"\bՁ?ձեր\b", re.IGNORECASE), "ձեր"),
    (re.compile(r"\bՁ?ձեզ\b", re.IGNORECASE), "ձեզ"),
    (re.compile(r"\bՁ?դուք\b", re.IGNORECASE), "Դուք"),
    # Second-person-plural imperative: a verb stem followed by -եք at a word
    # boundary. Catches Բացեք / Սեղմեք / Դիմեք and also, unavoidably, real
    # plurals — which is the point of only reporting it.
    (re.compile(r"\b\w{2,}եք\b"), "-եք (imperative or plural — check by hand)"),
]

FIELDS = ("title", "summary", "content")


class Command(BaseCommand):
    help = "Rewrite help-centre articles from the formal register to \"դու\"."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        by_slug = {a.slug: a for a in Article.objects.all()}

        changed_articles = {}
        missing_slugs = set()
        already_applied = 0

        for slug, field, before, after in REWRITES:
            article = by_slug.get(slug)
            if article is None:
                missing_slugs.add(slug)
                continue
            value = getattr(article, field)
            if before not in value:
                if after in value:
                    already_applied += 1
                continue
            setattr(article, field, value.replace(before, after))
            changed_articles.setdefault(article.pk, (article, set()))[1].add(field)

        if changed_articles:
            self.stdout.write(self.style.MIGRATE_HEADING("Rewrites"))
            for article, fields in changed_articles.values():
                self.stdout.write(f"  {article.slug}: {', '.join(sorted(fields))}")
            if not dry_run:
                with transaction.atomic():
                    for article, fields in changed_articles.values():
                        article.save(update_fields=sorted(fields))
        self.stdout.write(
            f"{len(changed_articles)} article(s) "
            f"{'would be updated' if dry_run else 'updated'}; "
            f"{already_applied} rewrite(s) already applied."
        )

        if missing_slugs:
            self.stdout.write(
                self.style.WARNING(
                    "Not in this database (nothing to do): " + ", ".join(sorted(missing_slugs))
                )
            )

        self._report_remaining(by_slug.values())

    def _report_remaining(self, articles):
        """Flag copy that still looks formal, so a database holding articles
        this table has never seen does not pass silently.

        Runs against the in-memory objects, which already carry the rewrites
        whether or not they were saved — so `--dry-run` reports what would be
        *left*, not the problems it is about to fix.
        """
        findings = []
        for article in articles:
            for field in FIELDS:
                value = getattr(article, field)
                for pattern, label in FORMAL_HINTS:
                    for match in pattern.finditer(value):
                        findings.append((f"article/{article.slug}", field, match.group(0), label))
        for category in Category.objects.all():
            for field in ("name", "description"):
                value = getattr(category, field)
                for pattern, label in FORMAL_HINTS:
                    for match in pattern.finditer(value):
                        findings.append((f"category/{category.key}", field, match.group(0), label))

        if not findings:
            self.stdout.write(self.style.SUCCESS("No formal-register markers remain."))
            return

        self.stdout.write(
            self.style.WARNING(
                "\nStill reads as formal — review by hand, and add a rewrite to "
                "REWRITES in this command so the change is reproducible:"
            )
        )
        for where, field, token, label in findings:
            self.stdout.write(f"  {where}.{field}: {token!r}  [{label}]")
