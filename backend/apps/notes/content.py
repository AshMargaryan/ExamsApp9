def extract_plain_text(node) -> str:
    """Walks a Tiptap JSON document and concatenates every text node's
    content, producing the search-only `content_text` mirror stored
    alongside `content`. Not meant to reproduce formatting — just enough
    for an `icontains` search."""
    if not isinstance(node, dict):
        return ""
    parts = []
    if node.get("type") == "text" and isinstance(node.get("text"), str):
        parts.append(node["text"])
    for child in node.get("content", []) or []:
        parts.append(extract_plain_text(child))
    return " ".join(p for p in parts if p)
