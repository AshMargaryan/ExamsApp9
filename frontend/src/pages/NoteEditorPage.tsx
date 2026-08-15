import { useEffect, useRef, useState } from "react";
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
import { ConfirmModal } from "../components/ConfirmModal";
import { AuthenticatedImage } from "../components/notes/editor/AuthenticatedImage";
import { EditorToolbar } from "../components/notes/editor/EditorToolbar";
import { MathInline } from "../components/notes/editor/MathInline";
import { Button } from "../components/ui/Button";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useDebouncedCallback } from "../hooks/useDebouncedCallback";
import { downloadAuthenticatedFile } from "../lib/authenticatedFile";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type UpdatePatch = Parameters<typeof updateDocument>[1];

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [doc, setDoc] = useState<NoteDocument | null>(null);
  const [title, setTitle] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(id)
      .then((d) => {
        setDoc(d);
        setTitle(d.title);
        setTags(d.tags);
        setIsFavorite(d.is_favorite);
        setIsPinned(d.is_pinned);
      })
      .catch((e) => showError(extractErrorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [persist, flushPersist] = useDebouncedCallback((patch: UpdatePatch) => {
    if (!id) return;
    setSaveStatus("saving");
    updateDocument(id, patch)
      .then(() => setSaveStatus("saved"))
      .catch(() => setSaveStatus("error"));
  }, 800);

  useEffect(() => {
    return () => flushPersist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const editor = useEditor(
    doc
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

  if (!doc) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-text-muted">Բեռնվում է...</div>;
  }

  const statusLabel =
    saveStatus === "saving"
      ? "↻ Պահպանվում է..."
      : saveStatus === "error"
        ? "⚠️ Չհաջողվեց համաժամեցնել, կրկին կփորձենք"
        : saveStatus === "saved"
          ? "✓ Պահպանված է"
          : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {doc.deleted_at && (
        <div className="mb-4 flex items-center justify-between rounded-[var(--radius)] border border-incorrect bg-incorrect-bg px-4 py-3 text-sm text-incorrect">
          <span>Այս նշումը աղբարկղում է։</span>
          <Button size="sm" variant="secondary" onClick={handleRestore}>
            Վերականգնել
          </Button>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>
          ← Նշումներ
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{statusLabel}</span>
          <button
            type="button"
            onClick={togglePin}
            title="Ամրակցել"
            className={isPinned ? "text-primary" : "text-text-muted hover:text-text"}
          >
            📌
          </button>
          <button
            type="button"
            onClick={toggleFavorite}
            title="Ընտրյալ"
            className={isFavorite ? "text-primary" : "text-text-muted hover:text-text"}
          >
            ⭐
          </button>
          <Button variant="secondary" size="sm" onClick={handleDuplicate}>
            Կրկնօրինակել
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
            Ջնջել
          </Button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Անանուն նշում"
        className="mb-2 w-full border-none bg-transparent text-3xl font-bold text-text outline-none placeholder:text-text-muted"
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-muted"
          >
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-incorrect">
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
              <span>📄</span>
              <span className="truncate">{a.original_filename}</span>
              <span className="ml-auto text-xs text-text-muted">{Math.round(a.file_size / 1024)} ԿԲ</span>
            </button>
          ))}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmModal
          message={`Ջնջե՞լ «${title || "(անանուն)"}» նշումը։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
