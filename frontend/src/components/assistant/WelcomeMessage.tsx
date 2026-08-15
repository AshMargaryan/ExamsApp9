import type { EducationalContext } from "../../api/assistant";
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-xl font-medium text-text">Ողջու՛յն, {username} 👋</p>
        <p className="text-text-muted">Ինչի՞ մասին խոսենք այսօր։</p>
      </div>
      {conversationId !== undefined && onSend && (
        <MessageInput
          conversationId={conversationId}
          disabled={disabled}
          variant="hero"
          onSend={onSend}
        />
      )}
    </div>
  );
}
