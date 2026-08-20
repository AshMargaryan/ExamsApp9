import { useRef, useState, type DragEvent } from "react";
import { resizeImageFile } from "../../lib/imageResize";
import { Camera, X } from "lucide-react";

interface Props {
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onChange: (file: File | null) => void;
  onRemoveExisting?: () => void;
}

export function ImageDropzone({ label, file, existingUrl, onChange, onRemoveExisting }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrl = file ? URL.createObjectURL(file) : existingUrl || null;

  async function handleFile(raw: File) {
    setBusy(true);
    try {
      onChange(await resizeImageFile(raw));
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    if (existingUrl && onRemoveExisting) onRemoveExisting();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-text">{label}</p>
      <div
        onClick={() => !previewUrl && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex h-36 w-full items-center justify-center overflow-hidden rounded-[var(--radius)] border-2 border-dashed transition-colors ${
          previewUrl ? "border-border" : "cursor-pointer border-border hover:border-primary"
        } ${dragOver ? "border-primary bg-surface-muted" : "bg-surface"}`}
      >
        {busy ? (
          <span className="text-sm text-text-muted">Մշակվում է...</span>
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt={label} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Հեռացնել նկարը"
              title="Հեռացնել"
              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X size={15} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white transition-colors hover:bg-black/80"
            >
              Փոխարինել
            </button>
          </>
        ) : (
          <div className="px-4 text-center text-sm text-text-muted">
            <p className="flex items-center justify-center gap-[var(--space-2)]">
              <Camera size={16} strokeWidth={1.75} aria-hidden /> Քաշեք նկարը այստեղ կամ սեղմեք
            </p>
            <p className="mt-1 text-xs">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) handleFile(picked);
        }}
      />
    </div>
  );
}
