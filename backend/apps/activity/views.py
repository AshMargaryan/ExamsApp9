from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import record_heartbeat


class HeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session = record_heartbeat(request.user)
        return Response(
            {
                "session_started_at": session.started_at,
                "last_activity_at": session.last_activity_at,
            },
            status=status.HTTP_200_OK,
        )