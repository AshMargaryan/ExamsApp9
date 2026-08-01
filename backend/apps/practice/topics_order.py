"""
Parses data_scripts/source/math/topics.txt into canonical
domain/topic/subtopic order numbers, matching the file's own sequence.
Indentation uses U+2003 EM SPACE, not regular spaces: 0 = domain,
2 = topic, 4 = subtopic.
"""
from django.conf import settings

EM_SPACE = " "
TOPICS_FILE = settings.BASE_DIR / "data_scripts" / "source" / "math" / "topics.txt"


def load_order_maps():
    """
    Returns (domain_order, topic_order, subtopic_order):
      domain_order: {domain_name: int}
      topic_order: {(domain_name, topic_name): int}
      subtopic_order: {(domain_name, topic_name, subtopic_name): int}
    """
    domain_order = {}
    topic_order = {}
    subtopic_order = {}

    domain_seq = topic_seq = subtopic_seq = 0
    current_domain = None
    current_topic = None

    for raw_line in TOPICS_FILE.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip():
            continue
        stripped = raw_line.lstrip(EM_SPACE)
        indent = len(raw_line) - len(stripped)
        name = stripped.strip()

        if indent == 0:
            current_domain = name
            current_topic = None
            domain_order[current_domain] = domain_seq
            domain_seq += 1
            topic_seq = 0
        elif indent == 2:
            current_topic = name
            topic_order[(current_domain, current_topic)] = topic_seq
            topic_seq += 1
            subtopic_seq = 0
        elif indent == 4:
            subtopic_order[(current_domain, current_topic, name)] = subtopic_seq
            subtopic_seq += 1

    return domain_order, topic_order, subtopic_order


def load_flat_lists():
    """
    Returns (domains, topics) in the file's own document order:
      domains: [domain_name, ...]
      topics: [(domain_name, topic_name), ...]
    Used to assign stable global slugs (dom00, top00, ...) for material import.
    """
    domains = []
    topics = []
    current_domain = None

    for raw_line in TOPICS_FILE.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip():
            continue
        stripped = raw_line.lstrip(EM_SPACE)
        indent = len(raw_line) - len(stripped)
        name = stripped.strip()

        if indent == 0:
            current_domain = name
            domains.append(current_domain)
        elif indent == 2:
            topics.append((current_domain, name))

    return domains, topics