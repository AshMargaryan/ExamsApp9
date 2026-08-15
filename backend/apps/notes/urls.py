from django.urls import path

from . import views

urlpatterns = [
    path("folders/", views.FolderListCreateView.as_view(), name="folder-list"),
    path("folders/<uuid:pk>/", views.FolderDetailView.as_view(), name="folder-detail"),
    path("folders/<uuid:pk>/restore/", views.FolderRestoreView.as_view(), name="folder-restore"),
    path("folders/<uuid:pk>/purge/", views.FolderPurgeView.as_view(), name="folder-purge"),

    path("documents/", views.DocumentListCreateView.as_view(), name="document-list"),
    path("documents/<uuid:pk>/", views.DocumentDetailView.as_view(), name="document-detail"),
    path("documents/<uuid:pk>/restore/", views.DocumentRestoreView.as_view(), name="document-restore"),
    path("documents/<uuid:pk>/purge/", views.DocumentPurgeView.as_view(), name="document-purge"),
    path("documents/<uuid:pk>/duplicate/", views.DocumentDuplicateView.as_view(), name="document-duplicate"),
    path("documents/<uuid:pk>/move/", views.DocumentMoveView.as_view(), name="document-move"),

    path("attachments/", views.AttachmentUploadView.as_view(), name="note-attachment-upload"),
    path(
        "attachments/<uuid:pk>/download/",
        views.DocumentAttachmentDownloadView.as_view(),
        name="note-attachment-download",
    ),
]
