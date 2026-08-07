import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createCard, createDeck, getCard, listMyDecks, updateCard,
  type CardFormInput, type DeckFormInput, type FlashcardDeckSummary, type FlashcardDifficulty,
} from "../api/flashcards";
import { ImageDropzone } from "../components/flashcards/ImageDropzone";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { extractErrorMessage, useToast } from "../context/ToastContext";

const DIFFICULTIES: { key: FlashcardDifficulty; label: string }[] = [
  { key: "easy", label: "Հեշտ" },
  { key: "medium", label: "Միջին" },
  { key: "hard", label: "Դժվար" },
];

const inputClass =
  "mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
const labelClass = "mb-1 block text-sm text-text-muted";

export function FlashcardEditorPage() {
  const { cardId } = useParams<{ cardId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const isEdit = !!cardId;

  const [decks, setDecks] = useState<FlashcardDeckSummary[] | null>(null);
  const [deckId, setDeckId] = useState<number | null>(null);
  const [showDeckModal, setShowDeckModal] = useState(false);

  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [hint, setHint] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>("medium");

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [existingFrontImageUrl, setExistingFrontImageUrl] = useState<string | null>(null);
  const [existingBackImageUrl, setExistingBackImageUrl] = useState<string | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);
  const [removeFrontImage, setRemoveFrontImage] = useState(false);
  const [removeBackImage, setRemoveBackImage] = useState(false);
  const [removeAudio, setRemoveAudio] = useState(false);

  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);

  useEffect(() => {
    listMyDecks().then((d) => {
      setDecks(d);
      const preselect = searchParams.get("deck");
      if (preselect) setDeckId(Number(preselect));
      else if (d.length > 0 && !isEdit) setDeckId(d[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cardId) return;
    getCard(Number(cardId))
      .then((card) => {
        setDeckId(card.deck_id);
        setFrontText(card.front_text);
        setBackText(card.back_text);
        setHint(card.hint ?? "");
        setExplanation(card.explanation ?? "");
        setNotes(card.notes ?? "");
        setTags(card.tags ?? []);
        setDifficulty(card.difficulty);
        setExistingFrontImageUrl(card.front_image_url);
        setExistingBackImageUrl(card.back_image_url);
        setExistingAudioUrl(card.audio_url);
        setLoaded(true);
      })
      .catch(() => {
        showError("Քարտը չհաջողվեց բեռնել։");
        navigate("/flashcards");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function validate(): boolean {
    const e: { front?: string; back?: string } = {};
    if (!frontText.trim()) e.front = "Հարցը պարտադիր է։";
    if (!backText.trim()) e.back = "Պատասխանը պարտադիր է։";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildInput(): CardFormInput {
    return {
      front_text: frontText.trim(), back_text: backText.trim(), hint: hint.trim(),
      explanation: explanation.trim(), notes: notes.trim(), tags, difficulty,
      front_image: frontImage, back_image: backImage, audio,
      remove_front_image: removeFrontImage, remove_back_image: removeBackImage, remove_audio: removeAudio,
    };
  }

  function resetForNextCard() {
    setFrontText("");
    setBackText("");
    setHint("");
    setExplanation("");
    setNotes("");
    setTags([]);
    setTagInput("");
    setDifficulty("medium");
    setFrontImage(null);
    setBackImage(null);
    setAudio(null);
    setExistingFrontImageUrl(null);
    setExistingBackImageUrl(null);
    setExistingAudioUrl(null);
    setRemoveFrontImage(false);
    setRemoveBackImage(false);
    setRemoveAudio(false);
    setErrors({});
  }

  async function handleSave(createAnother: boolean) {
    if (!validate()) return;
    if (!deckId) {
      showError("Ընտրեք փաթեթ։");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && cardId) {
        await updateCard(Number(cardId), buildInput());
        showSuccess("Քարտը պահպանվեց։");
        navigate(`/flashcards/${deckId}/manage`);
      } else {
        await createCard(deckId, buildInput());
        showSuccess("Քարտը ստեղծվեց։");
        if (createAnother) {
          resetForNextCard();
        } else {
          navigate(`/flashcards/${deckId}/manage`);
        }
      }
    } catch (err) {
      showError(extractErrorMessage(err, "Պահպանումը ձախողվեց։"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDeck(input: DeckFormInput) {
    setBusy(true);
    try {
      const deck = await createDeck(input);
      setDecks((prev) => [deck, ...(prev ?? [])]);
      setDeckId(deck.id);
      setShowDeckModal(false);
      showSuccess("Փաթեթը ստեղծվեց։");
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded || !decks) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse px-4 py-8">
        <div className="mb-6 h-8 w-1/2 rounded bg-surface-muted" />
        <div className="mb-4 h-24 rounded bg-surface-muted" />
        <div className="mb-4 h-24 rounded bg-surface-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/flashcards" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Բառաքարտեր
      </Link>
      <h1 className="mb-6 text-2xl font-semibold text-text">
        {isEdit ? "Խմբագրել քարտը" : "Ստեղծել բառաքարտ"}
      </h1>

      {decks.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
          <p className="mb-4 text-text-muted">Դուք դեռ չունեք ձեր փաթեթներ։ Նախ ստեղծեք մեկը։</p>
          <button
            type="button"
            onClick={() => setShowDeckModal(true)}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            + Ստեղծել փաթեթ
          </button>
        </div>
      ) : (
        <>
          <label className={labelClass}>Փաթեթ</label>
          <div className="mb-4 flex gap-2">
            <select
              value={deckId ?? ""}
              onChange={(e) => setDeckId(Number(e.target.value))}
              disabled={isEdit}
              className={`${inputClass} mb-0 disabled:opacity-60`}
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            {!isEdit && (
              <button
                type="button"
                onClick={() => setShowDeckModal(true)}
                className="shrink-0 rounded-md border border-border px-3 text-sm font-medium text-text transition-colors hover:border-primary"
              >
                + Նոր
              </button>
            )}
          </div>

          <label className={labelClass}>Հարց *</label>
          <textarea
            value={frontText}
            onChange={(e) => setFrontText(e.target.value)}
            rows={2}
            placeholder="Օր.՝ Ինչի՞ է հավասար $(a+b)^2$"
            className={`${inputClass} resize-none ${errors.front ? "border-incorrect" : ""}`}
          />
          {errors.front && <p className="-mt-3 mb-4 text-sm text-incorrect">{errors.front}</p>}

          <ImageDropzone
            label="Հարցի նկար (կամընտիր)"
            file={frontImage}
            existingUrl={existingFrontImageUrl}
            onChange={setFrontImage}
            onRemoveExisting={() => {
              setExistingFrontImageUrl(null);
              setRemoveFrontImage(true);
            }}
          />
          <div className="mb-4" />

          <label className={labelClass}>Պատասխան *</label>
          <textarea
            value={backText}
            onChange={(e) => setBackText(e.target.value)}
            rows={2}
            placeholder="Օր.՝ $a^2 + 2ab + b^2$"
            className={`${inputClass} resize-none ${errors.back ? "border-incorrect" : ""}`}
          />
          {errors.back && <p className="-mt-3 mb-4 text-sm text-incorrect">{errors.back}</p>}

          <ImageDropzone
            label="Պատասխանի նկար (կամընտիր)"
            file={backImage}
            existingUrl={existingBackImageUrl}
            onChange={setBackImage}
            onRemoveExisting={() => {
              setExistingBackImageUrl(null);
              setRemoveBackImage(true);
            }}
          />
          <div className="mb-4" />

          <label className={labelClass}>Հուշում՝ ցուցադրվում է հարցի կողքին (կամընտիր)</label>
          <input value={hint} onChange={(e) => setHint(e.target.value)} className={inputClass} />

          <label className={labelClass}>Բացատրություն՝ ցուցադրվում է պատասխանից հետո (կամընտիր)</label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          <label className={labelClass}>Լրացուցիչ նշումներ (կամընտիր)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          <label className={labelClass}>Աուդիո (կամընտիր)</label>
          {(existingAudioUrl && !removeAudio) || audio ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-border bg-bg p-3">
              <audio controls src={audio ? URL.createObjectURL(audio) : existingAudioUrl ?? undefined} className="h-9 flex-1" />
              <button
                type="button"
                onClick={() => {
                  setAudio(null);
                  setExistingAudioUrl(null);
                  setRemoveAudio(true);
                }}
                className="shrink-0 text-sm text-incorrect hover:underline"
              >
                Հեռացնել
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/x-m4a"
              onChange={(e) => e.target.files?.[0] && setAudio(e.target.files[0])}
              className="mb-4 block w-full text-sm text-text-muted"
            />
          )}

          <label className={labelClass}>Դժվարություն</label>
          <div className="mb-4 flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDifficulty(d.key)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  difficulty === d.key
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border text-text hover:border-primary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <label className={labelClass}>Պիտակներ (կամընտիր)</label>
          <div className="mb-1.5 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-3 py-1 text-sm text-text"
              >
                {t}
                <button type="button" onClick={() => removeTag(t)} className="text-text-muted hover:text-incorrect">
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Գրեք ու սեղմեք Enter"
            className={inputClass}
          />

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSave(false)}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "Պահպանվում է..." : "Պահպանել"}
            </button>
            {!isEdit && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleSave(true)}
                className="flex-1 rounded-md border border-primary px-4 py-2.5 font-medium text-primary transition-colors hover:bg-surface-muted disabled:opacity-60"
              >
                Պահպանել և ստեղծել նորը
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => navigate(-1)}
              className="flex-1 rounded-md border border-border px-4 py-2.5 font-medium text-text transition-colors hover:border-primary disabled:opacity-60"
            >
              Չեղարկել
            </button>
          </div>
        </>
      )}

      {showDeckModal && (
        <DeckFormModal
          title="Ստեղծել նոր փաթեթ"
          busy={busy}
          onSave={handleCreateDeck}
          onClose={() => setShowDeckModal(false)}
        />
      )}
    </div>
  );
}
