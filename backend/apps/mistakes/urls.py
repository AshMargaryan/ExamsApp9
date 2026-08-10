from django.urls import path

from . import views

urlpatterns = [
    path("", views.MistakeListView.as_view(), name="mistake-list"),
    path("<int:pk>/retry/", views.MistakeRetryView.as_view(), name="mistake-retry"),
]
