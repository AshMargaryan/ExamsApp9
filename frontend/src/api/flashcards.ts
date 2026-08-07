import { apiClient } from "./client";

export type FlashcardSubject = "math" | "physics" | "biology" | "chemistry" | "english";
export type FlashcardDifficulty = "easy" | "medium" | "hard";

export interface FlashcardDeckSummary {
  id: number;
  deck_id: string;
  title: string;
  description: string;
  subject: FlashcardSubject;
  card_count: number;
  is_owned: boolean;
  created_at: string;
  updated_at: string;
  known_count: number;
  learning_count: number;
  new_count: number;
  due_count: number;
}

export interface Flashcard {
  id: number;
  number: number;
  topic: string;
  front_text: string;
  back_text: string;
  hint?: string;
  explanation?: string;
  notes?: string;
  tags: string[];
  difficulty: FlashcardDifficulty;
  front_image_url: string | null;
  back_image_url: string | null;
  audio_url: string | null;
  created_at: string;
  updated_at: string;
}

export type FlashcardProgressStatus = "new" | "learning" | "known";
export type FlashcardGrade = "again" | "hard" | "good" | "easy";

export interface CardProgress {
  status: FlashcardProgressStatus;
  due_at: string | null;
  interval_days: number;
  is_favorite?: boolean;
  is_difficult?: boolean;
}

export interface DeckCards {
  deck: FlashcardDeckSummary;
  cards: Flashcard[];
  progress: Record<number, CardProgress>;
}

export interface CardFormInput {
  topic?: string;
  front_text: string;
  back_text: string;
  hint?: string;
  explanation?: string;
  notes?: string;
  tags?: string[];
  difficulty?: FlashcardDifficulty;
  front_image?: File | null;
  back_image?: File | null;
  audio?: File | null;
  // Set true to clear an existing image/audio without replacing it (edit only).
  remove_front_image?: boolean;
  remove_back_image?: boolean;
  remove_audio?: boolean;
}

export interface DeckFormInput {
  title: string;
  description?: string;
  subject: FlashcardSubject;
}

// ---------------------------------------------------------------------------
// Shared library (read-only)
// ---------------------------------------------------------------------------

export async function listFlashcardDecks(subject?: FlashcardSubject): Promise<FlashcardDeckSummary[]> {
  const { data } = await apiClient.get("/flashcards/decks/", {
    params: subject ? { subject } : undefined,
  });
  return data.results;
}

export async function getDeckCards(deckId: number): Promise<DeckCards> {
  const { data } = await apiClient.get(`/flashcards/decks/${deckId}/cards/`);
  return data;
}

export async function resetDeckProgress(deckId: number): Promise<{ reset: boolean }> {
  const { data } = await apiClient.post(`/flashcards/decks/${deckId}/reset/`, {});
  return data;
}

// ---------------------------------------------------------------------------
// My decks (private, student-owned)
// ---------------------------------------------------------------------------

export async function listMyDecks(): Promise<FlashcardDeckSummary[]> {
  const { data } = await apiClient.get("/flashcards/my-decks/");
  return data.results;
}

export async function createDeck(input: DeckFormInput): Promise<FlashcardDeckSummary> {
  const { data } = await apiClient.post("/flashcards/my-decks/", input);
  return data;
}

export async function updateDeck(
  deckId: number, input: Partial<DeckFormInput>,
): Promise<FlashcardDeckSummary> {
  const { data } = await apiClient.patch(`/flashcards/my-decks/${deckId}/`, input);
  return data;
}

export async function deleteDeck(deckId: number): Promise<void> {
  await apiClient.delete(`/flashcards/my-decks/${deckId}/`);
}

export async function duplicateDeck(deckId: number): Promise<FlashcardDeckSummary> {
  const { data } = await apiClient.post(`/flashcards/my-decks/${deckId}/duplicate/`);
  return data;
}

// ---------------------------------------------------------------------------
// My cards (create/edit/delete/duplicate/move within owned decks)
// ---------------------------------------------------------------------------

function buildCardFormData(input: CardFormInput): FormData {
  const form = new FormData();
  form.append("front_text", input.front_text);
  form.append("back_text", input.back_text);
  if (input.topic !== undefined) form.append("topic", input.topic);
  if (input.hint !== undefined) form.append("hint", input.hint);
  if (input.explanation !== undefined) form.append("explanation", input.explanation);
  if (input.notes !== undefined) form.append("notes", input.notes);
  if (input.difficulty !== undefined) form.append("difficulty", input.difficulty);
  if (input.tags !== undefined) form.append("tags", JSON.stringify(input.tags));
  if (input.front_image) form.append("front_image", input.front_image);
  else if (input.remove_front_image) form.append("front_image", "");
  if (input.back_image) form.append("back_image", input.back_image);
  else if (input.remove_back_image) form.append("back_image", "");
  if (input.audio) form.append("audio", input.audio);
  else if (input.remove_audio) form.append("audio", "");
  return form;
}

export async function createCard(deckId: number, input: CardFormInput): Promise<Flashcard> {
  const { data } = await apiClient.post(
    `/flashcards/my-decks/${deckId}/cards/`, buildCardFormData(input),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function updateCard(cardId: number, input: CardFormInput): Promise<Flashcard> {
  const { data } = await apiClient.patch(
    `/flashcards/cards/${cardId}/`, buildCardFormData(input),
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function getCard(cardId: number): Promise<Flashcard & { deck_id: number }> {
  const { data } = await apiClient.get(`/flashcards/cards/${cardId}/`);
  return data;
}

export async function deleteCard(cardId: number): Promise<void> {
  await apiClient.delete(`/flashcards/cards/${cardId}/`);
}

export async function duplicateCard(cardId: number): Promise<Flashcard> {
  const { data } = await apiClient.post(`/flashcards/cards/${cardId}/duplicate/`);
  return data;
}

export async function moveCard(cardId: number, targetDeckId: number): Promise<Flashcard> {
  const { data } = await apiClient.post(`/flashcards/cards/${cardId}/move/`, { deck_id: targetDeckId });
  return data;
}

// ---------------------------------------------------------------------------
// Study/grading
// ---------------------------------------------------------------------------

export async function markCard(cardId: number, grade: FlashcardGrade): Promise<CardProgress> {
  const { data } = await apiClient.post(`/flashcards/cards/${cardId}/mark/`, { grade });
  return data;
}

export async function flagCard(
  cardId: number, flags: { favorite?: boolean; difficult?: boolean },
): Promise<{ is_favorite: boolean; is_difficult: boolean }> {
  const { data } = await apiClient.post(`/flashcards/cards/${cardId}/flag/`, flags);
  return data;
}

export function isDue(progress: CardProgress | undefined): boolean {
  if (!progress || !progress.due_at) return true;
  return new Date(progress.due_at).getTime() <= Date.now();
}
