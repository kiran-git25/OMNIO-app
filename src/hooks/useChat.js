import { useEffect, useState } from "react";
import { getChatCollection } from "../db/signalDB";

export function useChat(roomId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const chatCollection = getChatCollection();
    const unsub = chatCollection.find({ roomId }).onSnapshot(setMessages);
    return () => unsub();
  }, [roomId]);

  const sendMessage = (text, sender) => {
    getChatCollection().insert({
      roomId,
      sender,
      text,
      createdAt: Date.now()
    });
  };

  return { messages, sendMessage };
}
