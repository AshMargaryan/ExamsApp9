from django.core.management.base import BaseCommand

from apps.practice.models import Domain, Topic, Subtopic
from apps.practice.topics_order import load_order_maps


class Command(BaseCommand):
    help = "Backfills Domain/Topic/Subtopic.order from data_scripts/source/math/topics.txt."

    def handle(self, *args, **options):
        domain_order, topic_order, subtopic_order = load_order_maps()

        updated = 0
        for domain in Domain.objects.all():
            order = domain_order.get(domain.name)
            if order is not None and domain.order != order:
                domain.order = order
                domain.save(update_fields=["order"])
                updated += 1

        for topic in Topic.objects.select_related("domain"):
            order = topic_order.get((topic.domain.name, topic.name))
            if order is not None and topic.order != order:
                topic.order = order
                topic.save(update_fields=["order"])
                updated += 1

        for subtopic in Subtopic.objects.select_related("topic__domain"):
            key = (subtopic.topic.domain.name, subtopic.topic.name, subtopic.name)
            order = subtopic_order.get(key)
            if order is not None and subtopic.order != order:
                subtopic.order = order
                subtopic.save(update_fields=["order"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated order on {updated} rows."))