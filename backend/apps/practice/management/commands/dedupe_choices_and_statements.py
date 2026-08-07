import json
from collections import defaultdict

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.practice.models import Question, AttemptAnswer, DailyProblemAttempt


class Command(BaseCommand):
    """
    One-time cleanup: some questions ended up with extra Choice/Statement rows
    on top of the ones declared in the seed_content fixture — e.g. an old
    import_generated_questions run created rows with one set of PKs, and the
    fixture was later loaded on top with a different set of PKs (loaddata
    inserts by PK, it doesn't clear out rows that aren't in the fixture).
    That leaves questions with 8 choices instead of 4, sometimes showing
    stale/outdated choice text as well as duplicates.

    The fixture is the checked-in source of truth for these questions, so
    for every question it covers we drop any live choice/statement whose id
    isn't one of the fixture's declared PKs.
    """

    help = "Remove Choice/Statement rows not declared in the seed_content fixture."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--fixture", default=None, help="Path to seed_content.json")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        fixture_path = options["fixture"] or str(
            apps.get_app_config("practice").path + "/fixtures/seed_content.json"
        )
        data = json.loads(open(fixture_path, encoding="utf-8").read())

        fixture_choice_ids_by_q = defaultdict(set)
        fixture_statement_ids_by_q = defaultdict(set)
        for row in data:
            if row["model"] == "practice.choice":
                fixture_choice_ids_by_q[row["fields"]["question"]].add(row["pk"])
            elif row["model"] == "practice.statement":
                fixture_statement_ids_by_q[row["fields"]["question"]].add(row["pk"])

        referenced_choice_ids = set(
            AttemptAnswer.objects.exclude(selected_choice=None).values_list("selected_choice_id", flat=True)
        ) | set(
            DailyProblemAttempt.objects.exclude(selected_choice=None).values_list("selected_choice_id", flat=True)
        )
        referenced_statement_ids = set()
        for ids in AttemptAnswer.objects.exclude(selected_statement_ids=[]).values_list(
            "selected_statement_ids", flat=True
        ):
            referenced_statement_ids.update(ids)
        for ids in DailyProblemAttempt.objects.exclude(selected_statement_ids=[]).values_list(
            "selected_statement_ids", flat=True
        ):
            referenced_statement_ids.update(ids)

        choice_ids_to_delete = set()
        stmt_ids_to_delete = set()
        stale_refs = []
        for question in Question.objects.filter(id__in=fixture_choice_ids_by_q).prefetch_related("choices"):
            keep = fixture_choice_ids_by_q[question.id]
            for c in question.choices.all():
                if c.id not in keep:
                    choice_ids_to_delete.add(c.id)
                    if c.id in referenced_choice_ids:
                        stale_refs.append(("choice", question.id, c.id))
        for question in Question.objects.filter(id__in=fixture_statement_ids_by_q).prefetch_related("statements"):
            keep = fixture_statement_ids_by_q[question.id]
            for s in question.statements.all():
                if s.id not in keep:
                    stmt_ids_to_delete.add(s.id)
                    if s.id in referenced_statement_ids:
                        stale_refs.append(("statement", question.id, s.id))

        verb = "Would delete" if dry_run else "Deleting"
        self.stdout.write(
            f"{verb} {len(choice_ids_to_delete)} choice(s), {len(stmt_ids_to_delete)} statement(s)."
        )
        if stale_refs:
            self.stdout.write(self.style.WARNING(
                f"{len(stale_refs)} existing attempt(s) reference a row being removed — "
                "their selected_choice will be nulled / selected_statement_ids will go stale: "
                f"{stale_refs}"
            ))

        if not dry_run:
            with transaction.atomic():
                Choice = apps.get_model("practice", "Choice")
                Statement = apps.get_model("practice", "Statement")
                Choice.objects.filter(id__in=choice_ids_to_delete).delete()
                Statement.objects.filter(id__in=stmt_ids_to_delete).delete()

        self.stdout.write(self.style.SUCCESS("Done."))
