import { useEffect, useState } from "react";
import * as chatApi from "../api/chat";

/** Total unread chat message count across all conversations, for a nav badge. */
export function useChatUnreadCount(pollMs = 20000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function load() {
      chatApi.fetchUnreadCount().then(setCount);
    }
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return count;
}
