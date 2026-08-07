"""
RAG service — retrieves educational context before the prompt is built.

No embeddings/vector DB yet, by design: DatabaseRetriever looks things up
directly in apps.practice via plain ORM queries. RAGService just runs an
ordered list of retrievers and concatenates their chunks, so a future
VectorRetriever can be appended to (or swapped into) that list without any
interface change elsewhere in the app.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from apps.practice.models import Question, Subject, Subtopic, Topic


@dataclass
class EducationalContext:
    """Mirrors the frontend's optional context payload. Every field is
    optional so the same chat also works as a general assistant."""

    question_id: Optional[int] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    subtopic: Optional[str] = None
    difficulty: Optional[str] = None
    lesson_id: Optional[int] = None
    conversation_mode: Optional[str] = None

    def is_empty(self) -> bool:
        return not any(
            [
                self.question_id, self.subject, self.topic,
                self.subtopic, self.difficulty, self.lesson_id,
                self.conversation_mode,
            ]
        )

    @classmethod
    def from_dict(cls, data: Optional[dict]) -> "EducationalContext":
        data = data or {}
        return cls(
            question_id=data.get("question_id"),
            subject=data.get("subject"),
            topic=data.get("topic"),
            subtopic=data.get("subtopic"),
            difficulty=data.get("difficulty"),
            lesson_id=data.get("lesson_id"),
            conversation_mode=data.get("conversation_mode"),
        )

    def to_dict(self) -> dict:
        return {
            "question_id": self.question_id,
            "subject": self.subject,
            "topic": self.topic,
            "subtopic": self.subtopic,
            "difficulty": self.difficulty,
            "lesson_id": self.lesson_id,
            "conversation_mode": self.conversation_mode,
        }


@dataclass
class ContextChunk:
    source_type: str  # e.g. "question", "subtopic", "lesson"
    title: str
    content: str
    metadata: Optional[dict] = None

    def to_prompt_text(self) -> str:
        return f"[{self.source_type.upper()}] {self.title}\n{self.content}"


class BaseRetriever(ABC):
    """A retriever turns educational context (+ the user's query) into
    ContextChunks. Implementations can be swapped/added freely — this is the
    seam a future vector-search retriever plugs into."""

    @abstractmethod
    def retrieve(self, context: EducationalContext, query: str) -> list[ContextChunk]:
        ...


class DatabaseRetriever(BaseRetriever):
    """Looks educational context up directly in the existing Postgres
    practice-app tables. No embeddings, no external index."""

    def retrieve(self, context: EducationalContext, query: str) -> list[ContextChunk]:
        chunks: list[ContextChunk] = []

        if context.question_id:
            chunks.extend(self._question_chunks(context.question_id))
        elif context.subtopic:
            chunks.extend(self._subtopic_chunks(context.subtopic, context.topic, context.subject))

        return chunks

    def _question_chunks(self, question_id: int) -> list[ContextChunk]:
        question = (
            Question.objects.filter(pk=question_id)
            .select_related("subtopic", "subtopic__topic", "subtopic__topic__domain")
            .prefetch_related("choices", "statements")
            .first()
        )
        if not question:
            return []

        parts = [f"Question ({question.tier}, {question.question_type}): {question.text}"]
        if question.hint:
            parts.append(f"Hint: {question.hint}")
        if question.explanation:
            parts.append(f"Explanation: {question.explanation}")
        choices = list(question.choices.all())
        if choices:
            parts.append(
                "Choices: " + "; ".join(
                    f"{c.text}{' (correct)' if c.is_correct else ''}" for c in choices
                )
            )

        return [
            ContextChunk(
                source_type="question",
                title=f"Question in {question.subtopic.name}",
                content="\n".join(parts),
                metadata={"question_id": question.id, "subtopic": question.subtopic.name},
            )
        ]

    def _subtopic_chunks(
        self, subtopic_name: str, topic_name: Optional[str], subject_name: Optional[str]
    ) -> list[ContextChunk]:
        qs = Subtopic.objects.select_related("topic", "topic__domain", "topic__domain__subject")
        qs = qs.filter(name=subtopic_name)
        if topic_name:
            qs = qs.filter(topic__name=topic_name)
        if subject_name:
            qs = qs.filter(topic__domain__subject__name=subject_name)
        subtopic = qs.first()
        if not subtopic:
            return []

        chunks = []
        if subtopic.learning_material:
            chunks.append(
                ContextChunk(
                    source_type="lesson",
                    title=subtopic.name,
                    content=subtopic.learning_material,
                    metadata={"subtopic_id": subtopic.id},
                )
            )
        elif subtopic.intro_text:
            chunks.append(
                ContextChunk(
                    source_type="subtopic",
                    title=subtopic.name,
                    content=subtopic.intro_text,
                    metadata={"subtopic_id": subtopic.id},
                )
            )
        return chunks


class RAGService:
    """Runs an ordered list of retrievers and concatenates their results."""

    def __init__(self, retrievers: Optional[list[BaseRetriever]] = None):
        self.retrievers = retrievers if retrievers is not None else [DatabaseRetriever()]

    def build_context(self, context: EducationalContext, query: str) -> list[ContextChunk]:
        if context.is_empty():
            return []
        chunks: list[ContextChunk] = []
        for retriever in self.retrievers:
            chunks.extend(retriever.retrieve(context, query))
        return chunks
