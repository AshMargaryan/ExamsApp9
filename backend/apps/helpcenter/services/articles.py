from django.db.models import F, Q

from ..models import Article, ArticleFeedback, SearchQuery


def search_articles(query, user=None):
    """Published articles matching `query` in title/summary/content/tags,
    logging the query (and its result count) so zero-result searches show up
    in admin as a "search gap" signal — see SearchQuery's docstring."""
    query = (query or "").strip()
    qs = Article.objects.filter(is_published=True)
    results = (
        qs.filter(
            Q(title__icontains=query) | Q(summary__icontains=query) |
            Q(content__icontains=query) | Q(tags__contains=[query])
        ).distinct()
        if query else qs.none()
    )

    SearchQuery.objects.create(
        query=query,
        results_count=results.count(),
        user=user if user and user.is_authenticated else None,
    )
    return results


def record_view(article):
    Article.objects.filter(pk=article.pk).update(view_count=F("view_count") + 1)


def submit_feedback(article, user, *, is_helpful, reason="", comment=""):
    ArticleFeedback.objects.create(
        article=article,
        user=user if user and user.is_authenticated else None,
        is_helpful=is_helpful,
        reason=reason,
        comment=comment,
    )
    field = "helpful_count" if is_helpful else "unhelpful_count"
    Article.objects.filter(pk=article.pk).update(**{field: F(field) + 1})
