from .models import ConnectionStatus, TeacherStudentConnection


def accepted_student_count(teacher) -> int:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, status=ConnectionStatus.ACCEPTED, active=True
    ).count()


def is_connected(teacher, student) -> bool:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, student=student, status=ConnectionStatus.ACCEPTED, active=True
    ).exists()