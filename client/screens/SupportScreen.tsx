import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Linking,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest, getApiUrl, getAuthToken } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const SUPPORT_PHONE = "1-800-SERVICE";
const POLL_INTERVAL_MS = 3000;
const AS_CONV_ID = "support_active_conv_id";
const AS_MESSAGES = "support_active_messages";
const AS_CHAT_HISTORY = "support_chat_history";

type View = "options" | "chat" | "history" | "historyDetail";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  fromAdmin?: boolean;
  timestamp: Date;
}

interface ConvSummary {
  id: string;
  status: string;
  admin_taken_over: boolean;
  created_at: string;
  updated_at: string;
  last_message: { role: string; content: string; ts: string } | null;
  message_count: number;
}

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Hi there! Welcome to ResqRide Support. I'm here to help you 24/7. How can I assist you today?",
    isUser: false,
    timestamp: new Date(),
  },
];

const DRIVER_QUICK_REPLIES = [
  "I need help with my service request",
  "Payment or billing question",
  "Report a safety concern",
  "Technical issue with the app",
];

const PROVIDER_QUICK_REPLIES = [
  "I have a question about my earnings",
  "Help with job acceptance or dispatch",
  "Payout or bank account issue",
  "Report a problem with a driver",
];

const DRIVER_FAQ_ITEMS = [
  { q: "How do I cancel a service request?", icon: "x-circle" as const, color: "#EF4444" },
  { q: "How do refunds work?", icon: "dollar-sign" as const, color: "#10B981" },
  { q: "How do I update payment method?", icon: "credit-card" as const, color: "#3B82F6" },
  { q: "Report a safety concern", icon: "shield" as const, color: "#8B5CF6" },
];

const PROVIDER_FAQ_ITEMS = [
  { q: "When do I get paid for completed jobs?", icon: "dollar-sign" as const, color: "#10B981" },
  { q: "How do I set up or update my payout account?", icon: "credit-card" as const, color: "#3B82F6" },
  { q: "Why was a job removed from my queue?", icon: "x-circle" as const, color: "#EF4444" },
  { q: "How does priority job dispatch work?", icon: "zap" as const, color: "#F59E0B" },
  { q: "How do I get my account verified?", icon: "shield" as const, color: "#8B5CF6" },
  { q: "What is the platform fee and how is it calculated?", icon: "percent" as const, color: "#06B6D4" },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { authUser, currentDriver, currentProvider, userRole } = useApp();

  const [view, setView] = useState<View>("options");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [adminActive, setAdminActive] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [hasActiveConv, setHasActiveConv] = useState(false);
  const [activeConvPreview, setActiveConvPreview] = useState<string>("");

  // History state
  const [history, setHistory] = useState<ConvSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailConv, setDetailConv] = useState<{ id: string; messages: ChatMessage[] } | null>(null);

  const chatHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const conversationIdRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(1);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const userName = currentDriver?.name || currentProvider?.name || "User";
  const userId = authUser?.id || currentDriver?.id || currentProvider?.id;
  const sectionBg = theme.cardAnimatedBg;

  // ── Load history + restore persisted conversation on mount ───────────────────
  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(AS_CONV_ID);
        const savedMsgs = await AsyncStorage.getItem(AS_MESSAGES);
        const savedHistory = await AsyncStorage.getItem(AS_CHAT_HISTORY);
        if (savedId) {
          conversationIdRef.current = savedId;
          setHasActiveConv(true);
        }
        if (savedMsgs) {
          const parsed: ChatMessage[] = JSON.parse(savedMsgs).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
          if (parsed.length > 0) {
            setMessages(parsed);
            const lastUserMsg = [...parsed].reverse().find((m) => m.isUser);
            setActiveConvPreview(lastUserMsg?.text.slice(0, 60) || "Active conversation");
          }
        }
        if (savedHistory) {
          chatHistoryRef.current = JSON.parse(savedHistory);
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, []);

  // ── Persist conversation whenever messages change ────────────────────────────
  const persistConversation = useCallback(async (msgs: ChatMessage[]) => {
    try {
      if (conversationIdRef.current) {
        await AsyncStorage.setItem(AS_CONV_ID, conversationIdRef.current);
      }
      await AsyncStorage.setItem(AS_MESSAGES, JSON.stringify(msgs));
      await AsyncStorage.setItem(AS_CHAT_HISTORY, JSON.stringify(chatHistoryRef.current));
    } catch {
      // ignore
    }
  }, []);

  // ── Hide nav header in chat/history views ────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({ headerShown: view === "options" });
  }, [view, navigation]);

  // ── Keyboard listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Polling for admin messages ───────────────────────────────────────────────
  useEffect(() => {
    if (view !== "chat") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    pollTimerRef.current = setInterval(pollConversation, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [view]);

  const pollConversation = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    try {
      const url = new URL(`/api/support/conversation/${convId}`, getApiUrl()).toString();
      const token = getAuthToken();
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
      if (!res.ok) return;
      const data = await res.json();
      const serverMsgs: Array<{ role: string; content: string; ts: string; fromAdmin: boolean }> = data.messages || [];
      setAdminActive(!!data.admin_taken_over);
      if (serverMsgs.length > lastMessageCountRef.current) {
        const newMsgs = serverMsgs.slice(lastMessageCountRef.current);
        lastMessageCountRef.current = serverMsgs.length;
        const chatMsgs: ChatMessage[] = newMsgs
          .filter((m) => m.role === "assistant")
          .map((m) => ({
            id: `${m.ts}-${Math.random()}`,
            text: m.content,
            isUser: false,
            fromAdmin: m.fromAdmin,
            timestamp: new Date(m.ts),
          }));
        if (chatMsgs.length > 0) {
          setIsTyping(false);
          setWaitingForAgent(false);
          setMessages((prev) => {
            const updated = [...prev, ...chatMsgs];
            persistConversation(updated);
            return updated;
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch { /* ignore */ }
  }, [persistConversation]);

  // ── Load history ─────────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiRequest("GET", "/api/support/conversations");
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch { /* ignore */ } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ── Open a past conversation (read-only) ─────────────────────────────────────
  const openHistoryDetail = async (conv: ConvSummary) => {
    try {
      const url = new URL(`/api/support/conversation/${conv.id}`, getApiUrl()).toString();
      const token = getAuthToken();
      const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
      const data = await res.json();
      const msgs: ChatMessage[] = (data.messages || []).map((m: any) => ({
        id: `${m.ts}-${Math.random()}`,
        text: m.content,
        isUser: m.role === "user",
        fromAdmin: m.fromAdmin,
        timestamp: new Date(m.ts),
      }));
      setDetailConv({ id: conv.id, messages: msgs });
      setView("historyDetail");
    } catch { /* ignore */ }
  };

  // ── Start a new chat (clears saved state) ────────────────────────────────────
  const startNewChat = async () => {
    await AsyncStorage.multiRemove([AS_CONV_ID, AS_MESSAGES, AS_CHAT_HISTORY]);
    conversationIdRef.current = null;
    chatHistoryRef.current = [];
    lastMessageCountRef.current = 1;
    setMessages(initialMessages);
    setHasActiveConv(false);
    setActiveConvPreview("");
    setAdminActive(false);
    setWaitingForAgent(false);
    setView("chat");
  };

  // ── Resume saved chat ────────────────────────────────────────────────────────
  const resumeChat = () => {
    lastMessageCountRef.current = messages.length;
    setView("chat");
  };

  const handleCallSupport = () => {
    const phoneUrl = Platform.select({
      ios: `telprompt:${SUPPORT_PHONE}`,
      android: `tel:${SUPPORT_PHONE}`,
      default: `tel:${SUPPORT_PHONE}`,
    });
    Linking.openURL(phoneUrl!).catch(() => alert("Unable to open phone app. Please call " + SUPPORT_PHONE));
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    lastMessageCountRef.current += 1;
    setInputText("");
    setIsTyping(true);
    setHasActiveConv(true);
    setActiveConvPreview(text.trim().slice(0, 60));
    Keyboard.dismiss();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    chatHistoryRef.current = [...chatHistoryRef.current, { role: "user", content: text.trim() }];
    await persistConversation(updatedWithUser);

    try {
      const res = await apiRequest("POST", "/api/support/chat", {
        message: text.trim(),
        history: chatHistoryRef.current.slice(-6),
        conversationId: conversationIdRef.current ?? undefined,
        userId,
        userRole,
        userName,
      });
      const data = await res.json();
      if (data?.conversationId && !conversationIdRef.current) {
        conversationIdRef.current = data.conversationId;
        await AsyncStorage.setItem(AS_CONV_ID, data.conversationId);
      }
      if (data?.waitingForAgent) {
        setIsTyping(false);
        setWaitingForAgent(true);
        return;
      }
      const replyText: string =
        data?.reply || "I'm having trouble right now. Please call 1-800-SERVICE for immediate help.";
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: replyText }];
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
        timestamp: new Date(),
      };
      const updatedWithReply = [...updatedWithUser, agentResponse];
      setMessages(updatedWithReply);
      lastMessageCountRef.current += 1;
      await persistConversation(updatedWithReply);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm unable to connect right now. Please call 1-800-SERVICE for immediate assistance.",
        isUser: false,
        timestamp: new Date(),
      };
      const updatedWithError = [...updatedWithUser, errorMsg];
      setMessages(updatedWithError);
      await persistConversation(updatedWithError);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Options view ─────────────────────────────────────────────────────────────
  const renderOptions = () => (
    <KeyboardAwareScrollViewCompat
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <LinearGradient
        colors={["#0A1F3A", "#0F2855", "#14124A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroBadge}>
          <Feather name="headphones" size={26} color="#93C5FD" />
        </View>
        <ThemedText style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginTop: Spacing.md, marginBottom: Spacing.xs }}>
          24/7 Support
        </ThemedText>
        <ThemedText type="small" style={{ color: "rgba(255,255,255,0.55)", textAlign: "center", marginBottom: Spacing.md }}>
          Our team is available around the clock to help with any questions or issues.
        </ThemedText>
        <View style={[styles.availabilityBadge, { backgroundColor: "rgba(16,185,129,0.2)" }]}>
          <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
          <ThemedText type="small" style={{ color: "#10B981", fontWeight: "700" }}>
            Support agents available now
          </ThemedText>
        </View>
      </LinearGradient>

      {/* Active / resume conversation */}
      {hasActiveConv && (
        <>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
            ACTIVE CONVERSATION
          </ThemedText>
          <View style={[styles.section, { backgroundColor: sectionBg }]}>
            <View style={styles.menuRow}>
              <View style={[styles.iconBox, { backgroundColor: "#10B98120" }]}>
                <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>Ongoing Chat</ThemedText>
                {activeConvPreview ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {activeConvPreview}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={{ flexDirection: "row" }}>
              <Pressable
                onPress={resumeChat}
                style={({ pressed }) => [styles.splitBtn, { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="message-circle" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "700", marginLeft: 6 }}>Resume</ThemedText>
              </Pressable>
              <Pressable
                onPress={startNewChat}
                style={({ pressed }) => [styles.splitBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="plus" size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: 6 }}>New Chat</ThemedText>
              </Pressable>
            </View>
          </View>
        </>
      )}

      {/* Contact options */}
      <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        CONTACT US
      </ThemedText>
      <View style={[styles.section, { backgroundColor: sectionBg }]}>
        <Pressable
          onPress={handleCallSupport}
          style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.iconBox, { backgroundColor: "#3B82F620" }]}>
            <Feather name="phone" size={16} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Call Support</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Speak directly with an agent · {SUPPORT_PHONE}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Pressable
          onPress={hasActiveConv ? resumeChat : startNewChat}
          style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.iconBox, { backgroundColor: "#8B5CF620" }]}>
            <Feather name="message-circle" size={16} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {hasActiveConv ? "Resume Live Chat" : "Live Chat"}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 2 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Chat in real-time</ThemedText>
              <View style={[styles.badge, { backgroundColor: "#10B98120" }]}>
                <ThemedText style={{ color: "#10B981", fontSize: 10, fontWeight: "700" }}>~1 min</ThemedText>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Common questions */}
      <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        COMMON QUESTIONS
      </ThemedText>
      <View style={[styles.section, { backgroundColor: sectionBg }]}>
        {(userRole === "provider" ? PROVIDER_FAQ_ITEMS : DRIVER_FAQ_ITEMS).map((item, index) => (
          <View key={item.q}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            <Pressable
              onPress={() => { startNewChat().then(() => setTimeout(() => handleSendMessage(item.q), 300)); }}
              style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + "20" }]}>
                <Feather name={item.icon} size={16} color={item.color} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontWeight: "500" }}>{item.q}</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* History */}
      <View style={styles.historyHeader}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
          PAST CONVERSATIONS
        </ThemedText>
        <Pressable
          onPress={() => { loadHistory(); setView("history"); }}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "700" }}>View all</ThemedText>
        </Pressable>
      </View>
      <View style={[styles.section, { backgroundColor: sectionBg }]}>
        {history.length === 0 ? (
          <View style={styles.emptyRow}>
            <Feather name="clock" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
              No past conversations yet
            </ThemedText>
          </View>
        ) : (
          history.slice(0, 3).map((conv, i) => (
            <View key={conv.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
              <Pressable
                onPress={() => openHistoryDetail(conv)}
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[styles.iconBox, { backgroundColor: conv.admin_taken_over ? "#3B82F620" : theme.textSecondary + "20" }]}>
                  <Feather name={conv.admin_taken_over ? "user" : "cpu"} size={16} color={conv.admin_taken_over ? "#3B82F6" : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {conv.last_message?.content?.slice(0, 50) || "Support conversation"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {formatRelativeTime(conv.updated_at)} · {conv.message_count} messages
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))
        )}
      </View>
    </KeyboardAwareScrollViewCompat>
  );

  // ── History list view ─────────────────────────────────────────────────────────
  const renderHistory = () => (
    <View style={{ flex: 1 }}>
      <View style={[styles.subHeader, { paddingTop: insets.top, borderBottomColor: theme.border, backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
        <Pressable
          onPress={() => setView("options")}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <ThemedText type="h4" style={{ flex: 1 }}>Past Conversations</ThemedText>
        <Pressable onPress={loadHistory} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      {historyLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="message-square" size={40} color={theme.textSecondary} style={{ marginBottom: Spacing.md }} />
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            No past conversations yet.{"\n"}Start a chat to get help.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openHistoryDetail(item)}
              style={({ pressed }) => [styles.historyCard, { backgroundColor: sectionBg, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.md }}>
                <View style={[styles.iconBox, { backgroundColor: item.admin_taken_over ? "#3B82F620" : "#8B5CF620", marginTop: 2 }]}>
                  <Feather name={item.admin_taken_over ? "user" : "cpu"} size={16} color={item.admin_taken_over ? "#3B82F6" : "#8B5CF6"} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: 4 }}>
                    <View style={[styles.badge, {
                      backgroundColor: item.status === "open" ? "#10B98120" : theme.textSecondary + "20",
                    }]}>
                      <ThemedText style={{
                        fontSize: 10, fontWeight: "700",
                        color: item.status === "open" ? "#10B981" : theme.textSecondary,
                      }}>
                        {item.status === "open" ? "OPEN" : "CLOSED"}
                      </ThemedText>
                    </View>
                    {item.admin_taken_over ? (
                      <View style={[styles.badge, { backgroundColor: "#3B82F620" }]}>
                        <ThemedText style={{ fontSize: 10, fontWeight: "700", color: "#3B82F6" }}>LIVE AGENT</ThemedText>
                      </View>
                    ) : null}
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: "auto" }}>
                      {formatRelativeTime(item.updated_at)}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" numberOfLines={2} style={{ color: theme.text }}>
                    {item.last_message?.content || "Support conversation"}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    {item.message_count} messages
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={18} color={theme.textSecondary} style={{ marginTop: 4 }} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );

  // ── Chat view (live or read-only history detail) ──────────────────────────────
  const renderChat = (isReadOnly = false, readOnlyMessages?: ChatMessage[]) => {
    const displayMessages = isReadOnly ? (readOnlyMessages || []) : messages;
    return (
      <View style={{ flex: 1, paddingBottom: isReadOnly ? 0 : keyboardHeight }}>
        <View style={[styles.subHeader, { paddingTop: insets.top, borderBottomColor: theme.border, backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
          <Pressable
            onPress={() => setView(isReadOnly ? "history" : "options")}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={theme.text} />
          </Pressable>
          <View style={[styles.agentAvatar, { backgroundColor: adminActive ? theme.secondary : theme.primary }]}>
            <Feather name={adminActive ? "user" : "headphones"} size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="h4">{adminActive ? "Live Agent" : isReadOnly ? "Past Conversation" : "ResqRide Support"}</ThemedText>
            {!isReadOnly && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={[styles.dot, { backgroundColor: theme.success }]} />
                <ThemedText type="small" style={{ color: theme.success }}>{adminActive ? "Agent active" : "Online"}</ThemedText>
              </View>
            )}
          </View>
          {isReadOnly && (
            <View style={[styles.badge, { backgroundColor: theme.textSecondary + "20" }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "700" }}>READ ONLY</ThemedText>
            </View>
          )}
          {!isReadOnly && adminActive ? (
            <View style={[styles.badge, { backgroundColor: theme.secondary + "20" }]}>
              <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700" }}>LIVE</ThemedText>
            </View>
          ) : null}
        </View>

        {!isReadOnly && adminActive ? (
          <View style={[styles.agentBanner, { backgroundColor: theme.secondary + "15", borderBottomColor: theme.secondary + "30" }]}>
            <Feather name="user-check" size={14} color={theme.secondary} />
            <ThemedText type="small" style={{ color: theme.secondary, marginLeft: 6, fontWeight: "600" }}>
              A live agent has joined this conversation
            </ThemedText>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1, justifyContent: "flex-end" }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {displayMessages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeInDown.delay(index < 5 ? 0 : 50).springify()}
              style={[
                styles.messageBubble,
                message.isUser
                  ? [styles.userMessage, { backgroundColor: theme.primary }]
                  : message.fromAdmin
                    ? [styles.agentMessage, { backgroundColor: theme.secondary + "20", borderWidth: 1, borderColor: theme.secondary + "40" }]
                    : [styles.agentMessage, { backgroundColor: sectionBg }],
              ]}
            >
              {!message.isUser && message.fromAdmin ? (
                <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700", marginBottom: 3 }}>
                  Live Agent
                </ThemedText>
              ) : null}
              <ThemedText type="body" style={message.isUser ? { color: "#FFFFFF" } : undefined}>
                {message.text}
              </ThemedText>
            </Animated.View>
          ))}

          {!isReadOnly && isTyping ? (
            <Animated.View entering={FadeIn} style={[styles.typingIndicator, { backgroundColor: sectionBg }]}>
              <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
              <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
            </Animated.View>
          ) : null}

          {!isReadOnly && waitingForAgent ? (
            <Animated.View entering={FadeIn} style={[styles.waitingBadge, { backgroundColor: theme.warning + "15" }]}>
              <Feather name="clock" size={13} color={theme.warning} />
              <ThemedText type="small" style={{ color: theme.warning, marginLeft: 6 }}>
                Waiting for a live agent to respond...
              </ThemedText>
            </Animated.View>
          ) : null}

          {!isReadOnly && displayMessages.length <= 2 ? (
            <View style={{ marginTop: Spacing.lg }}>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>Quick actions:</ThemedText>
              {(userRole === "provider" ? PROVIDER_QUICK_REPLIES : DRIVER_QUICK_REPLIES).map((reply, index) => (
                <Pressable
                  key={index}
                  onPress={() => handleSendMessage(reply)}
                  style={({ pressed }) => [styles.quickReplyButton, { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
                >
                  <ThemedText type="small" style={{ color: theme.primary }}>{reply}</ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {!isReadOnly ? (
          <View style={[styles.inputContainer, {
            backgroundColor: isDark ? "#04060E" : theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: keyboardHeight > 0 ? Spacing.sm : insets.bottom + Spacing.sm,
          }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.chatInput, { backgroundColor: sectionBg, color: theme.text }]}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={() => handleSendMessage(inputText)}
            />
            <Pressable
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: inputText.trim() ? theme.primary : theme.border, opacity: pressed && inputText.trim() ? 0.9 : 1 },
              ]}
            >
              <Feather name="send" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.readOnlyBar, {
            backgroundColor: isDark ? "#04060E" : theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.sm,
          }]}>
            <Feather name="lock" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6 }}>
              This conversation is read-only
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      {view === "options" && renderOptions()}
      {view === "chat" && renderChat(false)}
      {view === "history" && renderHistory()}
      {view === "historyDetail" && detailConv && renderChat(true, detailConv.messages)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.15)",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: {
    paddingBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  splitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  historyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: { padding: Spacing.xs },
  agentAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  agentBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 10, borderBottomWidth: 1 },
  messageBubble: { maxWidth: "80%", padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  userMessage: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  agentMessage: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  typingIndicator: { flexDirection: "row", alignSelf: "flex-start", padding: Spacing.md, borderRadius: BorderRadius.md, gap: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, opacity: 0.6 },
  waitingBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", padding: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  quickReplyButton: { borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, alignSelf: "flex-start" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.sm },
  chatInput: { flex: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  readOnlyBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: Spacing.md, borderTopWidth: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
});
