import logging

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LearningGoal, ParentChildRequest
from .serializers import (
    ChildDashboardSerializer, ChildSummarySerializer, LearningGoalSerializer,
    MiniUserSerializer, NotificationSerializer, ParentChildRequestSerializer, WeeklyReportSerializer,
)
from .services import (
    LinkError, build_child_dashboard, build_overview,
    cancel_child_request, email_weekly_report, generate_weekly_report_text,
    get_children, get_linked_child_or_none, list_child_requests, list_notifications,
    mark_notifications_read, maybe_send_weekly_report, respond_to_child_request,
    search_children, send_child_request, unlink_child,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class ChildrenListView(APIView):
    """GET /api/parents/children/ — every child linked to the authenticated parent."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        children = get_children(request.user)
        for child in children:
            try:
                maybe_send_weekly_report(request.user, child)
            except Exception:
                # Never let a flaky email/AI call break the dashboard list —
                # it'll just retry on the next visit.
                logger.exception("Weekly report send failed for parent=%s child=%s", request.user.id, child.id)
        data = [build_overview(c) for c in children]
        return Response(ChildSummarySerializer(data, many=True).data)


class SearchChildrenView(APIView):
    """GET /api/parents/search-children/?q=... — find an account to send a request to."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "")
        results = search_children(request.user, query)
        data = [
            {**MiniUserSerializer(user, context={"request": request}).data, "relationship_status": status_}
            for user, status_ in results
        ]
        return Response(data)


class SendChildRequestView(APIView):
    """POST /api/parents/requests/send/ {child_id} — request to link a specific child."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        child = get_object_or_404(User, pk=request.data.get("child_id"))
        try:
            req = send_child_request(request.user, child)
        except LinkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ParentChildRequestSerializer(req, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ChildRequestListView(APIView):
    """GET /api/parents/requests/?direction=incoming|outgoing — pending requests."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        direction = request.query_params.get("direction", "incoming")
        requests_qs = list_child_requests(request.user, direction=direction)
        return Response(
            ParentChildRequestSerializer(requests_qs, many=True, context={"request": request}).data
        )


class RespondChildRequestView(APIView):
    """POST /api/parents/requests/<pk>/respond/ {action: accept|reject} — child only."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        action = request.data.get("action")
        try:
            req = respond_to_child_request(pk, request.user, action)
        except ParentChildRequest.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except LinkError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ParentChildRequestSerializer(req, context={"request": request}).data)


class CancelChildRequestView(APIView):
    """DELETE /api/parents/requests/<pk>/ — parent withdraws their own pending request."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        cancel_child_request(pk, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UnlinkChildView(APIView):
    """DELETE /api/parents/children/<child_id>/ — removes the link (child data is untouched)."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, child_id):
        unlink_child(request.user, child_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChildDashboardView(APIView):
    """GET /api/parents/children/<child_id>/dashboard/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, child_id):
        child = get_linked_child_or_none(request.user, child_id)
        if child is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ChildDashboardSerializer(build_child_dashboard(child)).data)


class WeeklyReportView(APIView):
    """
    POST /api/parents/children/<child_id>/weekly-report/
    Generates an AI summary of the child's real weekly stats. Pass
    {"email": true} to also send it to the parent's email address.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, child_id):
        child = get_linked_child_or_none(request.user, child_id)
        if child is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        report_text = generate_weekly_report_text(child)

        if request.data.get("email"):
            email_weekly_report(request.user, child, report_text)

        return Response(WeeklyReportSerializer({"report_text": report_text}).data)


class GoalListCreateView(APIView):
    """GET/POST /api/parents/children/<child_id>/goals/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, child_id):
        child = get_linked_child_or_none(request.user, child_id)
        if child is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        goals = LearningGoal.objects.filter(child=child).select_related("subject")
        return Response(LearningGoalSerializer(goals, many=True).data)

    def post(self, request, child_id):
        child = get_linked_child_or_none(request.user, child_id)
        if child is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = LearningGoalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        goal = serializer.save(child=child, created_by=request.user)
        return Response(LearningGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class GoalDeleteView(APIView):
    """DELETE /api/parents/goals/<goal_id>/"""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, goal_id):
        goal = get_object_or_404(LearningGoal, pk=goal_id, created_by=request.user)
        goal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationListView(APIView):
    """GET /api/parents/notifications/?unread=true"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        unread_only = request.query_params.get("unread") == "true"
        notifications = list_notifications(request.user, unread_only=unread_only)
        return Response(NotificationSerializer(notifications, many=True).data)


class MarkNotificationsReadView(APIView):
    """POST /api/parents/notifications/mark-read/ — {ids: [...]} or {} for all."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids")
        mark_notifications_read(request.user, notification_ids=ids)
        return Response(status=status.HTTP_204_NO_CONTENT)
