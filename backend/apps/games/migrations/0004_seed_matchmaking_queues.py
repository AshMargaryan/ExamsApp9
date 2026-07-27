from django.db import migrations

QUEUES = [
    dict(
        name="Հանրային ընտրանք (խաղացողներով)",
        start_mode="player_count",
        min_players=10,
        max_players=50,
        timer_seconds=None,
    ),
    dict(
        name="Հանրային ընտրանք (ժամանակաչափով)",
        start_mode="timer",
        min_players=2,
        max_players=50,
        timer_seconds=60,
    ),
]


def seed_queues(apps, schema_editor):
    MatchmakingQueue = apps.get_model("games", "MatchmakingQueue")
    for data in QUEUES:
        MatchmakingQueue.objects.get_or_create(name=data["name"], defaults=data)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0003_matchmakingqueue_gameroom_matchmaking_queue_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_queues, noop),
    ]
