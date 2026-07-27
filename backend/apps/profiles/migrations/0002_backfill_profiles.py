from django.db import migrations


def create_missing_profiles(apps, schema_editor):
    User = apps.get_model(*settings_auth_user_model_parts())
    Profile = apps.get_model("profiles", "Profile")
    existing_user_ids = Profile.objects.values_list("user_id", flat=True)
    missing_users = User.objects.exclude(id__in=existing_user_ids)
    Profile.objects.bulk_create([Profile(user=u) for u in missing_users])


def settings_auth_user_model_parts():
    from django.conf import settings
    return settings.AUTH_USER_MODEL.split(".")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_initial"),
        ("users", "0003_user_marz"),
    ]

    operations = [
        migrations.RunPython(create_missing_profiles, noop),
    ]
