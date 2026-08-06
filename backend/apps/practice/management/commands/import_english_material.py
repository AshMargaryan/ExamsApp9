from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.practice.english_manifest import load_flat_lists, load_manifest
from apps.practice.models import Subject, Domain, Topic, Subtopic

DEFAULT_MATERIAL_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "english" / "material"
)
DEFAULT_SUBJECT_NAME = "Անգլերեն"


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
        for entry in load_manifest():
            slug = entry["slug"]
            file_path = material_dir / "subtopics" / f"{slug}.md"
            if not file_path.exists():
                missing.append(f"{slug} ({entry['subtopic']})")
                continue
            try:
                subtopic = Subtopic.objects.get(
                    topic__domain__subject=subject,
                    topic__domain__name=entry["domain"],
                    topic__name=entry["topic"],
                    name=entry["subtopic"],
                )
            except Subtopic.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"{slug}: subtopic not found in DB ({entry['domain']} / "
                    f"{entry['topic']} / {entry['subtopic']}) — import questions first"
                ))
                continue
            subtopic.learning_material = file_path.read_text(encoding="utf-8").strip()
            subtopic.save(update_fields=["learning_material"])
            imported += 1
        return imported, missing
