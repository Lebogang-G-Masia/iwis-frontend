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

    function connect() {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as LiveUpdateMessage;
          setLastMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message", error);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected. Reconnecting in 5 seconds...");
        setTimeout(connect, 5000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error", error);
        socket.close();
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return lastMessage;
}
