from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.friends.serializers import MiniUserSerializer
from apps.parents.serializers import ChildDashboardSerializer
from apps.parents.services import build_child_dashboard
from apps.profiles.leveling import level_for_xp
from apps.rankings.models import MonthlyXP, RankHistory, RankingScope
from apps.rankings.serializers import RankHistorySerializer

from .models import Assignment, AssignmentStatus, ConnectionStatus, TeacherProfile, TeacherStudentConnection
from .permissions import IsStudent, IsTeacher
from .serializers import (
    AssignmentCreateSerializer, AssignmentDetailSerializer, AssignmentSerializer,
    StudentRosterSerializer, StudentSearchSerializer, TeacherStudentConnectionSerializer,
)
from .services import (
    accepted_student_count,
    class_weak_spots,
    dashboard_stats,
    is_connected,
    pending_review_queue,
    recent_activity_feed,
    roster_student_ids,
)

User = get_user_model()
RANK_HISTORY_DAYS = 30


class StudentSearchView(generics.ListAPIView):
    """GET /api/teaching/students/search/?q=... — teacher searches for students to invite."""

    serializer_class = StudentSearchSerializer
    permission_classes = [IsTeacher]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return User.objects.none()
        return (
            User.objects.filter(role="student")
            .exclude(id=self.request.user.id)
            .filter(username__icontains=q)
            .select_related("profile")
            .order_by("username")[:20]
        )


class SendInvitationView(APIView):
    """POST /api/teaching/invitations/send/ {student_id, notes?} — teacher invites a student."""

    permission_classes = [IsTeacher]

    def post(self, request):
        student = get_object_or_404(User, pk=request.data.get("student_id"), role="student")

        if TeacherStudentConnection.objects.filter(
            teacher=request.user, student=student, active=True
        ).exists():
            return Response(
                {"detail": "Այս աշակերտին արդեն հրավիրել եք կամ կապակցված եք։"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher_profile, _ = TeacherProfile.objects.get_or_create(user=request.user)
        if accepted_student_count(request.user) >= teacher_profile.student_limit:
            return Response(
                {"detail": "Հասել եք աշակերտների առավելագույն թույլատրելի քանակին։"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        connection = TeacherStudentConnection.objects.create(
            teacher=request.user, student=student, notes=request.data.get("notes", "")
        )
        return Response(
            TeacherStudentConnectionSerializer(connection, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class InvitationListView(generics.ListAPIView):
    """
    GET /api/teaching/invitations/ — pending invitations relevant to the
    caller: outgoing (sent) ones for a teacher, incoming (received) ones for
    a student.
    """

    serializer_class = TeacherStudentConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        base = TeacherStudentConnection.objects.filter(
            status=ConnectionStatus.PENDING, active=True
        ).select_related("teacher__profile", "student__profile")
        if user.role == "teacher":
            return base.filter(teacher=user)
        return base.filter(student=user)


class RespondInvitationView(APIView):
    """POST /api/teaching/invitations/<pk>/respond/ {action: accept|decline} — student only."""

    permission_classes = [IsStudent]

    def post(self, request, pk):
        connection = get_object_or_404(
            TeacherStudentConnection,
            pk=pk,
            student=request.user,
            status=ConnectionStatus.PENDING,
            active=True,
        )
        action = request.data.get("action")
        if action == "accept":
            connection.status = ConnectionStatus.ACCEPTED
            connection.accepted_at = timezone.now()
            connection.save(update_fields=["status", "accepted_at"])
        elif action == "decline":
            # active=False frees the pair up for a future re-invitation —
            # otherwise the partial unique constraint would permanently
            # block the teacher from ever inviting this student again.
            connection.status = ConnectionStatus.DECLINED
            connection.active = False
            connection.save(update_fields=["status", "active"])
        else:
            return Response(
                {"detail": "action-ը պետք է լինի accept կամ decline։"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(TeacherStudentConnectionSerializer(connection, context={"request": request}).data)


class CancelInvitationView(APIView):
    """DELETE /api/teaching/invitations/<pk>/ — teacher withdraws their own pending invitation."""

    permission_classes = [IsTeacher]

    def delete(self, request, pk):
        connection = get_object_or_404(
            TeacherStudentConnection,
            pk=pk,
            teacher=request.user,
            status=ConnectionStatus.PENDING,
            active=True,
        )
        connection.active = False
        connection.save(update_fields=["active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AssignmentCreateView(APIView):
    """POST /api/teaching/assignments/ — teacher assigns a test/topic/subtopic to a connected student."""

    permission_classes = [IsTeacher]

    def post(self, request):
        serializer = AssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student = serializer.validated_data["student"]
        if not is_connected(request.user, student):
            return Response(
                {"detail": "Կարող եք առաջադրանք տալ միայն ձեզ հետ կապակցված աշակերտներին։"},
                status=status.HTTP_403_FORBIDDEN,
            )

        assignment = serializer.save(teacher=request.user)
        return Response(
            AssignmentSerializer(assignment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AssignmentListView(generics.ListAPIView):
    """
    GET /api/teaching/assignments/ — assignments relevant to the caller:
    given ones for a teacher, received ones for a student. Optional
    ?student_id= filter for a teacher viewing one student's assignments.
    """

    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = Assignment.objects.select_related(
            "teacher__profile", "student__profile", "mock_exam", "topic", "subtopic"
        )
        if user.role == "teacher":
            qs = qs.filter(teacher=user)
            student_id = self.request.query_params.get("student_id")
            if student_id:
                qs = qs.filter(student_id=student_id)
            return qs
        return qs.filter(student=user)


class AssignmentStartView(APIView):
    """POST /api/teaching/assignments/<pk>/start/ — student opens an assigned item (assigned -> in_progress)."""

    permission_classes = [IsStudent]

    def post(self, request, pk):
        assignment = get_object_or_404(
            Assignment, pk=pk, student=request.user, status=AssignmentStatus.ASSIGNED
        )
        assignment.status = AssignmentStatus.IN_PROGRESS
        assignment.save(update_fields=["status", "updated_at"])
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentSubmitView(APIView):
    """
    POST /api/teaching/assignments/<pk>/submit/ {explanation} — student
    submits their work for teacher review. The student can send at any
    point, finished or not — the teacher sees exactly how much progress
    was made (via Assignment.progress/test_status) and decides from there.
    """

    permission_classes = [IsStudent]

    def post(self, request, pk):
        assignment = get_object_or_404(
            Assignment,
            pk=pk,
            student=request.user,
            status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
        )
        explanation = (request.data.get("explanation") or "").strip()
        if not explanation:
            return Response(
                {"detail": "Խնդրում ենք գրել բացատրություն, թե ինչ եք սովորել։"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        assignment.status = AssignmentStatus.SUBMITTED
        assignment.explanation = explanation
        assignment.submitted_at = timezone.now()
        assignment.seen_by_teacher = False
        assignment.save(update_fields=["status", "explanation", "submitted_at", "seen_by_teacher", "updated_at"])
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentReviewActionView(APIView):
    """
    POST /api/teaching/assignments/<pk>/review/ {action: approve|reject, feedback?}
    — the assigning teacher approves (-> completed) or rejects (-> back to
    in_progress, with optional feedback) a submitted assignment.
    """

    permission_classes = [IsTeacher]

    def post(self, request, pk):
        assignment = get_object_or_404(
            Assignment, pk=pk, teacher=request.user, status=AssignmentStatus.SUBMITTED
        )
        action = request.data.get("action")
        if action == "approve":
            assignment.status = AssignmentStatus.COMPLETED
        elif action == "reject":
            assignment.status = AssignmentStatus.IN_PROGRESS
            assignment.teacher_feedback = (request.data.get("feedback") or "").strip()
        else:
            return Response(
                {"detail": "action-ը պետք է լինի approve կամ reject։"}, status=status.HTTP_400_BAD_REQUEST
            )
        assignment.reviewed_at = timezone.now()
        assignment.seen_by_student = False
        assignment.save(
            update_fields=["status", "teacher_feedback", "reviewed_at", "seen_by_student", "updated_at"]
        )
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentLearningProgressView(APIView):
    """
    POST /api/teaching/assignments/<pk>/learning-progress/ {progress: 0..1}
    — student reports how far they've scrolled through a subtopic's
    learning material. Monotonic (never decreases) and moves
    assigned -> in_progress like AssignmentStartView.
    """

    permission_classes = [IsStudent]

    def post(self, request, pk):
        assignment = get_object_or_404(
            Assignment,
            pk=pk,
            student=request.user,
            assignment_type="subtopic",
            status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
        )
        try:
            progress = float(request.data.get("progress"))
        except (TypeError, ValueError):
            return Response({"detail": "progress-ը պետք է լինի թիվ։"}, status=status.HTTP_400_BAD_REQUEST)
        progress = max(0.0, min(1.0, progress))

        update_fields = ["updated_at"]
        if progress > assignment.learning_progress:
            assignment.learning_progress = progress
            update_fields.append("learning_progress")
        if assignment.status == AssignmentStatus.ASSIGNED:
            assignment.status = AssignmentStatus.IN_PROGRESS
            update_fields.append("status")
        assignment.save(update_fields=update_fields)
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentRedoView(APIView):
    """
    POST /api/teaching/assignments/<pk>/redo/ — student restarts a rejected
    (or otherwise still-open) assignment. Bumps progress_reset_at so prior
    practice/test attempts stop counting toward progress/completion,
    without touching the underlying attempt data.
    """

    permission_classes = [IsStudent]

    def post(self, request, pk):
        assignment = get_object_or_404(
            Assignment,
            pk=pk,
            student=request.user,
            status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
        )
        assignment.progress_reset_at = timezone.now()
        assignment.explanation = ""
        assignment.learning_progress = 0.0
        assignment.save(update_fields=["progress_reset_at", "explanation", "learning_progress", "updated_at"])
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentMarkSeenView(APIView):
    """POST /api/teaching/assignments/<pk>/mark-seen/ — clears the caller's notification flag."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        assignment = get_object_or_404(Assignment, pk=pk)
        if request.user == assignment.student:
            assignment.seen_by_student = True
            assignment.save(update_fields=["seen_by_student"])
        elif request.user == assignment.teacher:
            assignment.seen_by_teacher = True
            assignment.save(update_fields=["seen_by_teacher"])
        else:
            return Response(
                {"detail": "Այս առաջադրանքը հասանելի չէ ձեզ։"}, status=status.HTTP_403_FORBIDDEN
            )
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)


class AssignmentNotificationListView(generics.ListAPIView):
    """
    GET /api/teaching/assignments/notifications/ — unseen assignment events
    for the caller: newly assigned/reviewed items for a student, newly
    submitted items for a teacher. Backs the notification bell + the small
    dot on the "Assignments" home link.
    """

    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = Assignment.objects.select_related(
            "teacher__profile", "student__profile", "mock_exam", "topic", "subtopic"
        )
        if user.role == "teacher":
            return qs.filter(teacher=user, seen_by_teacher=False, status=AssignmentStatus.SUBMITTED)
        return qs.filter(student=user, seen_by_student=False)


class AssignmentDetailView(APIView):
    """
    GET /api/teaching/assignments/<pk>/detail/ — full review data (the
    explanation plus a per-question right/wrong breakdown). Viewable by
    either side of the assignment.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        assignment = get_object_or_404(Assignment, pk=pk)
        if request.user not in (assignment.teacher, assignment.student):
            return Response(
                {"detail": "Այս առաջադրանքը հասանելի չէ ձեզ։"}, status=status.HTTP_403_FORBIDDEN
            )
        return Response(AssignmentDetailSerializer(assignment, context={"request": request}).data)


class TeacherStudentRosterView(generics.ListAPIView):
    """
    GET /api/teaching/students/ — the teacher's connected students, each
    flagged with whether they have a submission awaiting review. Backs the
    dashboard's student boxes (separate from apps.profiles' own `students`
    field, which is display-only).
    """

    serializer_class = StudentRosterSerializer
    permission_classes = [IsTeacher]
    pagination_class = None

    def get_queryset(self):
        return TeacherStudentConnection.objects.filter(
            teacher=self.request.user, status=ConnectionStatus.ACCEPTED, active=True
        ).select_related("student__profile")


class TeacherClassLeaderboardView(APIView):
    """
    GET /api/teaching/students/leaderboard/ — the teacher's roster ranked by
    this month's XP (live MonthlyXP ledger, same source the student-facing
    rankings pages use). Students with no XP yet this month still appear,
    at 0. `trend` is best-effort: RankHistory rows are only written lazily
    when a student themselves visits a ranking board (see
    apps.rankings.services.maybe_snapshot_rank_history), so a student who
    hasn't checked their own rank recently will show trend=null rather than
    a fabricated number.
    """

    permission_classes = [IsTeacher]

    def get(self, request):
        connections = list(
            TeacherStudentConnection.objects.filter(
                teacher=request.user, status=ConnectionStatus.ACCEPTED, active=True
            ).select_related("student__profile")
        )
        student_ids = [c.student_id for c in connections]

        today = timezone.localdate()
        xp_by_user = dict(
            MonthlyXP.objects.filter(
                year=today.year, month=today.month, user_id__in=student_ids
            ).values_list("user_id", "xp")
        )

        trend_by_user = {}
        history_rows = RankHistory.objects.filter(
            user_id__in=student_ids, scope=RankingScope.GLOBAL
        ).order_by("user_id", "-date")
        seen_per_user = {}
        for row in history_rows:
            bucket = seen_per_user.setdefault(row.user_id, [])
            if len(bucket) < 2:
                bucket.append(row)
        for user_id, rows in seen_per_user.items():
            if len(rows) == 2:
                trend_by_user[user_id] = {"xp_change": rows[0].xp - rows[1].xp}

        rows = [
            {
                "student": MiniUserSerializer(c.student, context={"request": request}).data,
                "monthly_xp": xp_by_user.get(c.student_id, 0),
                "level": level_for_xp(c.student.profile.total_xp) if hasattr(c.student, "profile") else 1,
                "trend": trend_by_user.get(c.student_id),
            }
            for c in connections
        ]
        rows.sort(key=lambda r: r["monthly_xp"], reverse=True)
        for i, row in enumerate(rows, start=1):
            row["rank"] = i

        return Response(rows)


class TeacherStudentDashboardView(APIView):
    """
    GET /api/teaching/students/<student_id>/dashboard/ — reuses
    apps.parents.services.build_child_dashboard (parameterized on any user,
    not parent-specific) so a teacher sees the exact same rich progress
    payload — subject performance, skills mastery, weekly progress,
    activity calendar, predicted exam score — a parent sees for their child.
    """

    permission_classes = [IsTeacher]

    def get(self, request, student_id):
        student = get_object_or_404(User, pk=student_id)
        if not is_connected(request.user, student):
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ChildDashboardSerializer(build_child_dashboard(student)).data)


class TeacherStudentRankHistoryView(APIView):
    """GET /api/teaching/students/<student_id>/rank-history/?scope=global —
    mirrors apps.rankings.views.RankHistoryView but for a connected student
    instead of the caller themself."""

    permission_classes = [IsTeacher]

    def get(self, request, student_id):
        student = get_object_or_404(User, pk=student_id)
        if not is_connected(request.user, student):
            return Response(status=status.HTTP_404_NOT_FOUND)

        scope = request.query_params.get("scope", RankingScope.GLOBAL)
        if scope not in RankingScope.values:
            return Response({"detail": "Անվավեր scope։"}, status=status.HTTP_400_BAD_REQUEST)

        cutoff = timezone.localdate() - timezone.timedelta(days=RANK_HISTORY_DAYS)
        rows = RankHistory.objects.filter(user=student, scope=scope, date__gte=cutoff).order_by("date")
        return Response(RankHistorySerializer(rows, many=True).data)


class TeacherDashboardSummaryView(APIView):
    """
    GET /api/teaching/dashboard/summary/ — everything the teacher home page
    needs in one call: top-strip stats, the review queue, class weak spots
    (aggregated from the Mistake Notebook), and a merged recent-activity
    feed. Composed from apps.teaching.services so each piece stays testable
    on its own.
    """

    permission_classes = [IsTeacher]

    def get(self, request):
        student_ids = roster_student_ids(request.user)

        pending = pending_review_queue(request.user)
        feed = recent_activity_feed(request.user, student_ids)

        return Response({
            "stats": dashboard_stats(request.user, student_ids),
            "pending_review": AssignmentSerializer(pending, many=True, context={"request": request}).data,
            "weak_spots": class_weak_spots(student_ids),
            "activity_feed": [
                {
                    "type": e["type"],
                    "at": e["at"],
                    "student": MiniUserSerializer(e["student"], context={"request": request}).data,
                    "title": e["title"],
                }
                for e in feed
            ],
        })
