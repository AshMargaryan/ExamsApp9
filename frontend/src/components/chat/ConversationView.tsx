import { useEffect, useRef, useState } from "react";
import type { Conversation, Message } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useConversationMessages } from "../../hooks/useConversationMessages";
import { ForwardModal } from "./ForwardModal";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";

const SCROLL_TOP_THRESHOLD = 80;
const NEAR_BOTTOM_THRESHOLD = 150;
const HIGHLIGHT_DURATION_MS = 1500;

const TYPING_EXPIRY_MS = 3000;

export function ConversationView({ conversation }: { conversation: Conversation }) {
  const { user } = useAuth();
  const {
    messages, hasMore, loadingInitial, loadingOlder, loadOlder, sendText, react,
    editText, deleteForEveryone, hideForMe, sendTyping, typingEvent, readEvent, askAI, togglePin,
  } = useConversationMessages(conversation.id);

  const myRole = conversation.participants.find((p) => p.user.id === user?.id)?.role;
  const canPin = conversation.type === "group" && (myRole === "owner" || myRole === "admin");

  const scrollRef = useRef<HTMLDivElement>(null);
  // Set right before loadOlder() fires, so the post-render effect below can
  // restore scroll position instead of the viewport jumping as older
  // messages get prepended above what's currently visible.
  const prevScrollHeightRef = useRef<number | null>(null);
  // Whether the user is currently scrolled near the bottom — read messages
  // shouldn't yank them down if they're reading older history, but a fresh
  // arrival should still auto-follow when they're already at the bottom.
  const nearBottomRef = useRef(true);
  const messageElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [typingUser, setTypingUser] = useState<{ id: number; name: string } | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Seeded from the conversation's participant rows (their read cursor as
  // of the last conversation-list fetch), then advanced live by "read" WS
  // events — see readEvent effect below. Reset only on conversation
  // switch, not on every parent re-render, so a live update doesn't get
  // clobbered by a stale re-seed.
  const [readState, setReadState] = useState<Record<number, number>>({});

  useEffect(() => {
    nearBottomRef.current = true;
    setReplyingTo(null);
    const seed: Record<number, number> = {};
    for (const p of conversation.participants) {
      if (p.last_read_message_id != null) seed[p.user.id] = p.last_read_message_id;
    }
    setReadState(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (!typingEvent || typingEvent.user_id === user?.id) return;
    setTypingUser({ id: typingEvent.user_id, name: typingEvent.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingUser(null), TYPING_EXPIRY_MS);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [typingEvent, user?.id]);

  useEffect(() => {
    if (!readEvent || readEvent.conversation_id !== conversation.id) return;
    setReadState((prev) => ({
      ...prev,
      [readEvent.user_id]: Math.max(prev[readEvent.user_id] ?? 0, readEvent.last_read_message_id),
    }));
  }, [readEvent, conversation.id]);

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

  // Only scrolls to a message that's already loaded in this conversation's
  // current window — older messages paginated out of `messages` aren't
  // fetched on demand here (a "keep loading older until found" fallback is
  // a reasonable follow-up, but not needed for the common case of replying
  // to something still on screen or nearby).
  function jumpToMessage(messageId: number) {
    const el = messageElsRef.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedId(messageId);
    setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), HIGHLIGHT_DURATION_MS);
  }

  async function handleSend(text: string, attachmentIds: number[]) {
    setError(null);
    try {
      nearBottomRef.current = true;
      await sendText(text, attachmentIds, replyingTo?.id ?? null);
      setReplyingTo(null);
    } catch {
      setError("Հաղորդագրությունն ուղարկելիս սխալ տեղի ունեցավ։");
    }
  }

  // Read-receipt is shown on just the newest own message, not every
  // bubble — matches spec's "subtle" guidance rather than a checkmark row
  // on every line.
  const lastOwnMessage = [...messages].reverse().find((m) => m.sender?.id === user?.id && !m.deleted_at);
  const otherParticipantIds = conversation.participants
    .filter((p) => p.user.id !== user?.id)
    .map((p) => p.user.id);
  const seenByOthers = lastOwnMessage
    ? otherParticipantIds.some((id) => (readState[id] ?? 0) >= lastOwnMessage.id)
    : false;

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
          return (
            <MessageBubble
              key={m.id}
              message={m}
              own={own}
              showSender={showSender}
              highlighted={highlightedId === m.id}
              registerRef={(el) => {
                if (el) messageElsRef.current.set(m.id, el);
                else messageElsRef.current.delete(m.id);
              }}
              onReply={() => setReplyingTo(m)}
              onForward={() => setForwardingMessage(m)}
              onJumpToMessage={jumpToMessage}
              onReact={(emoji) => react(m.id, emoji)}
              onEdit={(text) => editText(m.id, text)}
              onDeleteForEveryone={() => deleteForEveryone(m.id)}
              onDeleteForMe={() => hideForMe(m.id)}
              onAskAI={() => askAI(m.id)}
              canPin={canPin}
              onTogglePin={() => togglePin(m.id, !m.pinned_at)}
              receipt={own && lastOwnMessage?.id === m.id ? (seenByOthers ? "read" : "sent") : undefined}
            />
          );
        })}
      </div>

      {typingUser && (
        <p className="px-4 pb-1 text-xs italic text-text-muted">{typingUser.name}-ը գրում է...</p>
      )}
      {error && <p className="px-4 pb-1 text-sm text-incorrect">{error}</p>}
      <div className="border-t border-border p-3">
        <MessageInput
          conversationId={conversation.id}
          onSend={handleSend}
          onTyping={sendTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {forwardingMessage && (
        <ForwardModal message={forwardingMessage} onClose={() => setForwardingMessage(null)} />
      )}
    </>
  );
}
