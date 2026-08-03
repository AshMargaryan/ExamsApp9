from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Assignment, AssignmentStatus, ConnectionStatus, TeacherProfile, TeacherStudentConnection
from .permissions import IsStudent, IsTeacher
from .serializers import (
    AssignmentCreateSerializer, AssignmentSerializer,
    StudentSearchSerializer, TeacherStudentConnectionSerializer,
)
from .services import accepted_student_count, is_connected

User = get_user_model()


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


class AssignmentStatusUpdateView(APIView):
    """
    PATCH /api/teaching/assignments/<pk>/status/ {status: in_progress|completed}
    — the assigned student updates their own progress. Submission content
    and grading are future additions on top of this.
    """

    permission_classes = [IsStudent]

    def patch(self, request, pk):
        assignment = get_object_or_404(Assignment, pk=pk, student=request.user)
        new_status = request.data.get("status")
        if new_status not in (AssignmentStatus.IN_PROGRESS, AssignmentStatus.COMPLETED):
            return Response(
                {"detail": "status-ը պետք է լինի in_progress կամ completed։"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        assignment.status = new_status
        assignment.save(update_fields=["status", "updated_at"])
        return Response(AssignmentSerializer(assignment, context={"request": request}).data)
