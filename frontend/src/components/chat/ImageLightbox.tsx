import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";

/*
  Full-bleed viewer for an image sent in chat.

  Three things changed.

  1. It was a bare `fixed inset-0` div. Escape was handled, but nothing else
     was: no role="dialog", no focus trap, and no focus restoration — so a
     keyboard user could Tab straight out of the viewer into the chat behind
     it, which is completely hidden under an 80%-black scrim. They would be
     driving controls they cannot see. It is built on Radix's Dialog
     primitives now (the same ones ui/Modal uses, so no new dependency),
     which supply all three. ui/Modal itself is not the right host: it is a
     max-width card with a heading, and this is a full-bleed image.

  2. The options menu held exactly one command. A menu that contains one item
     is a button wearing a costume — it costs a click, an outside-click
     listener, and a hand-rolled popup with no keyboard support, to do what a
     button does directly. "Պահպանել" is now just a button.

  3. Its trigger was a "⋮" text glyph rather than a lucide icon, and its only
     name was a `title` — which touch devices never display, on the platform
     where chat images are mostly opened. Both controls carry a real icon and
     a real Armenian `aria-label`.
*/
export function ImageLightbox({
  src,
  filename,
  onClose,
  onSave,
}: {
  src: string;
  filename: string;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-4)] focus:outline-none"
          onClick={onClose}
        >
          {/* The image's own filename is the only name this dialog has; it is
              read out on open and hidden from sight, where the picture is the
              point. */}
          <Dialog.Title className="sr-only">{filename}</Dialog.Title>

          <div
            className="absolute right-[var(--space-4)] top-[var(--space-4)] flex items-center gap-[var(--space-2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onSave}
              aria-label="Պահպանել նկարը"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <Download size={18} strokeWidth={1.75} aria-hidden />
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Փակել"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <img
            src={src}
            alt={filename}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-[var(--radius-md)] object-contain"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
