import { useState } from "react";
import type { Folder } from "../../api/notes";
import { Dropdown } from "../ui/Dropdown";
import { cn } from "../../lib/cn";

interface FolderTreeProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onDropNote: (folderId: string | null, noteId: string) => void;
}

function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parent === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

function FolderRow({
  folder,
  depth,
  folders,
  selectedFolderId,
  onSelect,
  onCreateSubfolder,
  onRename,
  onDelete,
  onDropNote,
}: FolderTreeProps & { folder: Folder; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const children = childrenOf(folders, folder.id);

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1.5 py-1.5 text-sm",
          selectedFolderId === folder.id ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted",
          dragOver && "ring-2 ring-primary",
        )}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const noteId = e.dataTransfer.getData("application/x-note-id");
          if (noteId) onDropNote(folder.id, noteId);
        }}
      >
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-xs text-text-muted"
            aria-label={expanded ? "Ծալել" : "Բացել"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex flex-1 items-center gap-1.5 truncate text-left font-medium"
        >
          <span>📁</span>
          <span className="truncate">{folder.name}</span>
        </button>
        <Dropdown
          align="end"
          renderTrigger={(props) => (
            <button
              {...props}
              className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-surface hover:text-text group-hover:flex"
            >
              ⋯
            </button>
          )}
          items={[
            { key: "new", label: "Նոր ենթաթղթապանակ", onSelect: () => onCreateSubfolder(folder.id) },
            { key: "rename", label: "Վերանվանել", onSelect: () => onRename(folder) },
            { key: "delete", label: "Ջնջել", tone: "danger", onSelect: () => onDelete(folder) },
          ]}
        />
      </div>
      {expanded &&
        children.map((child) => (
          <FolderRow
            key={child.id}
            folder={child}
            depth={depth + 1}
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onCreateSubfolder={onCreateSubfolder}
            onRename={onRename}
            onDelete={onDelete}
            onDropNote={onDropNote}
          />
        ))}
    </div>
  );
}

export function FolderTree(props: FolderTreeProps) {
  const roots = childrenOf(props.folders, null);
  const [rootDragOver, setRootDragOver] = useState(false);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => props.onSelect(null)}
        onDragOver={(e) => {
          e.preventDefault();
          setRootDragOver(true);
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setRootDragOver(false);
          const noteId = e.dataTransfer.getData("application/x-note-id");
          if (noteId) props.onDropNote(null, noteId);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium",
          props.selectedFolderId === null ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted",
          rootDragOver && "ring-2 ring-primary",
        )}
      >
        <span>🗒️</span> Բոլոր նշումները
      </button>
      {roots.map((folder) => (
        <FolderRow key={folder.id} {...props} folder={folder} depth={0} />
      ))}
      <button
        type="button"
        onClick={() => props.onCreateSubfolder(null)}
        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-muted hover:bg-surface-muted hover:text-text"
      >
        <span>➕</span> Նոր թղթապանակ
      </button>
    </div>
  );
}
