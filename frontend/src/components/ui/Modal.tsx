import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useIsNativeApp } from "../../lib/platform";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Shared modal primitive — replaces the ConfirmModal pattern (no portal, no focus trap,
 * no Escape handling, no aria-modal) with Radix's unstyled Dialog for correct a11y behavior,
 * styled to match the app's existing surface/border/radius language.
 *
 * On the web it's a centred dialog. Inside the native shell it becomes a bottom sheet:
 * a box floating in the middle of a phone screen is a desktop convention, and it puts
 * the action buttons at the top of the screen where a thumb can't reach them. Radix
 * handles focus, Escape and scroll-locking identically either way, so this is purely
 * presentational — every existing call site gets the native treatment for free. */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
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
                  "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-2xl)] border-t px-5 pt-3",
                  "data-[state=open]:animate-[sheet-in_var(--motion-normal)_var(--ease-out)]",
                  "data-[state=closed]:animate-[sheet-out_var(--motion-fast)_var(--ease-out)]",
                ]
              : [
                  "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
                  "rounded-[var(--radius)] border p-6 shadow-xl",
                  "data-[state=open]:animate-[scale-in_var(--motion-normal)_var(--ease-out)]",
                  "data-[state=closed]:animate-[scale-out_var(--motion-fast)_var(--ease-out)]",
                ],
            className,
          )}
          // Clears the home indicator; harmless (0px) on the web branch.
          style={isNative ? { paddingBottom: "calc(var(--safe-bottom) + 1.25rem)" } : undefined}
        >
          {isNative && (
            <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-border" />
          )}
          <Dialog.Title className={cn("font-semibold text-text", isNative ? "text-[20px]" : "text-lg")}>
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className={cn("mt-1.5 text-text-muted", isNative ? "text-[15px]" : "text-sm")}>
              {description}
            </Dialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          {/* Stacked on native so each action is a full-width thumb target, and
           * reversed so the primary action sits lowest — nearest the thumb. */}
          {footer && <div className={cn("mt-6 flex gap-3", isNative && "flex-col-reverse")}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
