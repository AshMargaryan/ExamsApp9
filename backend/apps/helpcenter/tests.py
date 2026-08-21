from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Article, Category, SearchQuery, SupportTicket, TicketAttachment, TicketStatus

User = get_user_model()


def _make_user(username="alice", email="alice@example.com"):
    return User.objects.create_user(username=username, email=email, password="pw123456")


def _make_category(key="account", name="Հաշիվ"):
    return Category.objects.create(key=key, name=name)


def _make_article(category, slug="reset-password", title="Ինչպե՞ս փոխել գաղտնաբառը", **kwargs):
    return Article.objects.create(category=category, slug=slug, title=title, content="Բովանդակություն", **kwargs)


class ArticleBrowsingApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.category = _make_category()

    def test_category_list_counts_only_published_articles(self):
        _make_article(self.category, slug="a1", title="Article 1", is_published=True)
        _make_article(self.category, slug="a2", title="Article 2", is_published=False)

        resp = self.client.get("/api/help/categories/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["article_count"], 1)

    def test_category_detail_lists_its_published_articles(self):
        _make_article(self.category, slug="a1", title="Article 1", is_published=True)
        _make_article(self.category, slug="a2", title="Article 2", is_published=False)

        resp = self.client.get(f"/api/help/categories/{self.category.key}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["articles"]), 1)
        self.assertEqual(resp.data["articles"][0]["slug"], "a1")

    def test_article_detail_increments_view_count(self):
        article = _make_article(self.category)
        self.client.get(f"/api/help/articles/{article.slug}/")
        self.client.get(f"/api/help/articles/{article.slug}/")
        resp = self.client.get(f"/api/help/articles/{article.slug}/")
        self.assertEqual(resp.data["view_count"], 3)

    def test_unpublished_article_is_not_found(self):
        article = _make_article(self.category, is_published=False)
        resp = self.client.get(f"/api/help/articles/{article.slug}/")
        self.assertEqual(resp.status_code, 404)

    def test_article_feedback_updates_helpful_count(self):
        article = _make_article(self.category)
        resp = self.client.post(f"/api/help/articles/{article.slug}/feedback/", {"is_helpful": True})
        self.assertEqual(resp.status_code, 204)
        article.refresh_from_db()
        self.assertEqual(article.helpful_count, 1)
        self.assertEqual(article.unhelpful_count, 0)

    def test_article_feedback_unhelpful_with_reason(self):
        article = _make_article(self.category)
        resp = self.client.post(
            f"/api/help/articles/{article.slug}/feedback/",
            {"is_helpful": False, "reason": "outdated"},
        )
        self.assertEqual(resp.status_code, 204)
        article.refresh_from_db()
        self.assertEqual(article.unhelpful_count, 1)

    def test_search_logs_query_and_returns_matches(self):
        _make_article(self.category, slug="reset-pw", title="Գաղտնաբառի վերականգնում")
        _make_article(self.category, slug="billing", title="Վճարումներ")

        resp = self.client.get("/api/help/search/", {"q": "գաղտնաբառ"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["slug"], "reset-pw")

        logged = SearchQuery.objects.get(query="գաղտնաբառ")
        self.assertEqual(logged.results_count, 1)
        self.assertEqual(logged.user, self.user)

    def test_popular_articles_ordered_by_view_count(self):
        low = _make_article(self.category, slug="low", title="Low", view_count=1)
        high = _make_article(self.category, slug="high", title="High", view_count=10)

        resp = self.client.get("/api/help/articles/popular/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["slug"], high.slug)
        self.assertEqual(resp.data[1]["slug"], low.slug)


class SupportTicketApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.other_user = _make_user(username="bob", email="bob@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_ticket_and_list_own_tickets(self):
        resp = self.client.post("/api/help/tickets/", {
            "category": "account", "description": "Չեմ կարողանում մուտք գործել։",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["description"], "Չեմ կարողանում մուտք գործել։")
        self.assertEqual(resp.data["status"], "open")

        list_resp = self.client.get("/api/help/tickets/")
        self.assertEqual(list_resp.status_code, 200)
        self.assertEqual(len(list_resp.data), 1)

    def test_ticket_subject_defaults_from_description(self):
        resp = self.client.post("/api/help/tickets/", {
            "category": "bug", "description": "Ինչ-որ բան չի աշխատում",
        })
        self.assertEqual(resp.data["subject"], "Ինչ-որ բան չի աշխատում")

    def test_cannot_see_another_users_ticket(self):
        ticket = SupportTicket.objects.create(user=self.other_user, category="account", description="x")
        resp = self.client.get(f"/api/help/tickets/{ticket.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_reply_reopens_ticket_waiting_for_you(self):
        ticket = SupportTicket.objects.create(
            user=self.user, category="account", description="x", status=TicketStatus.WAITING_FOR_YOU,
        )
        resp = self.client.post(f"/api/help/tickets/{ticket.id}/messages/", {"text": "Դեռ խնդիր կա"})
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(resp.data["is_staff"])

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TicketStatus.IN_PROGRESS)

    def test_reply_reopens_resolved_ticket(self):
        """"Resolved" is support's opinion; a reply is the student disagreeing."""
        ticket = SupportTicket.objects.create(
            user=self.user, category="account", description="x", status=TicketStatus.RESOLVED,
        )
        resp = self.client.post(f"/api/help/tickets/{ticket.id}/messages/", {"text": "Դեռ չի աշխատում"})
        self.assertEqual(resp.status_code, 201)

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TicketStatus.IN_PROGRESS)

    def test_reply_does_not_reopen_closed_ticket(self):
        ticket = SupportTicket.objects.create(
            user=self.user, category="account", description="x", status=TicketStatus.CLOSED,
        )
        self.client.post(f"/api/help/tickets/{ticket.id}/messages/", {"text": "Բարև"})

        ticket.refresh_from_db()
        self.assertEqual(ticket.status, TicketStatus.CLOSED)

    def test_staff_reply_is_attributed_to_support_not_the_student(self):
        """A support agent who replies under their own account (which the admin
        inline lets them do) must not appear in the thread as the student."""
        from .models import TicketMessage

        ticket = SupportTicket.objects.create(user=self.user, category="account", description="x")
        TicketMessage.objects.create(ticket=ticket, sender=self.other_user, text="Բարև, ի՞նչ է եղել")
        TicketMessage.objects.create(ticket=ticket, sender=None, text="Ավտոմատ պատասխան")
        TicketMessage.objects.create(ticket=ticket, sender=self.user, text="Ահա մանրամասները")

        resp = self.client.get(f"/api/help/tickets/{ticket.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([m["is_staff"] for m in resp.data["messages"]], [True, True, False])

    def test_reply_requires_text_or_files(self):
        ticket = SupportTicket.objects.create(user=self.user, category="account", description="x")
        resp = self.client.post(f"/api/help/tickets/{ticket.id}/messages/", {})
        self.assertEqual(resp.status_code, 400)

    def test_ticket_with_ai_escalation_context(self):
        resp = self.client.post("/api/help/tickets/", {
            "category": "ai", "description": "AI-ն սխալ պատասխանեց",
            "source_article_slugs": ["reset-password"], "ai_context": "Օգտատերը հարցրել է X-ի մասին",
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["source_article_slugs"], ["reset-password"])

    def test_ticket_with_diagnostic_info_json_string(self):
        # The frontend sends diagnostic_info as a JSON-encoded string field
        # inside a multipart body (like a real browser form submission) —
        # not as a nested dict, which the Django/DRF test client's default
        # multipart encoding can't represent anyway.
        resp = self.client.post("/api/help/tickets/", {
            "category": "bug", "description": "Crash on submit",
            "diagnostic_info": '{"user_agent": "Mozilla/5.0", "page": "/practice"}',
        })
        self.assertEqual(resp.status_code, 201)

        ticket = SupportTicket.objects.get(pk=resp.data["id"])
        self.assertEqual(ticket.diagnostic_info, {"user_agent": "Mozilla/5.0", "page": "/practice"})


class TicketAttachmentValidationTests(TestCase):
    """Support-ticket uploads land in MEDIA_ROOT, which nginx serves at
    /media/ on the app's own origin — so an attachment the browser will run
    as a document is stored XSS against every user, and the JWTs live in
    localStorage. These uploads previously had no validation at all."""

    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _post(self, upload):
        return self.client.post(
            "/api/help/tickets/",
            {"category": "account", "description": "test", "files": upload},
            format="multipart",
        )

    def test_html_attachment_is_rejected(self):
        evil = SimpleUploadedFile(
            "evil.html", b"<script>alert(document.domain)</script>", content_type="text/html"
        )

        response = self._post(evil)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TicketAttachment.objects.exists())

    def test_svg_attachment_is_rejected(self):
        evil = SimpleUploadedFile(
            "evil.svg",
            b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
            content_type="image/svg+xml",
        )

        response = self._post(evil)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TicketAttachment.objects.exists())

    def test_html_disguised_with_an_allowed_extension_is_rejected(self):
        """The extension allowlist alone is not enough — the real type is
        sniffed from the bytes, so renaming the payload doesn't get it in."""
        disguised = SimpleUploadedFile(
            "notevil.png", b"<html><script>alert(1)</script></html>", content_type="image/png"
        )

        response = self._post(disguised)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TicketAttachment.objects.exists())

    def test_oversized_attachment_is_rejected(self):
        huge = SimpleUploadedFile(
            "big.png", b"\x89PNG\r\n\x1a\n" + b"0" * (21 * 1024 * 1024), content_type="image/png"
        )

        response = self._post(huge)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(TicketAttachment.objects.exists())

    def test_genuine_png_is_accepted_and_stores_the_sniffed_mime(self):
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        # Lies about its type; the stored mime must come from the bytes.
        good = SimpleUploadedFile("real.png", png_bytes, content_type="text/html")

        response = self._post(good)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TicketAttachment.objects.get().mime_type, "image/png")

class HelpRegisterCommandTests(TestCase):
    """`fix_help_register` converts the register, and only the register.

    The risk this guards is the one DESIGN.md §4 records: a blanket sweep over
    `-եք` would rewrite a genuine plural into a grammatical error, so the
    command works from a reviewed table of exact strings. These assert that it
    changes what it should, leaves a real plural alone, and is safe to rerun.
    """

    def setUp(self):
        self.category = _make_category(key="ai-assistant", name="AI Օգնական")

    def _article(self, *, slug, summary, content):
        return Article.objects.create(
            category=self.category, slug=slug, title="Ինչպե՞ս", summary=summary, content=content
        )

    def _run(self, **opts):
        out = StringIO()
        call_command("fix_help_register", stdout=out, **opts)
        return out.getvalue()

    def test_converts_the_formal_register(self):
        article = self._article(
            slug="ask-ai",
            summary="AI Օգնականը կարող է օգնել ձեզ ուսումնական հարցերում։",
            content="Բացեք **AI Օգնական** բաժինը և գրեք ձեր հարցը։",
        )

        self._run()

        article.refresh_from_db()
        self.assertEqual(article.summary, "AI Օգնականը կարող է օգնել քեզ ուսումնական հարցերում։")
        self.assertEqual(article.content, "Բացիր **AI Օգնական** բաժինը և գրիր քո հարցը։")

    def test_dry_run_writes_nothing(self):
        article = self._article(
            slug="ask-ai",
            summary="AI Օգնականը կարող է օգնել ձեզ ուսումնական հարցերում։",
            content="Բացեք **AI Օգնական** բաժինը և գրեք ձեր հարցը։",
        )

        output = self._run(dry_run=True)

        article.refresh_from_db()
        self.assertIn("would be updated", output)
        self.assertIn("ձեզ", article.summary)

    def test_rerunning_changes_nothing(self):
        self._article(
            slug="ask-ai",
            summary="AI Օգնականը կարող է օգնել ձեզ ուսումնական հարցերում։",
            content="Բացեք **AI Օգնական** բաժինը և գրեք ձեր հարցը։",
        )
        self._run()

        output = self._run()

        self.assertIn("0 article(s) updated", output)

    def test_leaves_a_genuine_plural_alone(self):
        """"ընկերներ եք" is two people, not politeness."""
        article = self._article(
            slug="friends-note",
            summary="Դուք և Անին այժմ ընկերներ եք։",
            content="Դուք և Անին այժմ ընկերներ եք։",
        )

        output = self._run()

        article.refresh_from_db()
        self.assertEqual(article.content, "Դուք և Անին այժմ ընկերներ եք։")
        # Reported for a human to judge, never rewritten.
        self.assertIn("friends-note", output)

    def test_reports_an_article_the_table_has_never_seen(self):
        self._article(
            slug="unknown-article",
            summary="Խնդրում ենք ուղարկեք ձեր հարցը։",
            content="Սեղմեք կոճակը։",
        )

        output = self._run()

        self.assertIn("unknown-article", output)
        self.assertIn("Still reads as formal", output)
