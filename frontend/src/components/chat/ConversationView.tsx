import { useEffect, useRef, useState } from "react";
import type { Conversation } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useConversationMessages } from "../../hooks/useConversationMessages";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

const SCROLL_TOP_THRESHOLD = 80;
const NEAR_BOTTOM_THRESHOLD = 150;

export function ConversationView({ conversation }: { conversation: Conversation }) {
  const { user } = useAuth();
  const { messages, hasMore, loadingInitial, loadingOlder, loadOlder, sendText } =
    useConversationMessages(conversation.id);

  const scrollRef = useRef<HTMLDivElement>(null);
  // Set right before loadOlder() fires, so the post-render effect below can
  // restore scroll position instead of the viewport jumping as older
  // messages get prepended above what's currently visible.
  const prevScrollHeightRef = useRef<number | null>(null);
  // Whether the user is currently scrolled near the bottom — read messages
  // shouldn't yank them down if they're reading older history, but a fresh
  // arrival should still auto-follow when they're already at the bottom.
  const nearBottomRef = useRef(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nearBottomRef.current = true;
  }, [conversation.id]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
    if (el.scrollTop < SCROLL_TOP_THRESHOLD && hasMore && !loadingOlder) {
      prevScrollHeightRef.current = el.scrollHeight;
      loadOlder();
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevScrollHeightRef.current !== null) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
      return;
    }
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function handleSend(text: string) {
    setError(null);
    try {
      nearBottomRef.current = true;
      await sendText(text);
    } catch {
      setError("Հաղորդագրությունն ուղարկելիս սխալ տեղի ունեցավ։");
    }
  }

  return (
    <>
      <div ref={scrollRef} onScroll={handleScroll} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {loadingInitial && <p className="text-center text-text-muted">Բեռնվում է...</p>}
        {loadingOlder && <p className="text-center text-xs text-text-muted">Բեռնվում են հները...</p>}
        {!loadingInitial && messages.length === 0 && (
          <p className="text-center text-text-muted">Հաղորդագրություններ դեռ չկան։ Գրեք առաջինը։</p>
        )}
        {messages.map((m, i) => {
          const own = m.sender?.id === user?.id;
          const prev = messages[i - 1];
          const showSender = conversation.type === "group" && (!prev || prev.sender?.id !== m.sender?.id);
          return <MessageBubble key={m.id} message={m} own={own} showSender={showSender} />;
        })}
      </div>

      {error && <p className="px-4 pb-1 text-sm text-incorrect">{error}</p>}
      <div className="border-t border-border p-3">
        <MessageInput onSend={handleSend} />
      </div>
    </>
  );
}
