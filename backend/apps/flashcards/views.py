import uuid

from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.mistakes.services import record_flashcard_mistake

from .models import (
    Flashcard, FlashcardDeck, FlashcardProgress, FlashcardProgressStatus, FlashcardReview,
)
from .serializers import (
    CardFlagSerializer, CardMoveSerializer, FlashcardDeckSerializer, FlashcardDeckWriteSerializer,
    FlashcardSerializer, FlashcardWriteSerializer, MarkCardSerializer,
)


class ListFlashcardDecksView(generics.ListAPIView):
    """GET /api/flashcards/decks/ — the shared library (owner=None) + the
    current user's progress counts per deck. Student-owned decks live under
    /my-decks/ instead — see MyDecksListCreateView."""
    serializer_class = FlashcardDeckSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = FlashcardDeck.objects.filter(owner__isnull=True)

    def get_queryset(self):
        qs = super().get_queryset()
        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject=subject)
        return qs

    def list(self, request, *args, **kwargs):
        decks = list(self.get_queryset())
        results = _decks_with_progress_counts(decks, request.user, self.get_serializer)
        return Response({"results": results})


def _decks_with_progress_counts(decks, user, get_serializer):
    """Shared by the library list and the my-decks list — annotates each
    deck's serialized data with this user's known/learning/new/due counts."""
    base = {d.id: get_serializer(d).data for d in decks}
    now = timezone.now()

    progress = FlashcardProgress.objects.filter(
        user=user, card__deck_id__in=base.keys()
    ).values_list("card__deck_id", "status", "due_at")

    counts = {d.id: {"known": 0, "learning": 0, "not_due": 0} for d in decks}
    for deck_id, card_status, due_at in progress:
        if card_status == FlashcardProgressStatus.KNOWN:
            counts[deck_id]["known"] += 1
        elif card_status == FlashcardProgressStatus.LEARNING:
            counts[deck_id]["learning"] += 1
        if due_at is not None and due_at > now:
            counts[deck_id]["not_due"] += 1

    results = []
    for d in decks:
        row = dict(base[d.id])
        row["known_count"] = counts[d.id]["known"]
        row["learning_count"] = counts[d.id]["learning"]
        row["new_count"] = d.card_count - counts[d.id]["known"] - counts[d.id]["learning"]
        row["due_count"] = d.card_count - counts[d.id]["not_due"]
        results.append(row)
    return results


class DeckCardsView(APIView):
    """GET /api/flashcards/decks/<deck_id>/cards/ — every card in the deck
    (library or owned) + this user's progress. Used by the study page."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, deck_id):
        deck = get_object_or_404(FlashcardDeck, pk=deck_id)
        cards = deck.cards.all()
        progress_map = {
            p.card_id: {
                "status": p.status,
                "due_at": p.due_at,
                "interval_days": p.interval_days,
                "is_favorite": p.is_favorite,
                "is_difficult": p.is_difficult,
            }
            for p in FlashcardProgress.objects.filter(user=request.user, card__deck=deck)
        }
        return Response({
            "deck": FlashcardDeckSerializer(deck).data,
            "cards": FlashcardSerializer(cards, many=True, context={"request": request}).data,
            "progress": progress_map,
        })


# ---------------------------------------------------------------------------
# My decks — private, student-owned decks (create/rename/delete/duplicate)
# ---------------------------------------------------------------------------

class MyDecksListCreateView(APIView):
    """GET/POST /api/flashcards/my-decks/ — this user's own decks."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        decks = list(FlashcardDeck.objects.filter(owner=request.user).order_by("-updated_at"))
        results = _decks_with_progress_counts(
            decks, request.user, lambda d: FlashcardDeckSerializer(d),
        )
        return Response({"results": results})

    def post(self, request):
        serializer = FlashcardDeckWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deck = serializer.save(owner=request.user, deck_id=f"USER-{uuid.uuid4().hex}", card_count=0)
        return Response(FlashcardDeckSerializer(deck).data, status=status.HTTP_201_CREATED)


class MyDeckDetailView(APIView):
    """PATCH/DELETE /api/flashcards/my-decks/<id>/ — rename/edit or delete an owned deck."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        deck = get_object_or_404(FlashcardDeck, pk=pk, owner=request.user)
        serializer = FlashcardDeckWriteSerializer(deck, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FlashcardDeckSerializer(deck).data)

    def delete(self, request, pk):
        deck = get_object_or_404(FlashcardDeck, pk=pk, owner=request.user)
        deck.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeckDuplicateView(APIView):
    """POST /api/flashcards/my-decks/<id>/duplicate/ — deep-copies the deck and its cards."""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        deck = get_object_or_404(FlashcardDeck, pk=pk, owner=request.user)
        new_deck = FlashcardDeck.objects.create(
            deck_id=f"USER-{uuid.uuid4().hex}",
            title=f"{deck.title} (կրկնօրինակ)",
            description=deck.description,
            subject=deck.subject,
            owner=request.user,
            card_count=deck.card_count,
        )
        for card in deck.cards.all():
            Flashcard.objects.create(
                deck=new_deck,
                number=card.number,
                topic=card.topic,
                front_text=card.front_text,
                back_text=card.back_text,
                hint=card.hint,
                translation=card.translation,
                explanation=card.explanation,
                notes=card.notes,
                front_image=card.front_image,
                back_image=card.back_image,
                audio=card.audio,
                tags=card.tags,
                difficulty=card.difficulty,
                dataset_id=f"USER-{uuid.uuid4().hex}",
            )
        return Response(FlashcardDeckSerializer(new_deck).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# My cards — create/edit/delete/duplicate/move within owned decks
# ---------------------------------------------------------------------------

class DeckCardCreateView(APIView):
    """POST /api/flashcards/my-decks/<deck_id>/cards/ — create a card in an owned deck."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, deck_id):
        deck = get_object_or_404(FlashcardDeck, pk=deck_id, owner=request.user)
        serializer = FlashcardWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        next_number = (deck.cards.aggregate(Max("number"))["number__max"] or 0) + 1
        card = serializer.save(deck=deck, number=next_number, dataset_id=f"USER-{uuid.uuid4().hex}")
        deck.card_count = deck.cards.count()
        deck.save(update_fields=["card_count", "updated_at"])

        return Response(
            FlashcardSerializer(card, context={"request": request}).data, status=status.HTTP_201_CREATED,
        )


class CardDetailView(APIView):
    """GET/PATCH/DELETE /api/flashcards/cards/<id>/ — view, edit, or delete an owned card."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        card = get_object_or_404(
            Flashcard.objects.select_related("deck"), pk=pk, deck__owner=request.user,
        )
        data = FlashcardSerializer(card, context={"request": request}).data
        data["deck_id"] = card.deck_id
        return Response(data)

    def patch(self, request, pk):
        card = get_object_or_404(Flashcard, pk=pk, deck__owner=request.user)
        serializer = FlashcardWriteSerializer(card, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(FlashcardSerializer(card, context={"request": request}).data)

    def delete(self, request, pk):
        card = get_object_or_404(Flashcard, pk=pk, deck__owner=request.user)
        deck = card.deck
        card.delete()
        deck.card_count = deck.cards.count()
        deck.save(update_fields=["card_count", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CardDuplicateView(APIView):
    """POST /api/flashcards/cards/<id>/duplicate/ — duplicate a card within its deck."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        card = get_object_or_404(Flashcard, pk=pk, deck__owner=request.user)
        deck = card.deck
        next_number = (deck.cards.aggregate(Max("number"))["number__max"] or 0) + 1
        new_card = Flashcard.objects.create(
            deck=deck, number=next_number, topic=card.topic,
            front_text=card.front_text, back_text=card.back_text, hint=card.hint,
            translation=card.translation, explanation=card.explanation, notes=card.notes,
            front_image=card.front_image, back_image=card.back_image, audio=card.audio,
            tags=card.tags, difficulty=card.difficulty,
            dataset_id=f"USER-{uuid.uuid4().hex}",
        )
        deck.card_count = deck.cards.count()
        deck.save(update_fields=["card_count", "updated_at"])
        return Response(
            FlashcardSerializer(new_card, context={"request": request}).data, status=status.HTTP_201_CREATED,
        )


class CardMoveView(APIView):
    """POST /api/flashcards/cards/<id>/move/ {deck_id} — move a card to another owned deck."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        card = get_object_or_404(Flashcard, pk=pk, deck__owner=request.user)
        serializer = CardMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_deck = get_object_or_404(
            FlashcardDeck, pk=serializer.validated_data["deck_id"], owner=request.user,
        )

        old_deck = card.deck
        card.deck = target_deck
        card.number = (target_deck.cards.aggregate(Max("number"))["number__max"] or 0) + 1
        card.save(update_fields=["deck", "number", "updated_at"])

        old_deck.card_count = old_deck.cards.count()
        old_deck.save(update_fields=["card_count", "updated_at"])
        target_deck.card_count = target_deck.cards.count()
        target_deck.save(update_fields=["card_count", "updated_at"])

        return Response(FlashcardSerializer(card, context={"request": request}).data)


class FavoriteCardsView(APIView):
    """GET /api/flashcards/favorites/ — every card this user has starred,
    across every deck (library or owned), with the deck it belongs to."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        progress = (
            FlashcardProgress.objects
            .filter(user=request.user, is_favorite=True)
            .select_related("card__deck")
            .order_by("card__deck__subject", "card__deck__title", "card__number")
        )
        subject = request.query_params.get("subject")
        if subject:
            progress = progress.filter(card__deck__subject=subject)
        results = [
            {
                "card": FlashcardSerializer(p.card, context={"request": request}).data,
                "deck": FlashcardDeckSerializer(p.card.deck).data,
            }
            for p in progress
        ]
        return Response({"results": results})


class CardFlagView(APIView):
    """POST /api/flashcards/cards/<card_id>/flag/ {favorite?, difficult?} —
    toggles this user's favorite/difficult marks on any card (library or owned)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, card_id):
        card = get_object_or_404(Flashcard, pk=card_id)
        serializer = CardFlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        progress, _ = FlashcardProgress.objects.get_or_create(user=request.user, card=card)
        update_fields = []
        if "favorite" in d:
            progress.is_favorite = d["favorite"]
            update_fields.append("is_favorite")
        if "difficult" in d:
            progress.is_difficult = d["difficult"]
            update_fields.append("is_difficult")
        if update_fields:
            progress.save(update_fields=update_fields)

        return Response({"is_favorite": progress.is_favorite, "is_difficult": progress.is_difficult})


# ---------------------------------------------------------------------------
# Study/grading
# ---------------------------------------------------------------------------

# Anki-style 4-button grading (again/hard/good/easy) instead of SM-2's raw
# 0-5 quality scale. Each grade still collapses to a simple "known" vs
# "learning" status for the deck-list progress bar and due-count math, but
# drives the interval/ease scheduling with real granularity.
MIN_EASE_FACTOR = 1.3
MAX_EASE_FACTOR = 3.0

GRADE_STATUS = {
    "again": FlashcardProgressStatus.LEARNING,
    "hard": FlashcardProgressStatus.LEARNING,
    "good": FlashcardProgressStatus.KNOWN,
    "easy": FlashcardProgressStatus.KNOWN,
}


def _schedule(progress: FlashcardProgress, grade: str) -> None:
    prev_interval = progress.interval_days

    if grade == "again":
        progress.interval_days = 0
        progress.ease_factor = max(MIN_EASE_FACTOR, progress.ease_factor - 0.3)
    elif grade == "hard":
        progress.interval_days = max(1, round(prev_interval * 1.2)) if prev_interval else 1
        progress.ease_factor = max(MIN_EASE_FACTOR, progress.ease_factor - 0.15)
    elif grade == "good":
        if prev_interval == 0:
            progress.interval_days = 1
        elif prev_interval == 1:
            progress.interval_days = 3
        else:
            progress.interval_days = round(prev_interval * progress.ease_factor)
        progress.ease_factor = min(MAX_EASE_FACTOR, progress.ease_factor + 0.05)
    else:  # easy
        progress.interval_days = 4 if prev_interval == 0 else round(prev_interval * progress.ease_factor * 1.3)
        progress.ease_factor = min(MAX_EASE_FACTOR, progress.ease_factor + 0.15)


class MarkCardView(APIView):
    """POST /api/flashcards/cards/<card_id>/mark/ {grade: again|hard|good|easy}"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, card_id):
        card = get_object_or_404(Flashcard, pk=card_id)
        serializer = MarkCardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grade = serializer.validated_data["grade"]

        progress, _ = FlashcardProgress.objects.get_or_create(user=request.user, card=card)
        progress.status = GRADE_STATUS[grade]
        progress.times_seen += 1
        if grade in ("good", "easy"):
            progress.times_correct += 1

        _schedule(progress, grade)

        now = timezone.now()
        progress.last_reviewed_at = now
        progress.due_at = now + timezone.timedelta(days=progress.interval_days)
        progress.save()

        FlashcardReview.objects.create(user=request.user, card=card, grade=grade)

        if grade == "again":
            record_flashcard_mistake(request.user, card)

        return Response({
            "status": progress.status,
            "due_at": progress.due_at,
            "interval_days": progress.interval_days,
        })


class ResetDeckProgressView(APIView):
    """POST /api/flashcards/decks/<deck_id>/reset/ — clear this user's progress for a deck."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, deck_id):
        deck = get_object_or_404(FlashcardDeck, pk=deck_id)
        FlashcardProgress.objects.filter(user=request.user, card__deck=deck).delete()
        return Response({"reset": True}, status=status.HTTP_200_OK)
