import { useEffect, useState } from "react";
import { Pencil, StickyNote, Trash2 } from "lucide-react";
import { createNote, deleteNote, listNotes, updateNote, type Note } from "../api/notepad";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { LinkButton } from "../components/ui/LinkButton";

function NoteFormModal({
  open,
  onOpenChange,
  note,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSaved: (note: Note) => void;
}) {
  const { showError } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "");
      setContent(note?.content ?? "");
    }
  }, [open, note]);

  async function handleSave() {
    setSaving(true);
    try {
      const saved = note
        ? await updateNote(note.id, { title, content })
        : await createNote({ title, content });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={note ? "Խմբագրել նշումը" : "Նոր նշում"}
      className="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
            Չեղարկել
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!title.trim() && !content.trim()} className="flex-1">
            Պահպանել
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Վերնագիր"
          className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Գրիր այստեղ..."
          rows={8}
          className="resize-none rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
    </Modal>
  );
}

function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="line-clamp-1 text-lg font-semibold text-text">{note.title || "(առանց վերնագրի)"}</h2>
        <span className="shrink-0 text-xs text-text-muted">
          {new Date(note.updated_at).toLocaleDateString("hy-AM")}
        </span>
      </div>
      <p className="mb-4 line-clamp-3 whitespace-pre-wrap text-sm text-text-muted">
        {note.content || "Դատարկ նշում"}
      </p>
      <div className="mt-auto flex gap-3">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} /> Խմբագրել
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={14} strokeWidth={1.75} /> Ջնջել
        </Button>
      </div>
    </div>
  );
}

export function NotepadPage() {
  const { showError } = useToast();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  useEffect(() => {
    listNotes().then(setNotes).catch((err) => showError(extractErrorMessage(err)));
  }, []);

  function openCreate() {
    setEditingNote(null);
    setFormOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setFormOpen(true);
  }

  function handleSaved(saved: Note) {
    setNotes((prev) => {
      if (!prev) return [saved];
      const exists = prev.some((n) => n.id === saved.id);
      const next = exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev];
      return [...next].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteNote(pendingDelete.id);
      setNotes((prev) => prev?.filter((n) => n.id !== pendingDelete.id) ?? null);
      setPendingDelete(null);
    } catch (err) {
      showError(extractErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/" className="mb-4">← Գլխավոր</LinkButton>

      <div className="mb-6 flex items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-semibold text-text">
            <StickyNote size={28} strokeWidth={1.75} /> Նշումներ
          </h1>
          <p className="mt-1 text-sm text-text-muted">Քո բոլոր նշումները մեկ տեղում։</p>
        </div>
        <Button onClick={openCreate}>+ Նոր նշում</Button>
      </div>

      {!notes ? (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={26} strokeWidth={1.75} />}
          title="Այստեղ դեռ նշումներ չկան"
          hint="Ստեղծիր քո առաջին նշումը՝ սեղմելով «Նոր նշում» կոճակը։"
          cta={{ label: "Նոր նշում", onClick: openCreate }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => openEdit(note)}
              onDelete={() => setPendingDelete(note)}
            />
          ))}
        </div>
      )}

      <NoteFormModal open={formOpen} onOpenChange={setFormOpen} note={editingNote} onSaved={handleSaved} />

      <Modal
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Ջնջե՞լ նշումը"
        description={`«${pendingDelete?.title || "(առանց վերնագրի)"}» նշումը կջնջվի անդառնալիորեն։`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} className="flex-1">
              Չեղարկել
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
              Ջնջել
            </Button>
          </>
        }
      />
    </div>
  );
}
