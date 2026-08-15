from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/practice/", include("apps.practice.urls")),
    path("api/assistant/", include("apps.ai_assistant.urls")),
    path("api/profile/", include("apps.profiles.urls")),
    path("api/streaks/", include("apps.streaks.urls")),
    path("api/friends/", include("apps.friends.urls")),
    path("api/games/", include("apps.games.urls")),
    path("api/mock-exams/", include("apps.mock_exams.urls")),
    path("api/flashcards/", include("apps.flashcards.urls")),
    path("api/rankings/", include("apps.rankings.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/challenges/", include("apps.challenges.urls")),
    path("api/parents/", include("apps.parents.urls")),
    path("api/activity/", include("apps.activity.urls")),
    path("api/teaching/", include("apps.teaching.urls")),
    path("api/chat/", include("apps.chat.urls")),
    path("api/mistakes/", include("apps.mistakes.urls")),
    path("api/study-plan/", include("apps.study_plan.urls")),
    path("api/help/", include("apps.helpcenter.urls")),
    path("api/knowledge/", include("apps.knowledge.urls")),
    path("api/notepad/", include("apps.notepad.urls")),
    path("api/groups/", include("apps.study_groups.urls")),
    path("api/todo/", include("apps.todo.urls")),
    path("api/notes/", include("apps.notes.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
