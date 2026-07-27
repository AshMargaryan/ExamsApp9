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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
