import { useEffect } from "react";

/*
  The iOS action sheet a long-press on a message opens. Deliberately not the
  shared Modal: an action sheet is a list of verbs with no title and no body,
  and it has its own convention — a separated Cancel button below the group.
*/

export interface MessageAction {
  key: string;
  label: string;
  destructive?: boolean;
  run: () => void;
}

export function MessageActionSheet({
  actions,
  onClose,
}: {
  actions: MessageAction[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-label="Գործողություններ"
        className="fixed inset-x-3 bottom-0 z-[95] flex flex-col gap-2"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 0.75rem)" }}
      >
        <div className="overflow-hidden rounded-2xl bg-surface">
          {actions.map((action, i) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                action.run();
                onClose();
              }}
              className={`flex h-14 w-full items-center justify-center text-[17px] active:bg-surface-muted ${
                i > 0 ? "border-t border-border" : ""
              } ${action.destructive ? "font-medium text-incorrect" : "text-text"}`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-14 w-full rounded-2xl bg-surface text-[17px] font-semibold text-text active:bg-surface-muted"
        >
          Փակել
        </button>
      </div>
    </>
  );
}
