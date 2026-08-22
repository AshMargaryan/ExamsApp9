import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  MoreHorizontal,
  NotebookPen,
  Pin,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import type { Folder } from "../../api/notes";
import { Dropdown } from "../ui/Dropdown";
import { cn } from "../../lib/cn";

/*
  The notes navigation.

  It used to be half a navigation. The page carried a `SegmentedControl`
  with "Բոլոր նշումները / Ընտրյալներ / Ամրակցված / Աղբարկղ" *and* this tree,
  whose first row was also "Բոլոր նշումները" — two controls, seventy pixels
  apart, one of which was a duplicate of a row in the other, and only one of
  which showed which folder you were in. Choosing where to look therefore
  meant reading two different widgets and knowing which one won.

  Now there is one: the special views sit above the folders in the same
  rail, because they are peers — each of them answers "which notes am I
  looking at". That also frees the row the tabs used to occupy for search,
  which belongs next to the list it filters.
*/

export type NotesView = "notes" | "favorites" | "pinned" | "trash";

const VIEW_ROWS: { value: Exclude<NotesView, "notes">; label: string; Icon: typeof Star }[] = [
  { value: "favorites", label: "Ընտրյալներ", Icon: Star },
  { value: "pinned", label: "Ամրակցված", Icon: Pin },
  { value: "trash", label: "Աղբարկղ", Icon: Trash2 },
];

interface FolderTreeProps {
  folders: Folder[];
  view: NotesView;
  selectedFolderId: string | null;
  /** Count badges per view, omitted while unknown. */
  counts?: Partial<Record<NotesView, number>>;
  onSelectView: (view: NotesView) => void;
  onSelect: (folderId: string | null) => void;
  onCreateSubfolder: (parentId: string | null) => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  onDropNote: (folderId: string | null, noteId: string) => void;
}

function childrenOf(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((f) => f.parent === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

/** One row in the rail. Shared by the views and the folders so selection,
 *  height and hit area cannot drift between the two halves. */
function RailRow({
  active,
  icon,
  label,
  badge,
  indent = 0,
  dragOver,
  onClick,
  trailing,
  dragProps,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: React.ReactNode;
  badge?: number;
  indent?: number;
  dragOver?: boolean;
  onClick: () => void;
  trailing?: React.ReactNode;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      {...dragProps}
      className={cn(
        "group/row flex items-center gap-[var(--space-1)] rounded-[var(--radius-md)]",
        dragOver && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        style={{ paddingLeft: `${indent * 14 + 10}px` }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-[var(--space-2)] rounded-[var(--radius-md)] py-[var(--space-2)] pr-[var(--space-2)]",
          "text-left text-[length:var(--text-sm)] transition-colors",
          "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
          active
            ? "bg-primary-bg font-semibold text-primary"
            : "font-medium text-text hover:bg-surface-muted",
        )}
      >
        <span className={cn("shrink-0", active ? "text-primary" : "text-text-muted")}>{icon}</span>
        {/* A long Armenian folder name truncates in a 232px rail; the title
            attribute is what lets the student read the rest of it. */}
        <span className="min-w-0 flex-1 truncate" title={typeof label === "string" ? label : undefined}>
          {label}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className="shrink-0 tabular-nums text-[length:var(--text-xs)] text-text-muted">{badge}</span>
        )}
      </button>
      {trailing}
    </div>
  );
}

function FolderRow({
  folder,
  depth,
  folders,
  view,
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
  const active = view === "notes" && selectedFolderId === folder.id;

  return (
    <li>
      <RailRow
        active={active}
        indent={depth}
        dragOver={dragOver}
        onClick={() => onSelect(folder.id)}
        icon={
          children.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              aria-label={expanded ? "Ծալել" : "Բացել"}
              aria-expanded={expanded}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }
              }}
              className="flex h-4 w-4 items-center justify-center rounded-[var(--radius-xs)]"
            >
              {expanded ? (
                <ChevronDown size={14} strokeWidth={2} />
              ) : (
                <ChevronRight size={14} strokeWidth={2} />
              )}
            </span>
          ) : (
            <FolderIcon size={15} strokeWidth={1.75} />
          )
        }
        label={folder.name}
        dragProps={{
          onDragOver: (e) => {
            e.preventDefault();
            setDragOver(true);
          },
          onDragLeave: () => setDragOver(false),
          onDrop: (e) => {
            e.preventDefault();
            setDragOver(false);
            const noteId = e.dataTransfer.getData("application/x-note-id");
            if (noteId) onDropNote(folder.id, noteId);
          },
        }}
        trailing={
          <Dropdown
            align="end"
            renderTrigger={(props) => (
              <button
                {...props}
                aria-label={`«${folder.name}» թղթապանակի գործողություններ`}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                  "text-text-muted hover:bg-surface hover:text-text",
                  "opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus-visible:opacity-100",
                )}
              >
                <MoreHorizontal size={15} strokeWidth={2} />
              </button>
            )}
            items={[
              { key: "new", label: "Նոր ենթաթղթապանակ", onSelect: () => onCreateSubfolder(folder.id) },
              { key: "rename", label: "Վերանվանել", onSelect: () => onRename(folder) },
              { key: "delete", label: "Ջնջել", tone: "danger", onSelect: () => onDelete(folder) },
            ]}
          />
        }
      />
      {expanded && children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FolderRow
              key={child.id}
              {...{
                folders,
                view,
                selectedFolderId,
                onSelectView: () => {},
                onSelect,
                onCreateSubfolder,
                onRename,
                onDelete,
                onDropNote,
              }}
              folder={child}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree(props: FolderTreeProps) {
  const roots = childrenOf(props.folders, null);
  const [rootDragOver, setRootDragOver] = useState(false);

  return (
    <nav aria-label="Նշումների նավիգացիա" className="flex flex-col gap-[var(--space-4)]">
      <ul className="flex flex-col gap-[1px]">
        <li>
          <RailRow
            active={props.view === "notes" && props.selectedFolderId === null}
            icon={<NotebookPen size={15} strokeWidth={1.75} />}
            label="Բոլոր նշումները"
            badge={props.counts?.notes}
            dragOver={rootDragOver}
            onClick={() => {
              props.onSelectView("notes");
              props.onSelect(null);
            }}
            dragProps={{
              onDragOver: (e) => {
                e.preventDefault();
                setRootDragOver(true);
              },
              onDragLeave: () => setRootDragOver(false),
              onDrop: (e) => {
                e.preventDefault();
                setRootDragOver(false);
                const noteId = e.dataTransfer.getData("application/x-note-id");
                if (noteId) props.onDropNote(null, noteId);
              },
            }}
          />
        </li>
        {VIEW_ROWS.map(({ value, label, Icon }) => (
          <li key={value}>
            <RailRow
              active={props.view === value}
              icon={<Icon size={15} strokeWidth={1.75} />}
              label={label}
              badge={props.counts?.[value]}
              onClick={() => props.onSelectView(value)}
            />
          </li>
        ))}
      </ul>

      {roots.length > 0 && (
        <div>
          <p className="mb-[var(--space-1)] px-[var(--space-2)] text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-text-muted">
            Թղթապանակներ
          </p>
          <ul className="flex flex-col gap-[1px]">
            {roots.map((folder) => (
              <FolderRow key={folder.id} {...props} folder={folder} depth={0} />
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => props.onCreateSubfolder(null)}
        className={cn(
          "flex w-full items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)]",
          "text-left text-[length:var(--text-sm)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text",
        )}
      >
        <Plus size={15} strokeWidth={2} /> Նոր թղթապանակ
      </button>
    </nav>
  );
}


/*
  The same navigation, compacted for a phone.

  At 375px the rail rendered ~750px tall before a single note appeared:
  four view rows, a folder tree, and a "new folder" row, all above the
  content the student came for. A phone should show notes first. This is
  the same set of destinations as one horizontally scrolling row of chips,
  which costs ~44px instead of ~750px and keeps every target thumb-sized.

  Folder depth is flattened here deliberately — a chip strip cannot show
  hierarchy, and on a phone the folder's own name is what identifies it.
  Creating and renaming folders stays on the rail, at `lg` and up; it is
  organisation work, not reading work.
*/
export function NotesFilterStrip({
  folders,
  view,
  selectedFolderId,
  counts,
  onSelectView,
  onSelect,
  className,
}: {
  folders: Folder[];
  view: NotesView;
  selectedFolderId: string | null;
  counts?: Partial<Record<NotesView, number>>;
  onSelectView: (view: NotesView) => void;
  onSelect: (folderId: string | null) => void;
  className?: string;
}) {
  const chip = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border",
      "px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] whitespace-nowrap",
      "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
      active
        ? "border-primary bg-primary-bg font-semibold text-primary"
        : "border-border font-medium text-text-muted hover:text-text",
    );

  return (
    <nav aria-label="Նշումների նավիգացիա" className={cn("-mx-4 overflow-x-auto px-4 no-scrollbar", className)}>
      <ul className="flex w-max items-center gap-[var(--space-2)]">
        <li>
          <button
            type="button"
            aria-current={view === "notes" && selectedFolderId === null ? "true" : undefined}
            onClick={() => {
              onSelectView("notes");
              onSelect(null);
            }}
            className={chip(view === "notes" && selectedFolderId === null)}
          >
            <NotebookPen size={14} strokeWidth={1.75} /> Բոլորը
            {counts?.notes !== undefined && counts.notes > 0 && (
              <span className="tabular-nums opacity-70">{counts.notes}</span>
            )}
          </button>
        </li>
        {VIEW_ROWS.map(({ value, label, Icon }) => (
          <li key={value}>
            <button
              type="button"
              aria-current={view === value ? "true" : undefined}
              onClick={() => onSelectView(value)}
              className={chip(view === value)}
            >
              <Icon size={14} strokeWidth={1.75} /> {label}
            </button>
          </li>
        ))}
        {folders.length > 0 && <li aria-hidden="true" className="h-5 w-px shrink-0 bg-border" />}
        {[...folders]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                aria-current={view === "notes" && selectedFolderId === folder.id ? "true" : undefined}
                onClick={() => {
                  onSelectView("notes");
                  onSelect(folder.id);
                }}
                className={chip(view === "notes" && selectedFolderId === folder.id)}
              >
                <FolderIcon size={14} strokeWidth={1.75} /> {folder.name}
              </button>
            </li>
          ))}
      </ul>
    </nav>
  );
}
