import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

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
 * styled to match the app's existing surface/border/radius language. */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40",
            "data-[state=open]:animate-[fade-in_var(--motion-fast)_var(--ease-out)]",
            "data-[state=closed]:animate-[fade-out_var(--motion-fast)_var(--ease-out)]",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl focus:outline-none",
            "data-[state=open]:animate-[scale-in_var(--motion-normal)_var(--ease-out)]",
            "data-[state=closed]:animate-[scale-out_var(--motion-fast)_var(--ease-out)]",
            className,
          )}
        >
          <Dialog.Title className="text-lg font-semibold text-text">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1.5 text-sm text-text-muted">{description}</Dialog.Description>}
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex gap-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
