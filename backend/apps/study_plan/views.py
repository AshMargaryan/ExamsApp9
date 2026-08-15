from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .coach import build_coach_panel
from .models import StudyTask
from .serializers import DailyStudyPlanSerializer, TaskCheckInSerializer
from .services import CheckInError, generate_daily_plan, record_check_in
from .weekly_report import get_weekly_report_panel


class TodayStudyPlanView(APIView):
    """GET /api/study-plan/today/ — this user's plan for today, generating
    it on first request of the day and serving the cached one thereafter.
    Also attaches the AI coach panel (today's real progress, weakness
    breakdown, pacing strategy, weekly recap — see .coach) and lazily
    refreshes/returns the weekly AI report (see .weekly_report) so the page
    has everything it needs in one call."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        plan = generate_daily_plan(request.user)
        data = DailyStudyPlanSerializer(plan).data
        coach = build_coach_panel(request.user, plan)
        coach["weekly_report"] = get_weekly_report_panel(request.user, coach["week"])
        data["coach"] = coach
        return Response(data)


class TaskCheckInView(APIView):
    """POST /api/study-plan/tasks/<id>/check-in/ — record how a completed
    task felt (see services.record_check_in). Feeds tomorrow's plan
    ranking (build_candidates._recently_struggled_topics)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, task_id):
        task = get_object_or_404(StudyTask, id=task_id)
        if task.plan.user_id != request.user.id:
            raise PermissionDenied()

        serializer = TaskCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            record_check_in(task, serializer.validated_data["feeling"])
        except CheckInError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
