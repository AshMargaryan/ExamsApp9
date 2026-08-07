import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀", "😂", "😍", "😊", "😉", "😎", "🤔", "😢", "😭", "😡",
  "👍", "👎", "👏", "🙏", "🤝", "💪", "✌️", "👌", "🤞", "👋",
  "❤️", "🔥", "🎉", "✅", "❌", "⭐", "💡", "📌", "🎯", "🚀",
];

export function EmojiPicker({
  onSelect, onClose, align = "left",
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full z-10 mb-2 grid w-64 grid-cols-6 gap-1 rounded-md border border-border bg-surface p-2 shadow-lg ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-md p-1.5 text-xl hover:bg-surface-muted"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
