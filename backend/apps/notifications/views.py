from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudentNotification
from .serializers import StudentNotificationSerializer

NOTIFICATION_LIST_LIMIT = 50


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — the caller's own notifications, most recent first."""

    serializer_class = StudentNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return StudentNotification.objects.filter(user=self.request.user)[:NOTIFICATION_LIST_LIMIT]


class MarkNotificationReadView(APIView):
    """POST /api/notifications/<id>/read/ — marks one of the caller's own notifications read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        updated = StudentNotification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        if not updated:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkAllNotificationsReadView(APIView):
    """POST /api/notifications/read-all/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        StudentNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
