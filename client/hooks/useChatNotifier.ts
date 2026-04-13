import { useEffect, useRef } from "react";
import { getApiUrl } from "@/lib/query-client";
import { activeChatConversations } from "@/hooks/useChat";
import { notifyNewChatMessage } from "@/lib/notifications";

interface UseChatNotifierOptions {
  conversationId: string | null | undefined;
  myRole: "driver" | "provider";
  peerName: string;
}

/**
 * Background chat watcher — runs in the tab navigators so messages trigger
 * a local push notification even when the user is not on the ChatScreen.
 * Suppressed automatically when the conversation is already open (activeChatConversations).
 */
export function useChatNotifier({ conversationId, myRole, peerName }: UseChatNotifierOptions) {
  const wsRef         = useRef<WebSocket | null>(null);
  const cancelledRef  = useRef(false);
  const seenIdsRef    = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) return;

    cancelledRef.current = false;
    seenIdsRef.current.clear();

    const apiUrl = getApiUrl();
    const wsBase = apiUrl.replace(/^https/, "wss").replace(/^http/, "ws").replace(/\/$/, "");
    const wsUrl  = `${wsBase}/ws`;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelledRef.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) { ws.close(); return; }
        ws.send(JSON.stringify({
          type: "join",
          conversationId,
          senderId: `notifier-${myRole}`,
          senderRole: myRole,
        }));
      };

      ws.onmessage = (e) => {
        if (cancelledRef.current) return;
        try {
          const data = JSON.parse(e.data as string);
          if (data.type !== "message") return;

          const msg = data.message as {
            id: string;
            senderRole: string;
            content: string;
          };

          if (!msg?.id || !msg.senderRole) return;
          if (seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);

          const isFromPeer = msg.senderRole !== myRole && !msg.id.endsWith("-auto");
          if (!isFromPeer) return;

          if (activeChatConversations.has(conversationId)) return;

          notifyNewChatMessage(peerName, msg.content).catch(() => {});
        } catch {}
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (cancelledRef.current) return;
        reconnectTimer = setTimeout(connect, 4000);
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, myRole, peerName]);
}
