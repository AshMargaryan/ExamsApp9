from django.contrib import admin

from .models import (
    MockExam, MockExamQuestion, MockExamChoice, MockExamStatement,
    MockExamAttempt, MockExamAnswer,
)


class MockExamChoiceInline(admin.TabularInline):
    model = MockExamChoice
    extra = 0


class MockExamStatementInline(admin.TabularInline):
    model = MockExamStatement
    extra = 0


@admin.register(MockExamQuestion)
class MockExamQuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "exam", "number", "question_type", "difficulty", "dataset_id"]
    list_filter = ["exam", "question_type", "difficulty"]
    search_fields = ["text", "dataset_id"]
    inlines = [MockExamChoiceInline, MockExamStatementInline]


@admin.register(MockExam)
class MockExamAdmin(admin.ModelAdmin):
    list_display = ["id", "exam_id", "title", "question_count"]
    search_fields = ["exam_id", "title"]


admin.site.register(MockExamAttempt)
admin.site.register(MockExamAnswer)
