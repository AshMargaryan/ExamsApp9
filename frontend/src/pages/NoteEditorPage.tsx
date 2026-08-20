import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

import {
  deleteDocument,
  duplicateDocument,
  getDocument,
  restoreDocument,
  updateDocument,
  uploadAttachment,
  type Document as NoteDocument,
} from "../api/notes";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pin,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Dropdown } from "../components/ui/Dropdown";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { CanvasEditor } from "../components/notes/canvas/CanvasEditor";
import { AuthenticatedImage } from "../components/notes/editor/AuthenticatedImage";
import { EditorToolbar } from "../components/notes/editor/EditorToolbar";
import { MathInline } from "../components/notes/editor/MathInline";
import { Button } from "../components/ui/Button";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { downloadAuthenticatedFile } from "../lib/authenticatedFile";
import { formatBytes } from "../lib/formatBytes";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type UpdatePatch = Parameters<typeof updateDocument>[1];

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [doc, setDoc] = useState<NoteDocument | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDoc = useCallback(() => {
    if (!id) return;
    setLoadError(false);
    getDocument(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
        setTags(d.tags);
        setIsFavorite(d.is_favorite);
        setIsPinned(d.is_pinned);
      })
      // Was `.catch(showError)`, which left `doc` at null — i.e. the note
      // read "Բեռնվում է..." forever behind a toast that had already gone.
      .catch(() => setLoadError(true));
  }, [id]);

  useEffect(loadDoc, [loadDoc]);

  // The last patch that failed, so the error state can offer a retry that
  // actually retries. Previously the label promised "կրկին կփորձենք" and
  // nothing ever did — the debounced save only fires again on the next edit,
  // so a student who stopped typing after a failure silently lost the change.
  const failedPatchRef = useRef<UpdatePatch | null>(null);

  const savePatch = useCallback(
    (patch: UpdatePatch) => {
      if (!id) return;
      setSaveStatus("saving");
      updateDocument(id, patch)
        .then(() => {
          failedPatchRef.current = null;
          setSaveStatus("saved");
        })
        .catch(() => {
          failedPatchRef.current = patch;
          setSaveStatus("error");
        });
    },
    [id],
  );

  const [persist, flushPersist] = useDebouncedCallback(savePatch, 800);

  function retrySave() {
    if (failedPatchRef.current) savePatch(failedPatchRef.current);
  }

  useEffect(() => {
    return () => flushPersist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const editor = useEditor(
    doc && doc.kind !== "canvas"
      ? {
          extensions: [
            StarterKit,
            Underline,
            Highlight,
            Link.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder: "Սկսեք գրել..." }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableCell,
            TableHeader,
            AuthenticatedImage,
            MathInline,
          ],
          content: doc.content && Object.keys(doc.content).length ? doc.content : undefined,
          onUpdate: ({ editor }) => {
            persist({ content: editor.getJSON() as Record<string, unknown> });
          },
        }
      : // Loading placeholder — still needs a valid schema (StarterKit alone
        // provides doc/paragraph/text), or ProseMirror throws "Schema is
        // missing its top node type ('doc')" on this transient first render.
        { extensions: [StarterKit] },
    [doc?.id],
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    persist({ title: value });
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    persist({ tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    persist({ tags: next });
  }

  async function toggleFavorite() {
    if (!id) return;
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      await updateDocument(id, { is_favorite: next });
    } catch (e) {
      setIsFavorite(!next);
      showError(extractErrorMessage(e));
    }
  }

  async function togglePin() {
    if (!id) return;
    const next = !isPinned;
    setIsPinned(next);
    try {
      await updateDocument(id, { is_pinned: next });
    } catch (e) {
      setIsPinned(!next);
      showError(extractErrorMessage(e));
    }
  }

  async function handleImageSelected(file: File) {
    if (!id || !editor) return;
    try {
      const attachment = await uploadAttachment(id, file);
      editor.chain().focus().setImage({ src: attachment.download_url, alt: attachment.original_filename }).run();
      setDoc((prev) => (prev ? { ...prev, attachments: [...prev.attachments, attachment] } : prev));
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleFileSelected(file: File) {
    if (!id) return;
    try {
      const attachment = await uploadAttachment(id, file);
      setDoc((prev) => (prev ? { ...prev, attachments: [...prev.attachments, attachment] } : prev));
      showSuccess("Ֆայլը կցվեց");
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteDocument(id);
      navigate("/notes");
    } catch (e) {
      showError(extractErrorMessage(e));
    } finally {
      setConfirmingDelete(false);
    }
  }

  async function handleRestore() {
    if (!id) return;
    try {
      const restored = await restoreDocument(id);
      setDoc(restored);
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDuplicate() {
    if (!id) return;
    try {
      const copy = await duplicateDocument(id);
      navigate(`/notes/${copy.id}`);
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState title="Չհաջողվեց բացել նշումը։" onRetry={loadDoc} />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8" aria-busy="true">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-4 h-4 w-24" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={doc.kind === "canvas" ? "mx-auto max-w-full px-4 py-6" : "mx-auto max-w-3xl px-4 py-8"}>
      {doc.deleted_at && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-incorrect bg-incorrect-bg px-4 py-3 text-sm text-incorrect">
          <span>Այս նշումը աղբարկղում է։</span>
          <Button size="sm" variant="secondary" onClick={handleRestore}>
            Վերականգնել
          </Button>
        </div>
      )}

      <div className="mb-[var(--space-4)] flex items-center justify-between gap-[var(--space-3)]">
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<ArrowLeft size={15} strokeWidth={1.75} />}
          onClick={() => navigate("/notes")}
        >
          Նշումներ
        </Button>
        <div className="flex items-center gap-[var(--space-2)]">
          <SaveIndicator status={saveStatus} onRetry={retrySave} />
          <ToggleIconButton
            pressed={isPinned}
            onClick={togglePin}
            label={isPinned ? "Հանել ամրակցումը" : "Ամրակցել"}
            icon={<Pin size={16} strokeWidth={2} />}
          />
          <ToggleIconButton
            pressed={isFavorite}
            onClick={toggleFavorite}
            label={isFavorite ? "Հանել ընտրյալներից" : "Ավելացնել ընտրյալներում"}
            icon={<Star size={16} strokeWidth={2} />}
          />
          {/*
            Delete used to be a solid `variant="danger"` button here — the
            single loudest control on the page, sitting one tab stop from the
            note's own text. Deleting a note is rare and irreversible-feeling;
            it belongs behind the overflow, not in front of it. (§41)
          */}
          <Dropdown
            align="end"
            renderTrigger={(props) => (
              <button
                {...props}
                aria-label="Նշումի գործողություններ"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <MoreHorizontal size={17} strokeWidth={2} />
              </button>
            )}
            items={[
              {
                key: "duplicate",
                label: "Կրկնօրինակել",
                icon: <Copy size={15} strokeWidth={1.75} />,
                onSelect: handleDuplicate,
              },
              {
                key: "delete",
                label: "Ջնջել",
                tone: "danger",
                icon: <Trash2 size={15} strokeWidth={1.75} />,
                onSelect: () => setConfirmingDelete(true),
              },
            ]}
          />
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Անանուն նշում"
        aria-label="Նշումի վերնագիր"
        className="mb-[var(--space-2)] w-full border-none bg-transparent font-display text-[length:var(--text-3xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-text outline-none placeholder:text-text-muted"
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-muted"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Հեռացնել «${tag}» պիտակը`}
              className="rounded-[var(--radius-full)] leading-none hover:text-incorrect"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="+ պիտակ"
          className="w-24 border-none bg-transparent text-xs text-text-muted outline-none placeholder:text-text-muted"
        />
      </div>

      {doc.kind === "canvas" ? (
        <CanvasEditor content={doc.content} onChange={(content) => persist({ content })} />
      ) : (
        <div className="rounded-[var(--radius)] border border-border bg-surface">
          {editor && (
            <EditorToolbar
              editor={editor}
              onInsertImage={() => imageInputRef.current?.click()}
              onInsertAttachment={() => fileInputRef.current?.click()}
            />
          )}
          <div className="min-h-[50vh] px-4 py-4">
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageSelected(file);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
          e.target.value = "";
        }}
      />

      {doc.attachments.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-text-muted">Կցորդներ</h2>
          {doc.attachments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => downloadAuthenticatedFile(a.download_url, a.original_filename)}
              className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-left text-sm text-text hover:border-primary"
            >
              <Paperclip size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
              <span className="truncate">{a.original_filename}</span>
              <span className="ml-auto shrink-0 text-xs text-text-muted">{formatBytes(a.file_size)}</span>
            </button>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Ջնջե՞լ «${title || "(անանուն)"}» նշումը`}
        description="Նշումը կտեղափոխվի աղբարկղ, որտեղից կարող եք վերականգնել այն։"
        confirmLabel="Ջնջել"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** A pin/favourite toggle. `aria-pressed` is what makes it a toggle rather
 *  than a button that happens to change colour — the previous version was a
 *  bare emoji with a `title`, which a screen reader reports as
 *  "pushpin, Ամրակցել" whether it is on or off. */
function ToggleIconButton({
  pressed,
  onClick,
  label,
  icon,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border transition-colors",
        "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        pressed
          ? "border-primary-line bg-primary-bg text-primary"
          : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text",
      )}
    >
      {icon}
    </button>
  );
}

/*
  Whether the student's work is safe.

  This was a `text-xs text-text-muted` string that rendered as empty in the
  idle state, next to a solid red delete button — so the loudest thing on the
  page was the destructive action and the quietest was the reassurance. It is
  now always present once anything has been typed, and its error branch
  offers a retry that actually retries, instead of the old label's promise
  that "we'll try again" when nothing would.
*/
function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "idle") return null;

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-incorrect bg-incorrect-bg px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-incorrect"
      >
        <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" />
        Չպահպանվեց — փորձել կրկին
      </button>
    );
  }

  return (
    <span
      aria-live="polite"
      className="flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted"
    >
      {status === "saving" ? (
        <>
          {/* motion-safe: a permanently spinning icon is exactly what
              prefers-reduced-motion is for. */}
          <Loader2 size={13} strokeWidth={2} aria-hidden="true" className="motion-safe:animate-spin" />
          Պահպանվում է...
        </>
      ) : (
        <>
          <Check size={13} strokeWidth={2.5} aria-hidden="true" className="text-correct" />
          Պահպանված է
        </>
      )}
    </span>
  );
}
