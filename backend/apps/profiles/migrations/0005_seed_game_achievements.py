from django.db import migrations

ACHIEVEMENTS = [
    dict(
        key="first_multiplayer_win",
        name="Առաջին հաղթանակ",
        description="Հաղթեցիր քո առաջին բազմախաղացող մրցաշարում։",
        icon="🏆",
        rarity="rare",
        requirement_type="games_won",
        requirement_value=1,
        xp_reward=50,
    ),
    dict(
        key="multiplayer_games_played_5",
        name="Մրցաշարի սիրահար",
        description="Մասնակցեցիր 5 բազմախաղացող մրցաշարի։",
        icon="🎮",
        rarity="common",
        requirement_type="games_played",
        requirement_value=5,
        xp_reward=30,
    ),
]


def seed_achievements(apps, schema_editor):
    Achievement = apps.get_model("profiles", "Achievement")
    for data in ACHIEVEMENTS:
        Achievement.objects.get_or_create(key=data["key"], defaults=data)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0004_seed_example_achievements"),
    ]

    operations = [
        migrations.RunPython(seed_achievements, noop),
    ]
