import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { EducationalContext } from "../api/assistant";

export interface AssistantLaunchRequest {
  message: string;
  educationalContext: EducationalContext;
}

interface AssistantLaunchValue {
  request: AssistantLaunchRequest | null;
  askAboutQuestion: (request: AssistantLaunchRequest) => void;
  clearRequest: () => void;
  assistantSuppressed: boolean;
  setAssistantSuppressed: (suppressed: boolean) => void;
}

const AssistantLaunchContext = createContext<AssistantLaunchValue | null>(null);

/** Lets any page inside AppChrome open the floating AI assistant pre-seeded
 * with a question, instead of the student having to copy/paste it in.
 * Also lets a page (e.g. a mock-exam attempt the student chose to take
 * without AI help) suppress the floating widget entirely. */
export function AssistantLaunchProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AssistantLaunchRequest | null>(null);
  const [assistantSuppressed, setAssistantSuppressed] = useState(false);
  const clearRequest = useCallback(() => setRequest(null), []);
  const value = useMemo<AssistantLaunchValue>(
    () => ({
      request,
      askAboutQuestion: setRequest,
      clearRequest,
      assistantSuppressed,
      setAssistantSuppressed,
    }),
    [request, clearRequest, assistantSuppressed],
  );
  return <AssistantLaunchContext.Provider value={value}>{children}</AssistantLaunchContext.Provider>;
}

export function useAssistantLaunch() {
  const ctx = useContext(AssistantLaunchContext);
  if (!ctx) throw new Error("useAssistantLaunch must be used within AssistantLaunchProvider");
  return ctx;
}
