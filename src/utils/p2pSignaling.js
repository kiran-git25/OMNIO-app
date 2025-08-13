import Peer from 'simple-peer';
import { E2EEEncryption } from './e2ee';

/**
 * Initialize a P2P connection with end-to-end encryption support
 * @param {string} roomId - Unique room identifier
 * @param {function} onData - Callback for received data
 * @param {MediaStream} stream - Local media stream to share (optional)
 * @param {function} onStream - Callback for received remote stream
 * @param {string} encryptionKey - Optional room encryption key
 * @param {boolean} isElectron - Flag to indicate if running in Electron
 * @returns {Object} Peer connection and utilities
 */
export async function initP2P(roomId, onData, stream, onStream, encryptionKey = null, isElectron = false) {
  // Determine signaling server based on environment
  const serverUrl = isElectron ? 
    'ws://localhost:3001' : // Local development or packaged app
    'wss://openrelay.metered.ca:443'; // Fallback to public relay for web
  
  // Generate a room-specific encryption key if not provided
  const roomKey = encryptionKey || E2EEEncryption.generateRoomKey();
  
  // Initialize WebSocket for signaling
  let ws;
  try {
    ws = new WebSocket(serverUrl);
  } catch (error) {
    console.error('Failed to connect to signaling server:', error);
    // Fallback to public relay if local connection fails
    if (isElectron && serverUrl !== 'wss://openrelay.metered.ca:443') {
      ws = new WebSocket('wss://openrelay.metered.ca:443');
    } else {
      throw error;
    }
  }

  // Create peer connection
  const peer = new Peer({ 
    initiator: location.hash === '#host', 
    trickle: false, 
    stream,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    }
  });

  // Connect to signaling server and join room
  ws.onopen = () => {
    // Use encrypted room ID for enhanced privacy
    const secureRoomId = E2EEEncryption.hash(`${roomId}-${roomKey.substring(0, 8)}`);
    ws.send(JSON.stringify({ type: 'join', room: secureRoomId }));
  };

  // Handle incoming signaling messages
  ws.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data);
      if (data.type === 'signal') {
        peer.signal(data.signal);
      }
    } catch (error) {
      console.error('Failed to process signaling message:', error);
    }
  };

  // Send local signaling data
  peer.on('signal', (signal) => {
    if (ws.readyState === WebSocket.OPEN) {
      const secureRoomId = E2EEEncryption.hash(`${roomId}-${roomKey.substring(0, 8)}`);
      ws.send(JSON.stringify({ type: 'signal', room: secureRoomId, signal }));
    }
  });

  // Handle data channel messages with encryption
  if (onData) {
    peer.on('data', (encryptedData) => {
      try {
        // Try to decrypt the data
        const dataString = new TextDecoder().decode(encryptedData);
        const decrypted = E2EEEncryption.decrypt(dataString, roomKey);
        if (decrypted) {
          onData(decrypted);
        }
      } catch (error) {
        console.error('Failed to decrypt peer data:', error);
        // Fall back to raw data if decryption fails
        onData(encryptedData);
      }
    });
  }

  // Handle incoming media streams
  if (onStream) {
    peer.on('stream', (remoteStream) => {
      onStream(remoteStream);
    });
  }

  // Create wrapper with additional utilities
  return {
    peer,
    roomKey,
    // Method to send encrypted data
    sendData: (data) => {
      if (peer.connected) {
        const encrypted = E2EEEncryption.encrypt(data, roomKey);
        peer.send(encrypted);
        return true;
      }
      return false;
    },
    // Method to close connections
    close: () => {
      if (peer) peer.destroy();
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    },
    // Method to check if running in Electron
    isElectron
  };
}
