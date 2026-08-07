from django.contrib import admin

from .models import Flashcard, FlashcardDeck, FlashcardProgress, FlashcardReview


class FlashcardInline(admin.TabularInline):
    model = Flashcard
    extra = 0
    fields = ["number", "topic", "front_text", "back_text", "difficulty"]


@admin.register(FlashcardDeck)
class FlashcardDeckAdmin(admin.ModelAdmin):
    list_display = ["id", "deck_id", "title", "subject", "card_count", "owner"]
    list_filter = ["subject", ("owner", admin.EmptyFieldListFilter)]
    search_fields = ["deck_id", "title"]
    inlines = [FlashcardInline]


@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ["id", "deck", "number", "topic", "difficulty", "dataset_id"]
    list_filter = ["deck", "difficulty"]
    search_fields = ["front_text", "back_text", "dataset_id"]


admin.site.register(FlashcardProgress)
admin.site.register(FlashcardReview)
