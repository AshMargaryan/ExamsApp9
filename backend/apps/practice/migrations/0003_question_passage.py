from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('practice', '0002_statement_hint'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='passage',
            field=models.TextField(blank=True, default=''),
        ),
    ]
