import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";
import { useIsNativeApp } from "../../lib/platform";
import { Button } from "./Button";

/*
  Confirmation for destructive actions that remove user-authored data.

  Built on Radix (focus trap, Escape, scroll lock, aria-modal) rather than the
  older components/ConfirmModal.tsx, which has none of those. Follows ui/Modal's
  web-dialog / native-bottom-sheet split so a phone gets the buttons within
  thumb reach.

  Deliberately NOT for harmless or trivially reversible actions — a confirm on
  everything trains people to dismiss confirms. The `description` exists so the
  dialog can say what is *not* lost ("your mastery data stays"), which is
  usually what the person is actually worried about.
*/

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Ջնջել",
  cancelLabel = "Չեղարկել",
  tone = "danger",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
}) {
  const isNative = useIsNativeApp();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40",
            isNative && "bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_var(--motion-fast)_var(--ease-out)]",
            "data-[state=closed]:animate-[fade-out_var(--motion-fast)_var(--ease-out)]",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed z-50 border-border bg-surface focus:outline-none",
            isNative
              ? [
                  "inset-x-0 bottom-0 rounded-t-[var(--radius-2xl)] border-t px-5 pt-3",
                  "data-[state=open]:animate-[sheet-in_var(--motion-normal)_var(--ease-out)]",
                  "data-[state=closed]:animate-[sheet-out_var(--motion-fast)_var(--ease-out)]",
                ]
              : [
                  "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
                  "rounded-[var(--radius)] border p-6 shadow-xl",
                  "data-[state=open]:animate-[scale-in_var(--motion-normal)_var(--ease-out)]",
                  "data-[state=closed]:animate-[scale-out_var(--motion-fast)_var(--ease-out)]",
                ],
          )}
          style={isNative ? { paddingBottom: "calc(var(--safe-bottom) + 1.25rem)" } : undefined}
        >
          {isNative && <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border" />}
          <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-text-muted">
              {description}
            </Dialog.Description>
          ) : (
            // Radix warns when a Content has no Description; an explicit empty
            // one keeps the console clean without inventing copy.
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-2.5">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              size="sm"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "..." : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
