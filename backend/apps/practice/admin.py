from django.contrib import admin

from .models import (
    Subject, Domain, Topic, Subtopic,
    Question, Choice, Statement,
    PracticeAttempt, AttemptAnswer, TopicMistake,
)


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0


class StatementInline(admin.TabularInline):
    model = Statement
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["id", "subtopic", "tier", "question_type", "dataset_id"]
    list_filter = ["tier", "question_type", "subtopic"]
    search_fields = ["text", "dataset_id"]
    inlines = [ChoiceInline, StatementInline]


@admin.register(Subtopic)
class SubtopicAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "topic"]
    search_fields = ["name"]


@admin.register(TopicMistake)
class TopicMistakeAdmin(admin.ModelAdmin):
    list_display = ["id", "student", "source", "subject_name", "topic_label", "incorrect_count", "last_incorrect_at"]
    list_filter = ["source", "subject_name"]
    search_fields = ["student__username", "topic_label"]


admin.site.register(Subject)
admin.site.register(Domain)
admin.site.register(Topic)
admin.site.register(PracticeAttempt)
admin.site.register(AttemptAnswer)
