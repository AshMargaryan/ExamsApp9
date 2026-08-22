from django.db.models import Count, Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, Category, SupportTicket, TicketAttachment
from .serializers import (
    ArticleDetailSerializer, ArticleFeedbackInputSerializer, ArticleListSerializer, CategorySerializer,
    TicketCreateSerializer, TicketDetailSerializer, TicketListSerializer, TicketMessageCreateSerializer,
    TicketMessageSerializer,
)
from .services import articles as article_service
from .services import tickets as ticket_service


class CategoryListView(APIView):
    """GET /api/help/categories/ — every category, with its published article count."""

    def get(self, request):
        categories = Category.objects.annotate(
            _article_count=Count("articles", filter=Q(articles__is_published=True))
        )
        return Response(CategorySerializer(categories, many=True).data)


class CategoryDetailView(APIView):
    """GET /api/help/categories/<key>/ — a category plus its published articles."""

    def get(self, request, key):
        category = get_object_or_404(Category, key=key)
        articles = category.articles.filter(is_published=True)
        return Response({
            "category": CategorySerializer(category).data,
            "articles": ArticleListSerializer(articles, many=True).data,
        })


class ArticlePopularView(APIView):
    """GET /api/help/articles/popular/ — top published articles by views, for the help home page."""

    def get(self, request):
        limit = int(request.query_params.get("limit", 6))
        articles = Article.objects.filter(is_published=True).order_by("-view_count")[:limit]
        return Response(ArticleListSerializer(articles, many=True).data)


class ArticleDetailView(APIView):
    """GET /api/help/articles/<slug>/ — full article content; counts as a view."""

    def get(self, request, slug):
        article = get_object_or_404(Article, slug=slug, is_published=True)
        article_service.record_view(article)
        article.refresh_from_db(fields=["view_count"])
        return Response(ArticleDetailSerializer(article).data)


class ArticleFeedbackView(APIView):
    """POST /api/help/articles/<slug>/feedback/ {is_helpful, reason?, comment?} — one vote per submission."""

    def post(self, request, slug):
        article = get_object_or_404(Article, slug=slug, is_published=True)
        serializer = ArticleFeedbackInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        article_service.submit_feedback(article, request.user, **serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArticleSearchView(APIView):
    """GET /api/help/search/?q=... — published articles matching the query; logs the search."""

    def get(self, request):
        query = request.query_params.get("q", "")
        results = article_service.search_articles(query, user=request.user)
        return Response(ArticleListSerializer(results, many=True).data)


class TicketListCreateView(APIView):
    """
    GET /api/help/tickets/ — the caller's own tickets, most recently updated first.
    POST (multipart: category, description, diagnostic_info?, source_article_slugs?,
    ai_context?, files?) — open a new ticket, optionally with attachments and the
    AI-escalation context (see SupportTicket model docstring).
    """

    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        ticket_qs = SupportTicket.objects.filter(user=request.user)
        return Response(TicketListSerializer(ticket_qs, many=True).data)

    def post(self, request):
        # TicketCreateSerializer's diagnostic_info=JSONField parses the raw
        # JSON string straight out of request.data itself (DRF's html-input
        # special-case for JSONField) — don't pre-parse and reassign it here,
        # that round-trips the value through QueryDict's str() and mangles it
        # into a non-JSON Python repr before the field ever sees it.
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticket = ticket_service.create_ticket(
            request.user,
            files=request.FILES.getlist("files"),
            **serializer.validated_data,
        )
        return Response(
            TicketDetailSerializer(ticket, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class TicketDetailView(APIView):
    """GET /api/help/tickets/<id>/ — one ticket with its full message thread."""

    def get(self, request, pk):
        ticket = get_object_or_404(
            SupportTicket.objects.prefetch_related("attachments", "messages__attachments"),
            pk=pk, user=request.user,
        )
        return Response(TicketDetailSerializer(ticket, context={"request": request}).data)


class TicketMessageCreateView(APIView):
    """POST /api/help/tickets/<id>/messages/ (multipart: text?, files?) — reply on an open ticket."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        ticket = get_object_or_404(SupportTicket, pk=pk, user=request.user)
        serializer = TicketMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        files = request.FILES.getlist("files")
        if not serializer.validated_data["text"] and not files:
            return Response(
                {"detail": "Գրեք հաղորդագրություն կամ կցեք ֆայլ։"}, status=status.HTTP_400_BAD_REQUEST
            )

        message = ticket_service.add_message(
            ticket, request.user, text=serializer.validated_data["text"], files=files,
        )
        return Response(
            TicketMessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class TicketAttachmentDownloadView(APIView):
    """GET /api/help/tickets/attachments/<id>/download/ — owner-only, mirrors chat's attachment download guard."""

    def get(self, request, pk):
        attachment = get_object_or_404(TicketAttachment, pk=pk)
        if attachment.ticket.user_id != request.user.id:
            raise Http404
        return FileResponse(
            attachment.file.open("rb"), filename=attachment.original_filename, content_type=attachment.mime_type,
        )
