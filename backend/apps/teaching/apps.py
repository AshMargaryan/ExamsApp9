from django.apps import AppConfig


class TeachingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.teaching"

    def ready(self):
        from . import signals  # noqa: F401