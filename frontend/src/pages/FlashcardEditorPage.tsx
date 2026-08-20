import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Plus, Sparkles, X } from "lucide-react";
import {
  createCard, createDeck, getCard, listMyDecks, updateCard,
  type CardFormInput, type DeckFormInput, type FlashcardDeckSummary, type FlashcardDifficulty,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { ImageDropzone } from "../components/flashcards/ImageDropzone";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, fieldInputClass } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

const DIFFICULTIES: { key: FlashcardDifficulty; label: string }[] = [
  { key: "easy", label: "Հեշտ" },
  { key: "medium", label: "Միջին" },
  { key: "hard", label: "Դժվար" },
];

export function FlashcardEditorPage() {
  const { cardId } = useParams<{ cardId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const isEdit = !!cardId;

  const [decks, setDecks] = useState<FlashcardDeckSummary[] | null>(null);
  const [decksFailed, setDecksFailed] = useState(false);
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
  const [showExtras, setShowExtras] = useState(false);

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
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const loadDecks = useCallback(() => {
    setDecksFailed(false);
    listMyDecks()
      .then((d) => {
        setDecks(d);
        const preselect = searchParams.get("deck");
        if (preselect) setDeckId(Number(preselect));
        else if (d.length > 0 && !isEdit) setDeckId(d[0].id);
      })
      // Was unguarded, so a failed deck list left the page on its skeleton
      // for ever with no error and no retry.
      .catch(() => setDecksFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(loadDecks, [loadDecks]);

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
        // An existing card with any of these filled should show them rather
        // than hiding a value the student already set behind a disclosure.
        setShowExtras(Boolean(card.hint || card.explanation || card.notes || card.audio_url));
        setLoaded(true);
      })
      .catch(() => {
        showError("Քարտը չհաջողվեց բեռնել։");
        navigate("/flashcards");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  /** Every editable control routes its change through this, so "are there
   *  unsaved changes" is one fact rather than a comparison of twelve. */
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true);
      setter(value);
    };
  }

  // A blob URL created during render leaks one object per re-render. Created
  // once per file here, and revoked when the file changes or the page unmounts.
  const audioPreviewUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => {
    if (!audioPreviewUrl) return;
    return () => URL.revokeObjectURL(audioPreviewUrl);
  }, [audioPreviewUrl]);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setDirty(true);
    }
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
    setDirty(true);
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
    setDirty(false);
  }

  async function handleSave(createAnother: boolean) {
    if (!validate()) return;
    if (!deckId) {
      showError("Ընտրիր փաթեթ։");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && cardId) {
        await updateCard(Number(cardId), buildInput());
        showSuccess("Քարտը պահպանվեց։");
        setDirty(false);
        navigate(`/flashcards/${deckId}/manage`);
      } else {
        await createCard(deckId, buildInput());
        showSuccess("Քարտը ստեղծվեց։");
        if (createAnother) {
          resetForNextCard();
        } else {
          setDirty(false);
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

  function leave() {
    if (deckId) navigate(`/flashcards/${deckId}/manage`);
    else navigate("/flashcards");
  }

  function handleCancel() {
    // A half-written card is real work. Cancel used to discard it silently.
    if (dirty) setConfirmDiscard(true);
    else leave();
  }

  const backTarget = deckId ? `/flashcards/${deckId}/manage` : "/flashcards";
  const backLabel = deckId && decks?.find((d) => d.id === deckId)
    ? decks.find((d) => d.id === deckId)!.title
    : "Բառաքարտեր";

  if (decksFailed) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Բառաքարտ" back={{ to: "/flashcards", label: "Բառաքարտեր" }} />
        <ErrorState
          title="Փաթեթների ցանկը չհաջողվեց բեռնել։"
          hint="Առանց փաթեթի քարտ չի ստեղծվում։ Ստուգիր կապը և փորձիր կրկին։"
          onRetry={loadDecks}
        />
      </div>
    );
  }

  if (!loaded || !decks) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-32" />
        <Skeleton className="mb-[var(--space-7)] h-9 w-1/2" />
        <Skeleton className="mb-[var(--space-5)] h-11 w-full" />
        <Skeleton className="mb-[var(--space-4)] h-24 w-full" />
        <Skeleton className="mb-[var(--space-4)] h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: backTarget, label: backLabel }}
        title={isEdit ? "Խմբագրել քարտը" : "Ստեղծել բառաքարտ"}
        description="Մաթեմատիկան գրիր $…$-ի մեջ — ներքևում կտեսնես, թե ինչպես կերևա քարտի վրա։"
      />

      {decks.length === 0 ? (
        <EmptyState
          title="Դեռ չունես սեփական փաթեթներ։"
          hint="Քարտը պետք է ինչ-որ փաթեթում լինի — ստեղծիր առաջինը։"
          cta={{ label: "Ստեղծել փաթեթ", onClick: () => setShowDeckModal(true) }}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
        >
          <div className="mb-[var(--space-6)] flex items-end gap-[var(--space-2)]">
            <Select
              label="Փաթեթ"
              className="flex-1"
              value={deckId ? String(deckId) : ""}
              onChange={(v) => {
                setDeckId(Number(v));
                setDirty(true);
              }}
              disabled={isEdit}
              options={decks.map((d) => ({ value: String(d.id), label: d.title }))}
            />
            {!isEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeckModal(true)}
                iconLeft={<Plus size={16} strokeWidth={2} aria-hidden />}
                className="shrink-0"
              >
                Նոր
              </Button>
            )}
          </div>

          <Section title="Քարտը" level={2} spacing="tight">
            <Field label="Հարց" error={errors.front} hint="Պարտադիր">
              {(props) => (
                <textarea
                  {...props}
                  value={frontText}
                  onChange={(e) => {
                    setFrontText(e.target.value);
                    setDirty(true);
                  }}
                  rows={2}
                  placeholder="Օր.՝ Ինչի՞ է հավասար $(a+b)^2$"
                  className={cn(props.className, "resize-none")}
                />
              )}
            </Field>

            <ImageDropzone
              label="Հարցի նկար (կամընտիր)"
              file={frontImage}
              existingUrl={existingFrontImageUrl}
              onChange={edit(setFrontImage)}
              onRemoveExisting={() => {
                setExistingFrontImageUrl(null);
                setRemoveFrontImage(true);
                setDirty(true);
              }}
            />
            <div className="mb-[var(--space-4)]" />

            <Field label="Պատասխան" error={errors.back} hint="Պարտադիր">
              {(props) => (
                <textarea
                  {...props}
                  value={backText}
                  onChange={(e) => {
                    setBackText(e.target.value);
                    setDirty(true);
                  }}
                  rows={2}
                  placeholder="Օր.՝ $a^2 + 2ab + b^2$"
                  className={cn(props.className, "resize-none")}
                />
              )}
            </Field>

            <ImageDropzone
              label="Պատասխանի նկար (կամընտիր)"
              file={backImage}
              existingUrl={existingBackImageUrl}
              onChange={edit(setBackImage)}
              onRemoveExisting={() => {
                setExistingBackImageUrl(null);
                setRemoveBackImage(true);
                setDirty(true);
              }}
            />

            {/*
              The one thing this page most needed and did not have.

              The placeholder asks the student to type `$(a+b)^2$` and then
              never showed what that becomes — so the only way to find out
              whether a formula was written correctly was to save the card,
              open the deck, and study it. A malformed `\dfrac` was discovered
              in the middle of a revision session, which is the worst possible
              moment. It renders here, as you type, exactly as MathText will
              render it on the card.
            */}
            {(frontText.trim() || backText.trim()) && (
              <div className="mt-[var(--space-5)] rounded-[var(--radius-lg)] border border-border bg-surface-muted p-[var(--space-4)]">
                <p className="mb-[var(--space-3)] flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] font-medium text-text-muted">
                  <Sparkles size={13} strokeWidth={1.75} aria-hidden />
                  Այսպես կերևա քարտը
                </p>
                <div className="rounded-[var(--radius-md)] border border-border bg-surface p-[var(--space-4)] text-center">
                  <div className="math-scroll">
                    <MathText
                      text={frontText || "…"}
                      className="text-[length:var(--text-lg)] leading-relaxed text-text"
                    />
                  </div>
                  <hr className="my-[var(--space-3)] border-0 border-t border-border" />
                  <div className="math-scroll">
                    <MathText
                      text={backText || "…"}
                      className="text-[length:var(--text-lg)] leading-relaxed text-text"
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/*
            Seven optional fields used to sit in the same undifferentiated
            column as the two required ones, so creating a card looked like a
            twelve-field form when it is really a two-field one.
          */}
          <div className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-border">
            <button
              type="button"
              aria-expanded={showExtras}
              onClick={() => setShowExtras((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-lg)]",
                "px-[var(--space-4)] py-[var(--space-3)] text-left",
                "transition-colors hover:bg-surface-muted",
              )}
            >
              <span className="text-[length:var(--text-sm)] font-medium text-text">
                Հուշում, բացատրություն, նշումներ, աուդիո
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                aria-hidden
                className={cn("shrink-0 text-text-muted transition-transform duration-[var(--motion-fast)]", showExtras && "rotate-180")}
              />
            </button>
            {showExtras && (
              <div className="border-t border-border p-[var(--space-4)]">
                <Field
                  label="Հուշում"
                  hint="Ցուցադրվում է հարցի կողքին"
                  value={hint}
                  onChange={(e) => {
                    setHint(e.target.value);
                    setDirty(true);
                  }}
                />

                <Field label="Բացատրություն" hint="Ցուցադրվում է պատասխանից հետո">
                  {(props) => (
                    <textarea
                      {...props}
                      value={explanation}
                      onChange={(e) => {
                        setExplanation(e.target.value);
                        setDirty(true);
                      }}
                      rows={2}
                      className={cn(props.className, "resize-none")}
                    />
                  )}
                </Field>

                <Field label="Լրացուցիչ նշումներ">
                  {(props) => (
                    <textarea
                      {...props}
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setDirty(true);
                      }}
                      rows={2}
                      className={cn(props.className, "resize-none")}
                    />
                  )}
                </Field>

                <Field label="Աուդիո">
                  {(props) =>
                    (existingAudioUrl && !removeAudio) || audio ? (
                      <div className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-3)]">
                        <audio
                          controls
                          src={audioPreviewUrl ?? existingAudioUrl ?? undefined}
                          className="h-9 flex-1"
                        />
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setAudio(null);
                            setExistingAudioUrl(null);
                            setRemoveAudio(true);
                            setDirty(true);
                          }}
                          className="shrink-0"
                        >
                          Հեռացնել
                        </Button>
                      </div>
                    ) : (
                      <input
                        {...props}
                        type="file"
                        accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/x-m4a"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setAudio(e.target.files[0]);
                            setDirty(true);
                          }
                        }}
                        className="block w-full text-[length:var(--text-sm)] text-text-muted"
                      />
                    )
                  }
                </Field>
              </div>
            )}
          </div>

          <Section title="Դասակարգում" level={2} spacing="tight" className="mt-[var(--space-6)]">
            <fieldset className="mb-[var(--space-4)]">
              <legend className="mb-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-text">
                Դժվարություն
              </legend>
              <div role="radiogroup" aria-label="Դժվարություն" className="flex gap-[var(--space-2)]">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    role="radio"
                    aria-checked={difficulty === d.key}
                    onClick={() => {
                      setDifficulty(d.key);
                      setDirty(true);
                    }}
                    className={cn(
                      "flex-1 rounded-[var(--radius-md)] border px-[var(--space-3)] py-[var(--space-2)]",
                      "text-[length:var(--text-sm)] font-medium transition-colors duration-[var(--motion-fast)]",
                      difficulty === d.key
                        ? "border-primary bg-primary text-primary-contrast"
                        : "border-border text-text hover:border-primary",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Field label="Պիտակներ" hint="Գրիր և սեղմիր Enter">
              {(props) => (
                <>
                  {tags.length > 0 && (
                    <ul className="mb-[var(--space-2)] flex flex-wrap gap-[var(--space-2)]">
                      {tags.map((t) => (
                        <li
                          key={t}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-surface-muted py-1 pr-1 pl-3 text-[length:var(--text-sm)] text-text"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            /* Was a bare "✕" with no accessible name, so a
                               screen reader announced only a glyph. */
                            aria-label={`Հեռացնել «${t}» պիտակը`}
                            className="flex h-5 w-5 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-incorrect-bg hover:text-incorrect"
                          >
                            <X size={13} strokeWidth={2} aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    {...props}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    /* No longer committed on blur: tabbing past a half-typed
                       word used to silently create a tag out of it. */
                    placeholder="Օր.՝ բանաձևեր"
                    className={cn(props.className, fieldInputClass)}
                  />
                </>
              )}
            </Field>
          </Section>

          {/*
            Three `flex-1` buttons gave "Չեղարկել" exactly as much weight as
            "Պահպանել". One primary, one secondary for the repeat-entry path,
            and cancel as a quiet text action.
          */}
          <div className="mt-[var(--space-7)] flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center">
            <Button type="submit" loading={busy} className="sm:flex-1">
              Պահպանել
            </Button>
            {!isEdit && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => handleSave(true)}
                className="sm:flex-1"
              >
                Պահպանել և ստեղծել նորը
              </Button>
            )}
            <Button type="button" variant="ghost" disabled={busy} onClick={handleCancel}>
              Չեղարկել
            </Button>
          </div>
        </form>
      )}

      <DeckFormModal
        open={showDeckModal}
        onOpenChange={setShowDeckModal}
        title="Ստեղծել նոր փաթեթ"
        busy={busy}
        onSave={handleCreateDeck}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Հրաժարվե՞լ չպահպանված փոփոխություններից"
        description="Այս քարտում գրածդ չի պահպանվի։"
        confirmLabel="Հրաժարվել"
        cancelLabel="Շարունակել խմբագրումը"
        onConfirm={leave}
      />
    </div>
  );
}
