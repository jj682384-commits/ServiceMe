import { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl, getAuthToken } from "@/lib/query-client";

/**
 * Conversations currently visible in ChatScreen.
 * useChatNotifier checks this before firing a push notification so we never
 * alert the user for a message they can already see on screen.
 */
export const activeChatConversations = new Set<string>();

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "driver" | "provider" | null;
  content: string;
  timestamp: Date;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function getWebSocketUrl(): string {
  const apiUrl = getApiUrl();
  const wsUrl = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws");
  const base = wsUrl.endsWith("/") ? wsUrl.slice(0, -1) : wsUrl;
  return `${base}/ws`;
}

function parseMessage(raw: object): ChatMessage {
  const r = raw as {
    id: string;
    conversationId: string;
    senderId: string;
    senderRole: "driver" | "provider" | null;
    content: string;
    timestamp: string;
  };
  return { ...r, timestamp: new Date(r.timestamp) };
}

interface UseChatOptions {
  conversationId: string;
  senderId: string;
  senderRole: "driver" | "provider" | null;
  enabled?: boolean;
}

export function useChat({ conversationId, senderId, senderRole, enabled = true }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !conversationId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("connected");
        ws.send(JSON.stringify({ type: "join", conversationId, senderId, senderRole, token: getAuthToken() }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "history") {
            setMessages((data.messages as object[]).map(parseMessage));
          } else if (data.type === "message") {
            const msg = parseMessage(data.message);
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === msg.id);
              return exists ? prev : [...prev, msg];
            });
          }
        } catch {
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setStatus("error");
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("disconnected");
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      };
    } catch {
      setStatus("error");
    }
  }, [conversationId, senderId, senderRole, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (conversationId) activeChatConversations.add(conversationId);
    connect();
    return () => {
      mountedRef.current = false;
      if (conversationId) activeChatConversations.delete(conversationId);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect, conversationId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({ type: "message", conversationId, senderId, senderRole, content: content.trim() })
      );
    },
    [conversationId, senderId, senderRole]
  );

  return { messages, status, sendMessage };
}
