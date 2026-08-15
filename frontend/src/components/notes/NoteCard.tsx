import type { DocumentSummary } from "../../api/notes";
import { Dropdown } from "../ui/Dropdown";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
}

export function NoteCard({
  note,
  trashed,
  onOpen,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onMove,
  onDelete,
  onRestore,
  onPurge,
}: {
  note: DocumentSummary;
  trashed?: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPurge: () => void;
}) {
  return (
    <div
      draggable={!trashed}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-note-id", note.id);
      }}
      onClick={onOpen}
      className="group flex cursor-pointer flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span>{note.icon || "📄"}</span>
          <h3 className="truncate font-semibold text-text">{note.title || "(անանուն)"}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {note.is_pinned && <span title="Ամրակցված">📌</span>}
          {note.is_favorite && <span title="Ընտրյալ">⭐</span>}
          <Dropdown
            align="end"
            renderTrigger={(props) => (
              <button
                {...props}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-muted opacity-0 hover:bg-surface-muted hover:text-text group-hover:opacity-100"
              >
                ⋯
              </button>
            )}
            items={
              trashed
                ? [
                    { key: "restore", label: "Վերականգնել", onSelect: onRestore },
                    { key: "purge", label: "Ջնջել ընդմիշտ", tone: "danger", onSelect: onPurge },
                  ]
                : [
                    { key: "favorite", label: note.is_favorite ? "Հանել ընտրյալներից" : "Ավելացնել ընտրյալներում", onSelect: onToggleFavorite },
                    { key: "pin", label: note.is_pinned ? "Հանել ամրակցումը" : "Ամրակցել", onSelect: onTogglePin },
                    { key: "duplicate", label: "Կրկնօրինակել", onSelect: onDuplicate },
                    { key: "move", label: "Տեղափոխել...", onSelect: onMove },
                    { key: "delete", label: "Ջնջել", tone: "danger", onSelect: onDelete },
                  ]
            }
          />
        </div>
      </div>
      {note.snippet && <p className="mt-2 line-clamp-2 text-sm text-text-muted">{note.snippet}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {note.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
            #{tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-text-muted">{formatDate(note.updated_at)}</p>
    </div>
  );
}
