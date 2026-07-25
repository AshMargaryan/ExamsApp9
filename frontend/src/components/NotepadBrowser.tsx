import { useState } from "react";
import { useNotepad } from "../context/NotepadContext";
import { MathText } from "./MathText";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("hy-AM", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotepadBrowser({ onClose, fullscreen = false }: { onClose: () => void; fullscreen?: boolean }) {
  const {
    notes,
    activeNoteId,
    switchNote,
    createNote,
    renameNote,
    deleteNote,
    pendingEquation,
    clearPendingEquation,
    insertEquationIntoNote,
    insertEquationIntoNewNote,
  } = useNotepad();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  function startRename(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  function commitRename() {
    if (editingId && editingName.trim()) {
      renameNote(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  function handleClose() {
    clearPendingEquation();
    onClose();
  }

  function handleCreateOrNewInsert() {
    if (pendingEquation) {
      insertEquationIntoNewNote(pendingEquation);
      onClose();
    } else {
      createNote();
    }
  }

  function handlePickNote(id: string) {
    if (pendingEquation) {
      insertEquationIntoNote(id, pendingEquation);
      onClose();
    } else {
      switchNote(id);
    }
  }

  return (
    <div
      className={
        fullscreen
          ? "absolute inset-y-0 right-0 z-20 flex w-72 flex-col border-l border-border bg-surface p-3 shadow-xl"
          : "absolute inset-0 z-20 flex flex-col rounded-[var(--radius)] bg-surface p-3"
      }
    >
      {pendingEquation && (
        <div className="mb-2 rounded-md border border-primary/50 bg-primary/5 px-2 py-2 text-sm">
          <p className="mb-1 text-xs text-text-muted">Ընտրեք՝ որտե՞ղ տեղադրել այս հավասարումը.</p>
          <div className="overflow-x-auto">
            <MathText text={pendingEquation} />
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-text-muted">📁 Իմ նշումները</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateOrNewInsert}
            className="rounded-md border border-border px-2 py-1 text-xs hover:border-primary"
          >
            + Նոր նշում
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sorted.map((n) => (
          <div
            key={n.id}
            className={`mb-1 flex items-center justify-between rounded-md border px-2 py-2 ${
              n.id === activeNoteId ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {editingId === n.id ? (
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="mr-2 min-w-0 flex-1 rounded border border-primary bg-surface px-1 py-0.5 text-sm outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => handlePickNote(n.id)}
                className="min-w-0 flex-1 truncate text-left text-sm text-text"
                title={n.name}
              >
                {n.name}
                <span className="ml-2 text-xs text-text-muted">{formatDate(n.updatedAt)}</span>
              </button>
            )}

            <div className="ml-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => startRename(n.id, n.name)}
                aria-label="Rename"
                title="Վերանվանել"
                className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
              >
                ✎
              </button>
              {confirmDeleteId === n.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      deleteNote(n.id);
                      setConfirmDeleteId(null);
                    }}
                    title="Հաստատել ջնջումը"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Ջնջե՞լ
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs text-text-muted hover:underline"
                  >
                    Ոչ
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(n.id)}
                  aria-label="Delete"
                  title="Ջնջել"
                  className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}