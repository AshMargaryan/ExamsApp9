import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { isNativeApp } from "../lib/platform";

type ToastKind = "success" | "error";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const showSuccess = useCallback((message: string) => push("success", message), [push]);
  const showError = useCallback((message: string) => push("error", message), [push]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4"
        // In the app the bottom edge belongs to the tab bar, so toasts sit
        // above it rather than on top of the navigation.
        style={{
          bottom: isNativeApp()
            ? "calc(var(--safe-bottom) + var(--mobile-tabbar-h) + 0.75rem)"
            : "1rem",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-[var(--radius)] border px-4 py-3 text-sm font-medium shadow-xl transition-all ${
              t.kind === "success"
                ? "border-correct bg-correct-bg text-correct"
                : "border-incorrect bg-incorrect-bg text-incorrect"
            }`}
            onClick={() => dismiss(t.id)}
          >
            {t.kind === "success" ? "✅ " : "⚠️ "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/** Best-effort Axios error → user-facing Armenian message, matching the
 * extraction pattern already duplicated in RegisterPage/ProfilePage. */
export function extractErrorMessage(err: unknown, fallback = "Գործողությունը ձախողվեց։"): string {
  const anyErr = err as { response?: { data?: Record<string, unknown> } };
  const data = anyErr?.response?.data;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}
