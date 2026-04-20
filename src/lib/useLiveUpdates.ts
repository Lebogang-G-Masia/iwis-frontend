"use client";

import { useEffect, useRef, useState } from "react";

export type LiveUpdateType = "new_reading" | "new_alert" | "update_alert";

export interface LiveUpdateMessage {
  type: LiveUpdateType;
  data: unknown;
}

export function useLiveUpdates() {
  const [lastMessage, setLastMessage] = useState<LiveUpdateMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const wsUrl = apiBaseUrl.replace(/^http/, "ws").replace(/\/$/, "") + "/ws/live";

    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as LiveUpdateMessage;
          setLastMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message", error);
        }
      };

      socket.onclose = (event) => {
        if (event.wasClean) {
          console.log(`WebSocket connection closed cleanly, code=${event.code} reason=${event.reason}`);
        } else {
          // e.g. server process killed or network down
          // event.code is usually 1006 in this case
          console.warn("WebSocket connection died. Reconnecting in 5 seconds...");
        }
        reconnectTimeout = setTimeout(connect, 5000);
      };

      socket.onerror = (error) => {
        // WebSocket error objects don't contain much info in the browser for security reasons
        console.error("WebSocket error observed:", error);
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.onclose = null; // Prevent reconnect on unmount
        socketRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return lastMessage;
}
