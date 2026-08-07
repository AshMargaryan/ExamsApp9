"""
Parses data_scripts/scripts/english/manifest_english.json into canonical
domain/topic/subtopic order numbers, matching the manifest's own array order.
Mirrors topics_order.py's role for math, but the English content has no
separate indented topics.txt — the manifest's slug/domain/topic/subtopic
entries are themselves the source of truth for both content and ordering.
"""
import json

from django.conf import settings

MANIFEST_PATH = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "english" / "manifest_english.json"
)


def load_manifest():
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def load_order_maps():
    """
    Returns (domain_order, topic_order, subtopic_order), same shape as
    topics_order.load_order_maps: {domain_name: int}, {(domain, topic): int},
    {(domain, topic, subtopic): int} — first-appearance order in the manifest.
    """
    domain_order = {}
    topic_order = {}
    subtopic_order = {}

    domain_seq = topic_seq = subtopic_seq = 0
    current_domain = None
    current_topic = None

    for entry in load_manifest():
        domain, topic, subtopic = entry["domain"], entry["topic"], entry["subtopic"]

        if domain != current_domain:
            current_domain = domain
            current_topic = None
            domain_order[domain] = domain_seq
            domain_seq += 1
            topic_seq = 0

        if topic != current_topic:
            current_topic = topic
            topic_order[(domain, topic)] = topic_seq
            topic_seq += 1
            subtopic_seq = 0

        subtopic_order[(domain, topic, subtopic)] = subtopic_seq
        subtopic_seq += 1

    return domain_order, topic_order, subtopic_order


def load_flat_lists():
    """
    Returns (domains, topics) in first-appearance manifest order, used to
    assign stable global slugs (dom00, top00, ...) for domain/topic material.
    """
    domains = []
    topics = []

    for entry in load_manifest():
        domain, topic = entry["domain"], entry["topic"]
        if domain not in domains:
            domains.append(domain)
        if (domain, topic) not in topics:
            topics.append((domain, topic))

    return domains, topics
