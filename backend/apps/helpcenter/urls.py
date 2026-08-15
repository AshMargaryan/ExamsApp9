from django.urls import path

from . import views

urlpatterns = [
    path("categories/", views.CategoryListView.as_view(), name="help_category_list"),
    path("categories/<slug:key>/", views.CategoryDetailView.as_view(), name="help_category_detail"),
    path("search/", views.ArticleSearchView.as_view(), name="help_search"),
    path("articles/popular/", views.ArticlePopularView.as_view(), name="help_article_popular"),
    path("articles/<slug:slug>/", views.ArticleDetailView.as_view(), name="help_article_detail"),
    path("articles/<slug:slug>/feedback/", views.ArticleFeedbackView.as_view(), name="help_article_feedback"),
    path("tickets/", views.TicketListCreateView.as_view(), name="help_ticket_list_create"),
    path("tickets/<int:pk>/", views.TicketDetailView.as_view(), name="help_ticket_detail"),
    path("tickets/<int:pk>/messages/", views.TicketMessageCreateView.as_view(), name="help_ticket_message_create"),
    path(
        "tickets/attachments/<int:pk>/download/",
        views.TicketAttachmentDownloadView.as_view(),
        name="help_ticket_attachment_download",
    ),
]
