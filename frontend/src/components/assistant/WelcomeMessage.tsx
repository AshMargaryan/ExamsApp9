import type { EducationalContext } from "../../api/assistant";
import { AssistantSuggestions, STARTER_ACTIONS } from "./AssistantSuggestions";
import { MessageInput } from "./MessageInput";

export function WelcomeMessage({
  username,
  conversationId,
  disabled,
  onSend,
}: {
  username: string;
  /** Omit to show only the greeting (e.g. the floating widget, which
   * renders its own separate docked composer below this). */
  conversationId?: number;
  disabled?: boolean;
  onSend?: (content: string, attachmentIds: number[], educationalContext?: EducationalContext) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[var(--space-6)] px-[var(--space-4)] text-center">
      <div className="flex flex-col gap-[var(--space-1)]">
        <p className="font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold text-text">
          Ողջու՛յն, {username}
        </p>
        <p className="text-text-muted">Ինչի՞ մասին խոսենք այսօր։</p>
      </div>
      {conversationId !== undefined && onSend && (
        <>
          <MessageInput
            conversationId={conversationId}
            disabled={disabled}
            variant="hero"
            onSend={onSend}
          />
          {/* An empty composer is the hardest possible starting point for a
              student who is stuck and does not yet know how to ask. */}
          <AssistantSuggestions
            actions={STARTER_ACTIONS}
            disabled={disabled}
            onPick={(prompt) => onSend(prompt, [])}
            className="items-center"
          />
        </>
      )}
    </div>
  );
}
