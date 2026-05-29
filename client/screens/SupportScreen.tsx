import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const SUPPORT_PHONE = "1-800-SERVICE";
const POLL_INTERVAL_MS = 3000;

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  fromAdmin?: boolean;
  timestamp: Date;
}

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Hi there! Welcome to ResqRide Support. I'm here to help you 24/7. How can I assist you today?",
    isUser: false,
    timestamp: new Date(),
  },
];

const quickReplies = [
  "I need help with my service request",
  "Payment or billing question",
  "Report a safety concern",
  "Technical issue with the app",
];

const FAQ_ITEMS = [
  { q: "How do I cancel a service request?", icon: "x-circle" as const, color: "#EF4444" },
  { q: "How do refunds work?", icon: "dollar-sign" as const, color: "#10B981" },
  { q: "How do I update payment method?", icon: "credit-card" as const, color: "#3B82F6" },
  { q: "Report a safety concern", icon: "shield" as const, color: "#8B5CF6" },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { authUser, currentDriver, currentProvider, userRole } = useApp();
  const [activeTab, setActiveTab] = useState<"options" | "chat">("options");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [adminActive, setAdminActive] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);

  const chatHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const conversationIdRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(1);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const userName = currentDriver?.name || currentProvider?.name || "User";
  const userId = authUser?.id || currentDriver?.id || currentProvider?.id;
  const sectionBg = theme.cardAnimatedBg;

  // Hide the navigation header when chat is open so there's only one header
  useEffect(() => {
    navigation.setOptions({ headerShown: activeTab === "options" });
  }, [activeTab, navigation]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (activeTab !== "chat") {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }
    pollTimerRef.current = setInterval(pollConversation, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeTab]);

  const pollConversation = useCallback(async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    try {
      const url = new URL(`/api/support/conversation/${convId}`, getApiUrl()).toString();
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const serverMsgs: Array<{ role: string; content: string; ts: string; fromAdmin: boolean }> =
        data.messages || [];
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
          setMessages((prev) => [...prev, ...chatMsgs]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch {
      // silently ignore poll errors
    }
  }, []);

  const handleCallSupport = () => {
    const phoneUrl = Platform.select({
      ios: `telprompt:${SUPPORT_PHONE}`,
      android: `tel:${SUPPORT_PHONE}`,
      default: `tel:${SUPPORT_PHONE}`,
    });
    Linking.openURL(phoneUrl!).catch(() => {
      alert("Unable to open phone app. Please call " + SUPPORT_PHONE);
    });
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    lastMessageCountRef.current += 1;
    setInputText("");
    setIsTyping(true);
    Keyboard.dismiss();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    chatHistoryRef.current = [...chatHistoryRef.current, { role: "user", content: text.trim() }];
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
      setMessages((prev) => [...prev, agentResponse]);
      lastMessageCountRef.current += 1;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "I'm unable to connect right now. Please call 1-800-SERVICE for immediate assistance.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderSupportOptions = () => (
    <KeyboardAwareScrollViewCompat
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      {/* Hero gradient card */}
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
          <View style={[styles.availabilityDot, { backgroundColor: "#10B981" }]} />
          <ThemedText type="small" style={{ color: "#10B981", fontWeight: "700" }}>
            Support agents available now
          </ThemedText>
        </View>
      </LinearGradient>

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
          onPress={() => setActiveTab("chat")}
          style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.iconBox, { backgroundColor: "#8B5CF620" }]}>
            <Feather name="message-circle" size={16} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>Live Chat</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 2 }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Chat in real-time</ThemedText>
              <View style={[styles.responseBadge, { backgroundColor: "#10B98120" }]}>
                <ThemedText style={{ color: "#10B981", fontSize: 10, fontWeight: "700" }}>~1 min</ThemedText>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* FAQ */}
      <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        COMMON QUESTIONS
      </ThemedText>
      <View style={[styles.section, { backgroundColor: sectionBg }]}>
        {FAQ_ITEMS.map((item, index) => (
          <View key={item.q}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            <Pressable
              onPress={() => {
                setActiveTab("chat");
                setTimeout(() => handleSendMessage(item.q), 300);
              }}
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
    </KeyboardAwareScrollViewCompat>
  );

  const renderLiveChat = () => (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      {/* Chat header */}
      <View style={[styles.chatHeader, { borderBottomColor: theme.border, paddingTop: insets.top, backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
        <Pressable
          onPress={() => setActiveTab("options")}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.chatHeaderInfo}>
          <View style={[styles.agentAvatar, { backgroundColor: adminActive ? theme.secondary : theme.primary }]}>
            <Feather name={adminActive ? "user" : "headphones"} size={18} color="#FFFFFF" />
          </View>
          <View>
            <ThemedText type="h4">{adminActive ? "Live Agent" : "ResqRide Support"}</ThemedText>
            <View style={styles.onlineStatus}>
              <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={{ color: theme.success }}>
                {adminActive ? "Agent active" : "Online"}
              </ThemedText>
            </View>
          </View>
        </View>
        {adminActive ? (
          <View style={[styles.agentBadge, { backgroundColor: theme.secondary + "20" }]}>
            <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700" }}>
              Live
            </ThemedText>
          </View>
        ) : null}
      </View>

      {adminActive ? (
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
        {messages.map((message, index) => (
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
            <ThemedText
              type="body"
              style={message.isUser ? { color: "#FFFFFF" } : undefined}
            >
              {message.text}
            </ThemedText>
          </Animated.View>
        ))}

        {isTyping ? (
          <Animated.View
            entering={FadeIn}
            style={[styles.typingIndicator, { backgroundColor: sectionBg }]}
          >
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
          </Animated.View>
        ) : null}

        {waitingForAgent ? (
          <Animated.View entering={FadeIn} style={[styles.waitingBadge, { backgroundColor: theme.warning + "15" }]}>
            <Feather name="clock" size={13} color={theme.warning} />
            <ThemedText type="small" style={{ color: theme.warning, marginLeft: 6 }}>
              Waiting for a live agent to respond...
            </ThemedText>
          </Animated.View>
        ) : null}

        {messages.length <= 2 ? (
          <View style={styles.quickReplies}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              Quick actions:
            </ThemedText>
            {quickReplies.map((reply, index) => (
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

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? "#04060E" : theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: keyboardHeight > 0 ? Spacing.sm : insets.bottom + Spacing.sm,
          },
        ]}
      >
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
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      {activeTab === "options" ? renderSupportOptions() : renderLiveChat()}
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
  availabilityDot: { width: 8, height: 8, borderRadius: 4 },
  sectionLabel: {
    paddingBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 0.5,
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
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.lg },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  responseBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: Spacing.md, padding: Spacing.xs },
  chatHeaderInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1 },
  agentAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  agentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  agentBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 10, borderBottomWidth: 1 },
  onlineStatus: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  messageBubble: { maxWidth: "80%", padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  userMessage: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  agentMessage: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  typingIndicator: { flexDirection: "row", alignSelf: "flex-start", padding: Spacing.md, borderRadius: BorderRadius.md, gap: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, opacity: 0.6 },
  waitingBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", padding: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  quickReplies: { marginTop: Spacing.lg },
  quickReplyButton: { borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, alignSelf: "flex-start" },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.sm },
  chatInput: { flex: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
