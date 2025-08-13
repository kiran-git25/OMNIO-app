import { useEffect, useRef, useState } from "react";
import { initializeDatabase, getCallCollection } from "../db/signalDB";

export function useCall(roomId) {
  const pcRef = useRef(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = null;
    let isMounted = true;

    (async () => {
      try {
        await initializeDatabase();
        if (!isMounted) return;

        const collection = getCallCollection();
        if (!collection) return;

        pcRef.current = new RTCPeerConnection();

        unsub = collection.find({ roomId }).onSnapshot(async (offers) => {
          for (const offer of offers) {
            if (offer.type === "offer") {
              await pcRef.current.setRemoteDescription(offer.sdp);
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              collection.insert({ roomId, type: "answer", sdp: answer });
            }
          }
        });

        setReady(true);
      } catch (err) {
        console.error("useCall DB init error:", err);
      }
    })();

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [roomId]);

  const startCall = async (stream) => {
    if (!ready) return;
    const collection = getCallCollection();

    stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    collection.insert({ roomId, type: "offer", sdp: offer });
  };

  return { remoteStream, startCall, ready };
}
