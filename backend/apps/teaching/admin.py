from django.contrib import admin

from .models import Assignment, TeacherProfile, TeacherStudentConnection


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "student_limit", "avg_student_accuracy_improvement", "avg_student_test_improvement"]
    search_fields = ["user__username"]


@admin.register(TeacherStudentConnection)
class TeacherStudentConnectionAdmin(admin.ModelAdmin):
    list_display = ["teacher", "student", "status", "active", "invited_at", "accepted_at"]
    list_filter = ["status", "active"]
    search_fields = ["teacher__username", "student__username"]


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ["title", "teacher", "student", "assignment_type", "status", "due_date", "created_at"]
    list_filter = ["assignment_type", "status"]
    search_fields = ["title", "teacher__username", "student__username"]