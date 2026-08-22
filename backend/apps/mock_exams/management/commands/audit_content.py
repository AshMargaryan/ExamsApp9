"""
Reports editorial defects in the mock-exam JSON bank. Read-only.

    python manage.py audit_content
    python manage.py audit_content --subject math --severity critical
    python manage.py audit_content --json /tmp/findings.json
"""
import collections
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.mock_exams.audit import Auditor

DEFAULT_EXAMS_DIR = settings.BASE_DIR / "apps" / "mock_exams" / "data" / "exams"

SEVERITY_ORDER = ["critical", "high", "medium", "low"]


class Command(BaseCommand):
    help = "Audit mock-exam content for correctness, language and methodology defects."

    def add_arguments(self, parser):
        parser.add_argument("--dir", default=None)
        parser.add_argument("--subject", default=None)
        parser.add_argument("--severity", default=None, choices=SEVERITY_ORDER)
        parser.add_argument("--code", default=None)
        parser.add_argument("--json", dest="json_out", default=None)
        parser.add_argument("--limit", type=int, default=25)

    def handle(self, *args, **o):
        root = Path(o["dir"]) if o["dir"] else DEFAULT_EXAMS_DIR
        auditor = Auditor()
        findings = auditor.audit_dir(root)

        if o["subject"]:
            findings = [f for f in findings if f.subject == o["subject"]]
        if o["severity"]:
            findings = [f for f in findings if f.severity == o["severity"]]
        if o["code"]:
            findings = [f for f in findings if f.code == o["code"]]

        by_code = collections.Counter(f.code for f in findings)
        by_sev = collections.Counter(f.severity for f in findings)
        by_subj = collections.Counter(f.subject for f in findings)
        cross = collections.Counter((f.subject, f.code) for f in findings)

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n{len(findings)} findings\n"))

        self.stdout.write("By severity:")
        for s in SEVERITY_ORDER:
            if by_sev.get(s):
                self.stdout.write(f"  {s:9} {by_sev[s]:6}")

        self.stdout.write("\nBy code:")
        for c, n in by_code.most_common():
            self.stdout.write(f"  {c:9} {n:6}")

        self.stdout.write("\nBy subject:")
        for s, n in by_subj.most_common():
            self.stdout.write(f"  {s:10} {n:6}")

        self.stdout.write("\nSubject x code:")
        codes = [c for c, _ in by_code.most_common()]
        header = "  {:10}".format("") + "".join(f"{c:>10}" for c in codes)
        self.stdout.write(header)
        for s, _ in by_subj.most_common():
            row = f"  {s:10}" + "".join(f"{cross.get((s, c), 0):>10}" for c in codes)
            self.stdout.write(row)

        if o["limit"]:
            self.stdout.write("\nSamples:")
            shown = 0
            for sev in SEVERITY_ORDER:
                for f in findings:
                    if f.severity != sev:
                        continue
                    self.stdout.write(
                        f"  [{f.severity}/{f.code}] {f.path}#{f.number} ({f.subject}): {f.detail}"
                    )
                    shown += 1
                    if shown >= o["limit"]:
                        break
                if shown >= o["limit"]:
                    break

        if o["json_out"]:
            Path(o["json_out"]).write_text(
                json.dumps([f.__dict__ for f in findings], ensure_ascii=False, indent=1),
                encoding="utf-8",
            )
            self.stdout.write(self.style.SUCCESS(f"\nWrote {o['json_out']}"))
