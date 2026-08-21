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
  type DocumentKind,
  type Folder,
} from "../api/notes";
import {
  FilePlus2,
  Folder as FolderIcon,
  FolderPlus,
  NotebookPen,
  Pencil,
  Pin,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FolderTree, NotesFilterStrip, type NotesView } from "../components/notes/FolderTree";
import { NoteCard } from "../components/notes/NoteCard";
import { Button } from "../components/ui/Button";
import { Dropdown } from "../components/ui/Dropdown";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { cn } from "../lib/cn";

/*
  THE NOTES LIBRARY

  Three things were wrong, in order of how much they cost the student:

  1. **No note title was legible.** Cards sat three-up next to a 220px
     folder rail, giving each card ~200px, and the title was a single
     truncated line sharing that line with an icon, a pin marker, a star
     marker and an overflow button. On the seeded library every title
     rendered as "Մոդուլով անհ…" / "Քառակուսա…" / "Շատ երկար վե…".
     Armenian titles are long; the title is the only thing that identifies
     a note. See NoteCard for the fix.

  2. **Two navigations for one choice.** A `SegmentedControl` of
     Բոլոր նշումները / Ընտրյալներ / Ամրակցված / Աղբարկղ sat seventy pixels
     above a folder rail whose first row was *also* "Բոլոր նշումները".
     The views now live in the rail with the folders, as peers, and the row
     they vacated belongs to search — which sits with the list it filters
     instead of floating right on its own line.

  3. **Search refetched on every keystroke, and blanked the grid each
     time.** `loadDocuments` set `documents` to null before every request
     and had `search` in its deps, so typing five characters fired five
     requests and flashed the whole grid to skeletons five times. It is now
     debounced, and a refetch keeps the current results on screen.

  Also: a failed load called `showError` and left `documents` at null, i.e.
  skeletons forever with a toast that has since disappeared. There is now a
  real error state with a retry.
*/

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
  const [loadError, setLoadError] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [view, setView] = useState<NotesView>("notes");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Typing five characters used to fire five requests and blank the grid
  // five times. Only the settled value drives the fetch.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

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
    // Keep whatever is on screen while refetching — the previous version
    // set this to null first, so every keystroke and every mutation flashed
    // the grid back to skeletons.
    setIsReloading(true);
    setLoadError(false);
    const filters =
      view === "favorites"
        ? { favorite: true }
        : view === "pinned"
          ? { pinned: true }
          : view === "trash"
            ? { trashed: true }
            : { folder: selectedFolderId, q: debouncedSearch || undefined };
    listDocuments(filters)
      .then(setDocuments)
      .catch(() => setLoadError(true))
      .finally(() => setIsReloading(false));
  }, [view, selectedFolderId, debouncedSearch]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleCreateNote(kind: DocumentKind = "rich_text") {
    setCreatingNote(true);
    try {
      const doc = await createDocument({
        folder: view === "notes" ? selectedFolderId : null,
        kind,
        content: kind === "canvas" ? { objects: [] } : undefined,
      });
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
      if (view === "favorites") loadDocuments();
      else patchNoteLocally(note.id, { is_favorite: next });
    } catch (e) {
      showError(extractErrorMessage(e));
    }
  }

  async function togglePin(note: DocumentSummary) {
    const next = !note.is_pinned;
    try {
      await updateDocument(note.id, { is_pinned: next });
      if (view === "pinned") loadDocuments();
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
    view === "trash"
      ? "Աղբարկղը դատարկ է"
      : view === "favorites"
        ? "Դեռ ընտրյալներ չկան"
        : view === "pinned"
          ? "Դեռ ամրակցված նշումներ չկան"
          : debouncedSearch
            ? `«${debouncedSearch}» հարցմամբ ոչինչ չգտնվեց`
            : selectedFolderId
              ? "Այս թղթապանակը դատարկ է"
              : "Քո ուսումնական տարածքը դատարկ է";

  const emptyHint =
    view === "trash"
      ? "Ջնջված նշումները հայտնվում են այստեղ, և կարող ես վերականգնել դրանք։"
      : view === "favorites"
        ? "Նշումի ⋯ ընտրացանկից ավելացրու այն ընտրյալներում։"
        : view === "pinned"
          ? "Ամրակցված նշումները միշտ ցուցակի սկզբում են։"
          : debouncedSearch
            ? "Փորձիր այլ բառ, կամ մաքրիր որոնումը։"
            : "Ստեղծիր քո առաջին նշումը կամ թղթապանակը։";

  const EmptyIcon = view === "trash" ? Trash2 : view === "favorites" ? Star : view === "pinned" ? Pin : NotebookPen;

  // Pinning is supposed to change where a note is, not only which tab it
  // appears under. In the main list pinned notes lead.
  const orderedDocuments =
    documents && view === "notes"
      ? [...documents].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
      : documents;
  const pinnedCount = orderedDocuments?.filter((d) => d.is_pinned).length ?? 0;

  const railProps = {
    folders,
    view,
    selectedFolderId,
    onSelectView: (next: NotesView) => {
      setView(next);
      if (next !== "notes") setSelectedFolderId(null);
    },
    onSelect: (id: string | null) => {
      setView("notes");
      setSelectedFolderId(id);
    },
    onCreateSubfolder: (parentId: string | null) => {
      setFolderModal({ mode: "create", parentId });
      setFolderName("");
    },
    onRename: (folder: Folder) => {
      setFolderModal({ mode: "rename", folder });
      setFolderName(folder.name);
    },
    onDelete: setDeleteFolderTarget,
    onDropNote: handleDropNoteOnFolder,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Նշումներ"
        description="Քո սեփական ուսումնական նյութերը՝ մեկ տեղում"
        actions={
          <>
            <Button
              variant="secondary"
              iconLeft={<FolderPlus size={16} strokeWidth={1.75} />}
              onClick={() => {
                setFolderModal({ mode: "create", parentId: null });
                setFolderName("");
              }}
            >
              Նոր թղթապանակ
            </Button>
            <Dropdown
              align="end"
              renderTrigger={(props) => (
                <Button {...props} loading={creatingNote} iconLeft={<FilePlus2 size={16} strokeWidth={1.75} />}>
                  Նոր նշում
                </Button>
              )}
              items={[
                {
                  key: "rich_text",
                  icon: <NotebookPen size={15} strokeWidth={1.75} />,
                  label: "Տեքստային նշում",
                  onSelect: () => handleCreateNote("rich_text"),
                },
                {
                  key: "canvas",
                  icon: <Pencil size={15} strokeWidth={1.75} />,
                  label: "Նկարչություն",
                  onSelect: () => handleCreateNote("canvas"),
                },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-[var(--space-6)] lg:grid-cols-[232px_1fr]">
        {/* One navigation. On mobile it sits above the list rather than
            becoming a second, differently-shaped control. */}
        <aside className="hidden h-fit rounded-[var(--radius)] border border-border bg-surface p-[var(--space-2)] lg:sticky lg:top-[var(--space-4)] lg:block">
          <FolderTree {...railProps} />
        </aside>
        <NotesFilterStrip
          className="lg:hidden"
          folders={folders}
          view={view}
          selectedFolderId={selectedFolderId}
          onSelectView={railProps.onSelectView}
          onSelect={railProps.onSelect}
        />

        <div className="min-w-0">
          <div className="mb-[var(--space-5)] flex flex-wrap items-center gap-[var(--space-3)]">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={view !== "notes"}
                aria-label="Փնտրել նշումների մեջ"
                placeholder={view === "notes" ? "Փնտրել նշումների մեջ..." : "Որոնումը հասանելի է բոլոր նշումներում"}
                className={cn(
                  "w-full rounded-[var(--radius)] border border-border bg-surface",
                  "py-[var(--space-2)] pl-[var(--space-9)] pr-[var(--space-3)]",
                  "text-[length:var(--text-sm)] text-text placeholder:text-text-muted",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              />
            </div>
            <p aria-live="polite" className="text-[length:var(--text-sm)] text-text-muted">
              {orderedDocuments ? `${orderedDocuments.length} նշում` : ""}
            </p>
          </div>

          {loadError ? (
            <ErrorState title="Չհաջողվեց բեռնել նշումները։" onRetry={loadDocuments} />
          ) : documents === null ? (
            <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[var(--radius)] border border-border bg-surface p-[var(--space-4)]">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-5/6" />
                  <Skeleton className="mt-4 h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : orderedDocuments && orderedDocuments.length === 0 ? (
            <EmptyState
              icon={<EmptyIcon size={24} strokeWidth={1.75} />}
              tone={view === "trash" ? "positive" : "neutral"}
              title={emptyTitle}
              hint={emptyHint}
              cta={
                view === "notes" && !debouncedSearch
                  ? { label: "Նոր նշում", onClick: () => handleCreateNote("rich_text") }
                  : debouncedSearch
                    ? { label: "Մաքրել որոնումը", onClick: () => setSearch("") }
                    : undefined
              }
            />
          ) : (
            <div
              // Two columns, not three. Three left each card ~200px next to
              // the rail, which is narrower than most Armenian note titles.
              className={cn(
                // Column count follows the *available* width, not the viewport's. The
                // rail arrives at lg and eats 232px of it, so lg drops back to a
                // single column rather than squeezing two 224px cards — which is
                // narrower than most Armenian note titles.
                "grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3",
                isReloading && "opacity-60 transition-opacity",
              )}
              aria-busy={isReloading || undefined}
            >
              {orderedDocuments?.map((note, index) => (
                <div key={note.id} className="contents">
                  {view === "notes" && pinnedCount > 0 && index === pinnedCount && (
                    <p className="col-span-full mt-[var(--space-2)] text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
                      Մնացած նշումները
                    </p>
                  )}
                  <NoteCard
                    note={note}
                    trashed={view === "trash"}
                    onOpen={() => navigate(`/notes/${note.id}`)}
                    onToggleFavorite={() => toggleFavorite(note)}
                    onTogglePin={() => togglePin(note)}
                    onDuplicate={() => handleDuplicate(note)}
                    onMove={() => setMoveNoteTarget(note)}
                    onDelete={() => setDeleteNoteTarget(note)}
                    onRestore={() => handleRestoreNote(note)}
                    onPurge={() => handlePurgeNote(note)}
                  />
                </div>
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
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          <li>
            <button
              type="button"
              onClick={() => moveNoteTarget && handleMoveTo(moveNoteTarget, null)}
              className="flex w-full items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] text-text hover:bg-surface-muted"
            >
              <NotebookPen size={15} strokeWidth={1.75} className="text-text-muted" /> Չդասակարգված
            </button>
          </li>
          {folders.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => moveNoteTarget && handleMoveTo(moveNoteTarget, f.id)}
                className="flex w-full items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-left text-[length:var(--text-sm)] text-text hover:bg-surface-muted"
              >
                <FolderIcon size={15} strokeWidth={1.75} className="text-text-muted" /> {f.name}
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {/* ConfirmDialog, not the older components/ConfirmModal: deleting a
          folder and everything in it is exactly the kind of decision that
          needs a focus trap, Escape and scroll lock, none of which the old
          modal has. */}
      <ConfirmDialog
        open={deleteFolderTarget !== null}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
        title={`Ջնջե՞լ «${deleteFolderTarget?.name ?? ""}» թղթապանակը`}
        description="Ներսի նշումները չեն ջնջվի — դրանք կտեղափոխվեն աղբարկղ, որտեղից կարող ես վերականգնել դրանք։"
        confirmLabel="Ջնջել"
        onConfirm={handleDeleteFolder}
      />
      <ConfirmDialog
        open={deleteNoteTarget !== null}
        onOpenChange={(open) => !open && setDeleteNoteTarget(null)}
        title={`Ջնջե՞լ «${deleteNoteTarget?.title || "(անանուն)"}» նշումը`}
        description="Նշումը կտեղափոխվի աղբարկղ, որտեղից կարող ես վերականգնել այն։"
        confirmLabel="Ջնջել"
        onConfirm={handleDeleteNote}
      />
    </div>
  );
}
