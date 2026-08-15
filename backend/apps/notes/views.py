from django.db.models import Q
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document, DocumentAttachment, Folder
from .serializers import (
    AttachmentUploadSerializer,
    DocumentAttachmentSerializer,
    DocumentListSerializer,
    DocumentSerializer,
    FolderSerializer,
)


class FolderListCreateView(generics.ListCreateAPIView):
    """GET /api/notes/folders/ — this user's live folders.
    POST /api/notes/folders/ — create a folder."""

    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Folder.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH /api/notes/folders/<uuid>/ — DELETE soft-deletes (moves to
    Trash, cascading to every live child folder/document — see
    Folder.soft_delete)."""

    serializer_class = FolderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Folder.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()


class FolderRestoreView(APIView):
    """POST /api/notes/folders/<uuid>/restore/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        folder = get_object_or_404(
            Folder.all_objects, pk=pk, user=request.user, deleted_at__isnull=False
        )
        folder.restore()
        return Response(FolderSerializer(folder, context={"request": request}).data)


class FolderPurgeView(APIView):
    """DELETE /api/notes/folders/<uuid>/purge/ — permanent, only callable on an
    already-trashed folder. Child folders (also trashed) cascade-delete with
    it; documents inside are only detached (folder=None), never destroyed —
    see Document.folder's on_delete=SET_NULL."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        folder = get_object_or_404(
            Folder.all_objects, pk=pk, user=request.user, deleted_at__isnull=False
        )
        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentListCreateView(generics.ListCreateAPIView):
    """GET /api/notes/documents/ — filters: folder, favorite, pinned, trashed,
    tag, q. POST /api/notes/documents/ — create a note."""

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        return DocumentSerializer if self.request.method == "POST" else DocumentListSerializer

    def get_queryset(self):
        params = self.request.query_params
        trashed = params.get("trashed") == "true"
        qs = (Document.all_objects if trashed else Document.objects).filter(user=self.request.user)
        if trashed:
            qs = qs.filter(deleted_at__isnull=False)

        folder_id = params.get("folder")
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        if params.get("favorite") == "true":
            qs = qs.filter(is_favorite=True)
        if params.get("pinned") == "true":
            qs = qs.filter(is_pinned=True)
        tag = params.get("tag")
        if tag:
            qs = qs.filter(tags__contains=[tag])
        q = params.get("q")
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(content_text__icontains=q))
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH /api/notes/documents/<uuid>/ — DELETE soft-deletes."""

    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()


class DocumentRestoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        doc = get_object_or_404(
            Document.all_objects, pk=pk, user=request.user, deleted_at__isnull=False
        )
        doc.restore()
        return Response(DocumentSerializer(doc, context={"request": request}).data)


class DocumentPurgeView(APIView):
    """DELETE /api/notes/documents/<uuid>/purge/ — permanent, only callable on
    an already-trashed document. Attachments cascade-delete along with their
    files (see signals.delete_attachment_file)."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        doc = get_object_or_404(
            Document.all_objects, pk=pk, user=request.user, deleted_at__isnull=False
        )
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentDuplicateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        doc = get_object_or_404(Document.objects, pk=pk, user=request.user)
        copy = Document.objects.create(
            user=request.user,
            folder=doc.folder,
            title=f"{doc.title} (պատճեն)" if doc.title else "(պատճեն)",
            icon=doc.icon,
            content=doc.content,
            content_text=doc.content_text,
            tags=doc.tags,
        )
        return Response(
            DocumentSerializer(copy, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DocumentMoveView(APIView):
    """POST /api/notes/documents/<uuid>/move/ {folder: uuid|null}"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        doc = get_object_or_404(Document.objects, pk=pk, user=request.user)
        folder_id = request.data.get("folder")
        if folder_id is None:
            doc.folder = None
        else:
            folder = get_object_or_404(Folder.objects, pk=folder_id, user=request.user)
            doc.folder = folder
        doc.save(update_fields=["folder", "updated_at"])
        return Response(DocumentSerializer(doc, context={"request": request}).data)


class AttachmentUploadView(APIView):
    """POST /api/notes/attachments/ (multipart: document, file) — validated
    upload, referenced by id once the editor inserts it. Requires the
    uploader to own the target document."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        document = d["document"]
        if document.user_id != request.user.id:
            raise Http404

        uploaded_file = d["file"]
        attachment = DocumentAttachment.objects.create(
            document=document,
            uploaded_by=request.user,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=d["mime_type"],
            file_size=uploaded_file.size,
            file_type=d["file_type"],
        )
        return Response(
            DocumentAttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class DocumentAttachmentDownloadView(APIView):
    """GET /api/notes/attachments/<uuid>/download/ — the only sanctioned way
    to read an attachment's bytes; `file.url` is never exposed directly."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attachment = get_object_or_404(DocumentAttachment, pk=pk)
        if attachment.document.user_id != request.user.id:
            raise Http404
        return FileResponse(
            attachment.file.open("rb"),
            filename=attachment.original_filename,
            content_type=attachment.mime_type,
        )
