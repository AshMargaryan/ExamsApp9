from django.urls import path

from .views import (
    CardDetailView, CardDuplicateView, CardFlagView, CardMoveView,
    DeckCardCreateView, DeckCardsView, DeckDuplicateView,
    ListFlashcardDecksView, MarkCardView, MyDeckDetailView, MyDecksListCreateView,
    ResetDeckProgressView,
)

urlpatterns = [
    # Shared library (read-only for students)
    path("decks/", ListFlashcardDecksView.as_view(), name="flashcards-deck-list"),
    path("decks/<int:deck_id>/cards/", DeckCardsView.as_view(), name="flashcards-deck-cards"),
    path("decks/<int:deck_id>/reset/", ResetDeckProgressView.as_view(), name="flashcards-deck-reset"),

    # My decks (private, student-owned)
    path("my-decks/", MyDecksListCreateView.as_view(), name="flashcards-my-decks"),
    path("my-decks/<int:pk>/", MyDeckDetailView.as_view(), name="flashcards-my-deck-detail"),
    path("my-decks/<int:pk>/duplicate/", DeckDuplicateView.as_view(), name="flashcards-my-deck-duplicate"),
    path("my-decks/<int:deck_id>/cards/", DeckCardCreateView.as_view(), name="flashcards-my-deck-card-create"),

    # My cards (edit/duplicate/move within owned decks)
    path("cards/<int:pk>/", CardDetailView.as_view(), name="flashcards-card-detail"),
    path("cards/<int:pk>/duplicate/", CardDuplicateView.as_view(), name="flashcards-card-duplicate"),
    path("cards/<int:pk>/move/", CardMoveView.as_view(), name="flashcards-card-move"),

    # Study/grading (any visible card — library or owned)
    path("cards/<int:card_id>/mark/", MarkCardView.as_view(), name="flashcards-card-mark"),
    path("cards/<int:card_id>/flag/", CardFlagView.as_view(), name="flashcards-card-flag"),
]
