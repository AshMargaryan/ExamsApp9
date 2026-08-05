import { useState, type KeyboardEvent } from "react";

/**
 * Text-only for now — file/image upload and an emoji picker are Phase 10.
 * Kept as its own component already so that phase only has to extend this
 * file, not restructure ChatPage around it.
 */
export function MessageInput({
  disabled, onSend,
}: {
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");

  function handleSend() {
    const content = text.trim();
    if (!content || disabled) return;
    onSend(content);
    setText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Գրեք հաղորդագրություն..."
        rows={1}
        className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="shrink-0 rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        Ուղարկել
      </button>
    </div>
  );
}
