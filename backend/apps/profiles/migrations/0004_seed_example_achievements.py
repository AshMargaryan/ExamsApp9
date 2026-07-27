from django.db import migrations

ACHIEVEMENTS = [
    dict(
        key="first_question_solved",
        name="Առաջին քայլ",
        description="Լուծեցիր քո առաջին հարցը։",
        icon="🥇",
        rarity="common",
        requirement_type="questions_solved",
        requirement_value=1,
        xp_reward=10,
    ),
    dict(
        key="questions_solved_100",
        name="Հարյուրյակ",
        description="Լուծեցիր 100 հարց։",
        icon="💯",
        rarity="rare",
        requirement_type="questions_solved",
        requirement_value=100,
        xp_reward=50,
    ),
    dict(
        key="questions_solved_1000",
        name="Հազարավոր",
        description="Լուծեցիր 1000 հարց։",
        icon="🏆",
        rarity="epic",
        requirement_type="questions_solved",
        requirement_value=1000,
        xp_reward=200,
    ),
    dict(
        key="perfect_test_score",
        name="Անթերի արդյունք",
        description="Ստացար 100% միավոր թեստում։",
        icon="⭐",
        rarity="rare",
        requirement_type="perfect_score",
        requirement_value=100,
        xp_reward=30,
    ),
    dict(
        key="streak_7_days",
        name="Շաբաթական շարք",
        description="Պարապեցիր 7 օր անընդմեջ։",
        icon="🔥",
        rarity="rare",
        requirement_type="streak_days",
        requirement_value=7,
        xp_reward=40,
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
        ("profiles", "0003_achievement_rarity_achievement_requirement_type_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_achievements, noop),
    ]
