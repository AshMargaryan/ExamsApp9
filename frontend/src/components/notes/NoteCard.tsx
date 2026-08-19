import { MoreHorizontal, Pencil, Pin, Star } from "lucide-react";
import type { DocumentSummary } from "../../api/notes";
import { Dropdown } from "../ui/Dropdown";
import { cn } from "../../lib/cn";

/*
  One note in the library.

  The card used to put the note's icon, its title, a pin marker, a star
  marker and an overflow button all on one line, with the title as a
  single truncated row. In a three-column grid on a 1280px screen with the
  folder rail beside it, each card is about 200px wide — and Armenian note
  titles are long. Every title on the seeded library rendered as
  "Մոդուլով անհ…", "Քառակուսա…", "Շատ երկար վե…". The title is the only
  thing that identifies a note, so a library where no title is legible is
  a library you cannot navigate.

  So the title now gets the full width of the card and up to two lines,
  and the pin/favourite state moved down to the metadata row where it
  belongs — it is a property of the note, not a competitor to its name.
*/

const MAX_VISIBLE_TAGS = 3;

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
  const visibleTags = note.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = note.tags.length - visibleTags.length;

  return (
    <article
      draggable={!trashed}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-note-id", note.id);
      }}
      className={cn(
        "group relative flex min-w-0 flex-col rounded-[var(--radius)] border border-border bg-surface",
        "p-[var(--space-4)] shadow-[var(--shadow-xs)] transition-colors",
        "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        "hover:border-primary-line hover:shadow-[var(--shadow-sm)]",
        "focus-within:border-primary",
      )}
    >
      <div className="flex items-start justify-between gap-[var(--space-2)]">
        <h3 className="min-w-0 flex-1">
          {/*
            A real link-shaped button whose ::after covers the card, rather
            than an onClick on the card div. The old version made the whole
            card a click target with no keyboard equivalent and no accessible
            name — the note could not be opened from the keyboard at all.
          */}
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "line-clamp-2 text-left text-[length:var(--text-base)] font-semibold",
              "leading-[var(--leading-heading)] text-text",
              "after:absolute after:inset-0 after:rounded-[var(--radius)] after:content-['']",
            )}
          >
            {note.title || "(անանուն)"}
          </button>
        </h3>
        <Dropdown
          align="end"
          renderTrigger={(props) => (
            <button
              {...props}
              aria-label="Նշումի գործողություններ"
              // relative + z-10 so it sits above the title's card-wide ::after.
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                "text-text-muted transition-colors hover:bg-surface-muted hover:text-text",
                // Hidden-until-hover hides it from touch users entirely, so it
                // stays visible below the hover breakpoint.
                "opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100",
              )}
            >
              <MoreHorizontal size={16} strokeWidth={2} />
            </button>
          )}
          items={
            trashed
              ? [
                  { key: "restore", label: "Վերականգնել", onSelect: onRestore },
                  { key: "purge", label: "Ջնջել ընդմիշտ", tone: "danger" as const, onSelect: onPurge },
                ]
              : [
                  {
                    key: "favorite",
                    label: note.is_favorite ? "Հանել ընտրյալներից" : "Ավելացնել ընտրյալներում",
                    icon: <Star size={15} strokeWidth={1.75} />,
                    onSelect: onToggleFavorite,
                  },
                  {
                    key: "pin",
                    label: note.is_pinned ? "Հանել ամրակցումը" : "Ամրակցել",
                    icon: <Pin size={15} strokeWidth={1.75} />,
                    onSelect: onTogglePin,
                  },
                  { key: "duplicate", label: "Կրկնօրինակել", onSelect: onDuplicate },
                  { key: "move", label: "Տեղափոխել...", onSelect: onMove },
                  { key: "delete", label: "Ջնջել", tone: "danger" as const, onSelect: onDelete },
                ]
          }
        />
      </div>

      {note.snippet && (
        <p className="mt-[var(--space-2)] line-clamp-3 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
          {note.snippet}
        </p>
      )}

      {visibleTags.length > 0 && (
        <ul className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-2)]">
          {visibleTags.map((tag) => (
            <li
              key={tag}
              className="rounded-[var(--radius-full)] bg-surface-muted px-[var(--space-2)] py-[1px] text-[length:var(--text-xs)] text-text-muted"
            >
              #{tag}
            </li>
          ))}
          {hiddenTagCount > 0 && (
            <li className="text-[length:var(--text-xs)] text-text-muted">+{hiddenTagCount}</li>
          )}
        </ul>
      )}

      {/* State markers live down here with the date — they describe the note,
          they are not part of its name. Each carries a text label for screen
          readers, so pin/favourite is never icon-and-colour alone. */}
      <div className="mt-auto flex items-center gap-[var(--space-2)] pt-[var(--space-3)] text-[length:var(--text-xs)] text-text-muted">
        {note.kind === "canvas" && (
          <span className="flex items-center gap-1">
            <Pencil size={12} strokeWidth={2} aria-hidden="true" />
            <span>Նկար</span>
          </span>
        )}
        <span>{formatDate(note.updated_at)}</span>
        <span className="ml-auto flex items-center gap-[var(--space-2)]">
          {note.is_pinned && (
            <span className="flex items-center gap-1 text-primary">
              <Pin size={12} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Ամրակցված</span>
            </span>
          )}
          {note.is_favorite && (
            <span className="flex items-center gap-1 text-accent">
              <Star size={12} strokeWidth={2.25} aria-hidden="true" />
              <span className="sr-only">Ընտրյալ</span>
            </span>
          )}
        </span>
      </div>
    </article>
  );
}
