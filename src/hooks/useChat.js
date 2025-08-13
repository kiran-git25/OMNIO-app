import { useEffect, useState } from "react";
import { initializeDatabase, getChatCollection } from "../db/signalDB";

export function useChat(roomId) {
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = null;
    let isMounted = true;

    (async () => {
      try {
        await initializeDatabase();
        if (!isMounted) return;

        const collection = getChatCollection();
        if (!collection) return;

        unsub = collection.find({ roomId }).onSnapshot(setMessages);
        setReady(true);
      } catch (err) {
        console.error("useChat DB init error:", err);
      }
    })();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [roomId]);

  const sendMessage = (text, sender) => {
    if (!ready) return;
    const collection = getChatCollection();
    collection.insert({
      roomId,
      sender,
      text,
      createdAt: Date.now()
    });
  };

  return { messages, sendMessage, ready };
}
