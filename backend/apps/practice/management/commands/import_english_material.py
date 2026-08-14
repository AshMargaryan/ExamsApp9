import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.practice.english_manifest import load_flat_lists, load_manifest
from apps.practice.models import Subject, Domain, Topic, Subtopic

DEFAULT_MATERIAL_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "english" / "material"
)
DEFAULT_SUBJECT_NAME = "Անգլերեն"

# The source .md files cross-reference other subtopics by their manifest
# slug — usually bold ("**eng009**-ում") but sometimes bare prose ("(հղում
# eng008)") or pointing at one specific worked example within that other
# subtopic ("eng009-h2") — since the slug is the only stable identifier
# available to whoever authored the material (a DB row id doesn't exist,
# and isn't portable, until import time). Resolved into a real markdown
# link to that subtopic's actual page here, at import time, rather than
# baking a numeric id into the source file — ids can differ between a
# fresh import and this one, but the slug -> DB row lookup always matches
# whatever the current database actually has. Only the "engNNN" part is
# ever consumed — a trailing "-h2" or similar stays as plain text right
# after the link.
CROSS_REF_SLUG = re.compile(r"\*{0,2}\b(eng\d{3})\b\*{0,2}")
# A cross-reference is very often immediately followed by a parenthetical
# repeating the same subtopic's name (e.g. "**eng009**-ում (Present Perfect
# / Perfect Continuous)") — redundant once the name is already the link
# text, so it's dropped, but ONLY when it actually matches the resolved
# name (many parentheticals after a reference are unrelated examples, e.g.
# "(although/despite/however)", and must be left alone).
REDUNDANT_PAREN = re.compile(
    r"\[(?P<name>[^\]]+)\]\((?P<url>[^)]+)\)(?P<mid>[^\n(]{0,40})\n?[ \t]*\((?P<paren>[^)]+)\)"
)


def linkify_subtopic_cross_references(text: str, slug_to_subtopic: dict) -> str:
    def replace_ref(match: re.Match) -> str:
        subtopic = slug_to_subtopic.get(match.group(1))
        if subtopic is None:
            return match.group(0)
        return f"[{subtopic.name}](/practice/subtopic/{subtopic.id})"

    text = CROSS_REF_SLUG.sub(replace_ref, text)

    def normalize(s: str) -> str:
        return re.sub(r"\s+", " ", s).strip().lower()

    def strip_redundant_paren(match: re.Match) -> str:
        if normalize(match.group("paren")) == normalize(match.group("name")):
            return f"[{match.group('name')}]({match.group('url')}){match.group('mid')}"
        return match.group(0)

    return REDUNDANT_PAREN.sub(strip_redundant_paren, text)


class Command(BaseCommand):
    help = (
        "Import English domain/topic intro text and subtopic learning material "
        "from data_scripts/scripts/english/material/{domains,topics,subtopics}/*.md. "
        "Domain/topic files are keyed by domNN/topNN (first-appearance order in "
        "manifest_english.json, see material/reference.txt); subtopic files are "
        "keyed directly by the manifest slug (e.g. eng000.md)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override material dir")
        parser.add_argument("--subject", type=str, default=DEFAULT_SUBJECT_NAME)

    def handle(self, *args, **options):
        material_dir = Path(options["dir"]) if options["dir"] else DEFAULT_MATERIAL_DIR
        subject_name = options["subject"]

        try:
            subject = Subject.objects.get(name=subject_name)
        except Subject.DoesNotExist:
            self.stdout.write(self.style.ERROR(
                f"Subject not found: {subject_name} — run import_english_subtopics first"
            ))
            return

        domains, topics = load_flat_lists()

        domains_imported, domains_missing = self._import_domains(material_dir, subject, domains)
        topics_imported, topics_missing = self._import_topics(material_dir, subject, topics)
        subtopics_imported, subtopics_missing = self._import_subtopics(material_dir, subject)

        self.stdout.write(self.style.SUCCESS(
            f"Done. domains: {domains_imported}, topics: {topics_imported}, "
            f"subtopics: {subtopics_imported} updated."
        ))
        for label, missing in (
            ("domain", domains_missing), ("topic", topics_missing), ("subtopic", subtopics_missing),
        ):
            if missing:
                self.stdout.write(f"{len(missing)} {label} file(s) not yet written: {', '.join(missing)}")

    def _import_domains(self, material_dir, subject, domains):
        imported = 0
        missing = []
        for i, domain_name in enumerate(domains):
            slug = f"dom{i:02d}"
            file_path = material_dir / "domains" / f"{slug}.md"
            if not file_path.exists():
                missing.append(f"{slug} ({domain_name})")
                continue
            try:
                domain = Domain.objects.get(subject=subject, name=domain_name)
            except Domain.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"{slug}: domain not found in DB ({domain_name})"))
                continue
            domain.intro_text = file_path.read_text(encoding="utf-8").strip()
            domain.save(update_fields=["intro_text"])
            imported += 1
        return imported, missing

    def _import_topics(self, material_dir, subject, topics):
        imported = 0
        missing = []
        for i, (domain_name, topic_name) in enumerate(topics):
            slug = f"top{i:02d}"
            file_path = material_dir / "topics" / f"{slug}.md"
            if not file_path.exists():
                missing.append(f"{slug} ({domain_name} / {topic_name})")
                continue
            try:
                topic = Topic.objects.get(
                    domain__subject=subject, domain__name=domain_name, name=topic_name,
                )
            except Topic.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"{slug}: topic not found in DB ({domain_name} / {topic_name})"
                ))
                continue
            topic.intro_text = file_path.read_text(encoding="utf-8").strip()
            topic.save(update_fields=["intro_text"])
            imported += 1
        return imported, missing

    def _import_subtopics(self, material_dir, subject):
        imported = 0
        missing = []

        # Resolved up front, over the whole manifest, so a subtopic's
        # material can cross-reference one that appears later in the
        # manifest too (see linkify_subtopic_cross_references).
        slug_to_subtopic = {}
        for entry in load_manifest():
            try:
                slug_to_subtopic[entry["slug"]] = Subtopic.objects.get(
                    topic__domain__subject=subject,
                    topic__domain__name=entry["domain"],
                    topic__name=entry["topic"],
                    name=entry["subtopic"],
                )
            except Subtopic.DoesNotExist:
                continue

        for entry in load_manifest():
            slug = entry["slug"]
            file_path = material_dir / "subtopics" / f"{slug}.md"
            if not file_path.exists():
                missing.append(f"{slug} ({entry['subtopic']})")
                continue
            subtopic = slug_to_subtopic.get(slug)
            if subtopic is None:
                self.stdout.write(self.style.WARNING(
                    f"{slug}: subtopic not found in DB ({entry['domain']} / "
                    f"{entry['topic']} / {entry['subtopic']}) — import questions first"
                ))
                continue
            raw = file_path.read_text(encoding="utf-8").strip()
            subtopic.learning_material = linkify_subtopic_cross_references(raw, slug_to_subtopic)
            subtopic.save(update_fields=["learning_material"])
            imported += 1
        return imported, missing
