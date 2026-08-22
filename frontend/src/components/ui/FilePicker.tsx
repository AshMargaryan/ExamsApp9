import { useId, useState, type ReactNode } from "react";
import { Paperclip, TriangleAlert, UploadCloud, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatBytes } from "../../lib/formatBytes";

/*
  A file input that speaks Armenian, and that says no before the server does.

  Two problems, both only visible on the rendered page:

  1. `<input type="file">` draws its own button and its own "no file chosen"
     text from the *browser's* locale, never the page's. So a support form
     written entirely in Armenian ended with `Choose Files  No file chosen`
     in English — in the one form a student reaches because something has
     already gone wrong for them. No attribute changes it, so the native
     control has to stop being the visible control.

  2. The backend enforces a 20MB cap and a byte-sniffed extension allowlist
     (apps/helpcenter/validators.py), and the frontend stated neither. A
     student could write a paragraph, attach a 40MB screen recording, submit,
     and only then be told — with the answer arriving as a raw API error.
     Both rules are checked here, before the submit, next to the control.

  How the labelling works, because it is the part that is easy to get wrong:
  the real `<input>` stays in the DOM, in the tab order and in the
  accessibility tree (`sr-only`, not `hidden` — `hidden` would remove it from
  both), and the visible pill is a `<label htmlFor>` for it. A label is not
  itself a tab stop, so there is exactly one, and clicking the pill opens the
  picker natively with no click-forwarding ref. The field's own label is a
  `<span>` referenced by `aria-labelledby` rather than a second `<label>`,
  because two labels pointing at one input concatenate into one name
  ("Կցել նկար կամ ֆայլ Ընտրել ֆայլ"). The focus ring is painted on the pill
  via `peer-focus-visible`, since the thing actually holding focus is 1px
  wide.
*/

export function FilePicker({
  label,
  hint,
  multiple = false,
  accept,
  maxSizeMb,
  files,
  onChange,
  buttonLabel = "Ընտրել ֆայլ",
}: {
  label: string;
  /** Requirements or context. Announced with the field, not after it fails. */
  hint?: ReactNode;
  multiple?: boolean;
  /** Comma-separated extensions, e.g. `.png,.pdf`. Also used to reject a
   *  drag-and-drop, which the OS picker's own filter never sees. */
  accept?: string;
  maxSizeMb?: number;
  files: File[];
  onChange: (files: File[]) => void;
  buttonLabel?: string;
}) {
  const generatedId = useId();
  const id = `file-${generatedId}`;
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const [rejected, setRejected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const allowedExtensions = accept
    ?.split(",")
    .map((part) => part.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);

  function reject(file: File): string | null {
    if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
      return `«${file.name}» — ${formatBytes(file.size)}։ Սահմանաչափը ${maxSizeMb}ՄԲ է։`;
    }
    if (allowedExtensions?.length) {
      const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
      if (!allowedExtensions.includes(ext)) {
        return `«${file.name}» — «.${ext}» ֆայլեր չեն ընդունվում։`;
      }
    }
    return null;
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const accepted: File[] = [];
    let firstProblem: string | null = null;

    for (const file of Array.from(incoming)) {
      const problem = reject(file);
      if (problem) firstProblem = firstProblem ?? problem;
      else accepted.push(file);
    }

    setRejected(firstProblem);
    if (accepted.length === 0) return;
    onChange(multiple ? [...files, ...accepted] : accepted.slice(0, 1));
  }

  return (
    <div className="mb-[var(--space-4)]">
      <span id={labelId} className="mb-[var(--space-2)] block text-[length:var(--text-sm)] font-medium text-text">
        {label}
      </span>
      {hint && (
        <p id={hintId} className="mb-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted">
          {hint}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-2)]",
          "rounded-[var(--radius-md)] border border-dashed px-[var(--space-4)] py-[var(--space-3)]",
          "transition-colors duration-[var(--motion-fast)]",
          dragOver ? "border-primary bg-primary-bg" : rejected ? "border-incorrect" : "border-border",
        )}
      >
        <input
          id={id}
          type="file"
          multiple={multiple}
          accept={accept}
          aria-labelledby={labelId}
          aria-describedby={[hintId, rejected ? errorId : null].filter(Boolean).join(" ") || undefined}
          aria-invalid={rejected ? true : undefined}
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so choosing the same file twice still fires a change —
            // otherwise removing a file and re-picking it does nothing.
            e.target.value = "";
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-[var(--space-2)]",
            "rounded-[var(--radius-md)] border border-border px-[var(--space-3)] py-[var(--space-2)]",
            "text-[length:var(--text-sm)] font-medium text-text",
            "transition-colors duration-[var(--motion-fast)] hover:border-primary",
            "peer-focus-visible:outline-[length:var(--focus-ring-width)]",
            "peer-focus-visible:outline-offset-[length:var(--focus-ring-offset)]",
            "peer-focus-visible:outline-solid peer-focus-visible:outline-[color:var(--focus-ring-color)]",
          )}
        >
          <Paperclip size={15} strokeWidth={1.75} aria-hidden />
          {buttonLabel}
        </label>
        {/* Hidden below `sm`: a phone cannot drag a file anywhere, so the
            hint was pure noise — and at 375px it was noise that truncated to
            "Կամ քաշիր …", which reads as a bug rather than as an option. */}
        {files.length === 0 && (
          <span className="hidden min-w-0 flex-1 items-center gap-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted sm:flex">
            <UploadCloud size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
            <span className="truncate">Կամ քաշիր ֆայլը այստեղ</span>
          </span>
        )}
      </div>

      {rejected && (
        <p
          id={errorId}
          role="alert"
          className="mt-[var(--space-2)] flex items-start gap-[var(--space-2)] text-[length:var(--text-xs)] text-incorrect"
        >
          <TriangleAlert size={14} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
          <span>{rejected}</span>
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-[var(--space-2)] flex flex-col gap-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted"
            >
              <Paperclip size={12} strokeWidth={1.75} aria-hidden className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-text">{file.name}</span>
              <span className="shrink-0 tabular-nums">{formatBytes(file.size)}</span>
              <button
                type="button"
                aria-label={`Հեռացնել «${file.name}»`}
                onClick={() => {
                  setRejected(null);
                  onChange(files.filter((_, other) => other !== index));
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-incorrect-bg hover:text-incorrect"
              >
                <X size={12} strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
