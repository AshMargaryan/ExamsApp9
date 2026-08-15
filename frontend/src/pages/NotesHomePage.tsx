import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createDocument,
  createFolder,
  deleteDocument,
  deleteFolder,
  duplicateDocument,
  listDocuments,
  listFolders,
  moveDocument,
  purgeDocument,
  restoreDocument,
  updateDocument,
  updateFolder,
  type DocumentSummary,
  type Folder,
} from "../api/notes";
import { ConfirmModal } from "../components/ConfirmModal";
import { FolderTree } from "../components/notes/FolderTree";
import { NoteCard } from "../components/notes/NoteCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { extractErrorMessage, useToast } from "../context/ToastContext";

type ViewTab = "notes" | "favorites" | "pinned" | "trash";

const TAB_OPTIONS: { value: ViewTab; label: string }[] = [
  { value: "notes", label: "🗒️ Բոլոր նշումները" },
  { value: "favorites", label: "⭐ Ընտրյալներ" },
  { value: "pinned", label: "📌 Ամրակցված" },
  { value: "trash", label: "🗑️ Աղբարկղ" },
];

interface FolderModalState {
  mode: "create" | "rename";
  parentId?: string | null;
  folder?: Folder;
}

export function NotesHomePage() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [tab, setTab] = useState<ViewTab>("notes");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [folderModal, setFolderModal] = useState<FolderModalState | null>(null);
  const [folderName, setFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<DocumentSummary | null>(null);
  const [moveNoteTarget, setMoveNoteTarget] = useState<DocumentSummary | null>(null);
  const [creatingNote, setCreatingNote] = useState(false);

  const loadFolders = useCallback(() => {
    listFolders()
      .then(setFolders)
      .catch((e) => showError(extractErrorMessage(e)));
  }, [showError]);

  const loadDocuments = useCallback(() => {
    setDocuments(null);
    const filters =
      tab === "favorites"
        ? { favorite: true }
        : tab === "pinned"
          ? { pinned: true }
          : tab === "trash"
            ? { trashed: true }
            : { folder: selectedFolderId, q: search || undefined };
    listDocuments(filters)
      .then(setDocuments)
      .catch((e) => showError(extractErrorMessage(e)));
  }, [tab, selectedFolderId, search, showError]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleCreateNote() {
    setCreatingNote(true);
    try {
      const doc = await createDocument({ folder: tab === "notes" ? selectedFolderId : null });
      navigate(`/notes/${doc.id}`);
    } catch (e) {
      showError(extractErrorMessage(e));
    } finally {
      setCreatingNote(false);
    }
  }

  async function handleSaveFolder() {
    if (!folderName.trim() || !folderModal) return;
    try {
      if (folderModal.mode === "create") {
        await createFolder({ name: folderName.trim(), parent: folderModal.parentId ?? null });
      } else if (folderModal.folder) {
        await updateFolder(folderModal.folder.id, { name: folderName.trim() });
      }
      setFolderModal(null);
      setFolderName("");
      loadFolders();
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDeleteFolder() {
    if (!deleteFolderTarget) return;
    try {
      await deleteFolder(deleteFolderTarget.id);
      if (selectedFolderId === deleteFolderTarget.id) setSelectedFolderId(null);
      setDeleteFolderTarget(null);
      loadFolders();
      loadDocuments();
      showSuccess("Թղթապանակը տեղափոխվեց աղբարկղ");
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  function patchNoteLocally(id: string, patch: Partial<DocumentSummary>) {
    setDocuments((prev) => prev?.map((d) => (d.id === id ? { ...d, ...patch } : d)) ?? prev);
  }

  async function toggleFavorite(note: DocumentSummary) {
    const next = !note.is_favorite;
    try {
      await updateDocument(note.id, { is_favorite: next });
      if (tab === "favorites") loadDocuments();
      else patchNoteLocally(note.id, { is_favorite: next });
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function togglePin(note: DocumentSummary) {
    const next = !note.is_pinned;
    try {
      await updateDocument(note.id, { is_pinned: next });
      if (tab === "pinned") loadDocuments();
      else patchNoteLocally(note.id, { is_pinned: next });
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDuplicate(note: DocumentSummary) {
    try {
      await duplicateDocument(note.id);
      loadDocuments();
      showSuccess("Կրկնօրինակվեց");
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleMoveTo(note: DocumentSummary, folderId: string | null) {
    try {
      await moveDocument(note.id, folderId);
      setMoveNoteTarget(null);
      loadDocuments();
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDeleteNote() {
    if (!deleteNoteTarget) return;
    try {
      await deleteDocument(deleteNoteTarget.id);
      setDeleteNoteTarget(null);
      loadDocuments();
      showSuccess("Նշումը տեղափոխվեց աղբարկղ");
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleRestoreNote(note: DocumentSummary) {
    try {
      await restoreDocument(note.id);
      loadDocuments();
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handlePurgeNote(note: DocumentSummary) {
    try {
      await purgeDocument(note.id);
      loadDocuments();
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function handleDropNoteOnFolder(folderId: string | null, noteId: string) {
    try {
      await moveDocument(noteId, folderId);
      loadDocuments();
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  const emptyTitle =
    tab === "trash"
      ? "Աղբարկղը դատարկ է"
      : tab === "favorites"
        ? "Դեռ ընտրյալներ չկան"
        : tab === "pinned"
          ? "Դեռ ամրակցված նշումներ չկան"
          : "Ձեր ուսումնական տարածքը դատարկ է";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Նշումներ</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setFolderModal({ mode: "create", parentId: null });
              setFolderName("");
            }}
          >
            ➕ Նոր թղթապանակ
          </Button>
          <Button onClick={handleCreateNote} loading={creatingNote}>
            📝 Նոր նշում
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
        {tab === "notes" && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Փնտրել նշումների մեջ..."
            className="ml-auto w-full max-w-xs rounded-[var(--radius)] border border-border bg-surface px-4 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        )}
      </div>

      <div className={tab === "notes" ? "grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]" : ""}>
        {tab === "notes" && (
          <aside className="h-fit rounded-[var(--radius)] border border-border bg-surface p-2">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelect={setSelectedFolderId}
              onCreateSubfolder={(parentId) => {
                setFolderModal({ mode: "create", parentId });
                setFolderName("");
              }}
              onRename={(folder) => {
                setFolderModal({ mode: "rename", folder });
                setFolderName(folder.name);
              }}
              onDelete={setDeleteFolderTarget}
              onDropNote={handleDropNoteOnFolder}
            />
          </aside>
        )}

        <div>
          {documents === null ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-[var(--radius)] border border-border bg-surface" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={tab === "trash" ? "🗑️" : "🗒️"}
              title={emptyTitle}
              hint={tab === "notes" ? "Ստեղծեք ձեր առաջին նշումը կամ թղթապանակը։" : undefined}
              cta={tab === "notes" ? { label: "Նոր նշում", onClick: handleCreateNote } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  trashed={tab === "trash"}
                  onOpen={() => navigate(`/notes/${note.id}`)}
                  onToggleFavorite={() => toggleFavorite(note)}
                  onTogglePin={() => togglePin(note)}
                  onDuplicate={() => handleDuplicate(note)}
                  onMove={() => setMoveNoteTarget(note)}
                  onDelete={() => setDeleteNoteTarget(note)}
                  onRestore={() => handleRestoreNote(note)}
                  onPurge={() => handlePurgeNote(note)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={folderModal !== null}
        onOpenChange={(open) => !open && setFolderModal(null)}
        title={folderModal?.mode === "rename" ? "Վերանվանել թղթապանակը" : "Նոր թղթապանակ"}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setFolderModal(null)}>
              Չեղարկել
            </Button>
            <Button className="flex-1" onClick={handleSaveFolder} disabled={!folderName.trim()}>
              Պահպանել
            </Button>
          </>
        }
      >
        <input
          autoFocus
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSaveFolder()}
          placeholder="Թղթապանակի անունը"
          className="w-full rounded-[var(--radius)] border border-border bg-bg px-3.5 py-2.5 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </Modal>

      <Modal
        open={moveNoteTarget !== null}
        onOpenChange={(open) => !open && setMoveNoteTarget(null)}
        title="Տեղափոխել"
        className="max-w-sm"
      >
        <div className="max-h-72 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => moveNoteTarget && handleMoveTo(moveNoteTarget, null)}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            🗒️ Չդասակարգված
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => moveNoteTarget && handleMoveTo(moveNoteTarget, f.id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              📁 {f.name}
            </button>
          ))}
        </div>
      </Modal>

      {deleteFolderTarget && (
        <ConfirmModal
          message={`Ջնջե՞լ «${deleteFolderTarget.name}» թղթապանակը։ Ներսի նշումները կտեղափոխվեն աղբարկղ։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}
      {deleteNoteTarget && (
        <ConfirmModal
          message={`Ջնջե՞լ «${deleteNoteTarget.title || "(անանուն)"}» նշումը։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDeleteNote}
          onCancel={() => setDeleteNoteTarget(null)}
        />
      )}
    </div>
  );
}
