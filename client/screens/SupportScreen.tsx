import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Platform,
  KeyboardAvoidingView,
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

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const SUPPORT_PHONE = "1-800-SERVICE";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
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

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"options" | "chat">("options");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleCallSupport = () => {
    const phoneUrl = Platform.select({
      ios: `telprompt:${SUPPORT_PHONE}`,
      android: `tel:${SUPPORT_PHONE}`,
      default: `tel:${SUPPORT_PHONE}`,
    });
    Linking.openURL(phoneUrl).catch(() => {
      alert("Unable to open phone app. Please call " + SUPPORT_PHONE);
    });
  };

  const chatHistoryRef = React.useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    Keyboard.dismiss();

    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: "user", content: text.trim() },
    ];

    try {
      const url = new URL("/api/support/chat", getApiUrl()).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: chatHistoryRef.current.slice(-6),
        }),
      });
      const data = res.ok ? await res.json() : null;
      const replyText: string =
        data?.reply ||
        "I'm having trouble right now. Please call 1-800-SERVICE for immediate help.";

      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: "assistant", content: replyText },
      ];

      const agentResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: replyText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
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

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const renderSupportOptions = () => (
    <ScrollView
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <View style={[styles.supportIcon, { backgroundColor: theme.primary }]}>
          <Feather name="headphones" size={32} color="#FFFFFF" />
        </View>
        <ThemedText type="h2" style={styles.title}>
          24/7 Support
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
          Our support team is available around the clock to help you with any questions or issues.
        </ThemedText>
      </View>

      <View style={[styles.availabilityBadge, { backgroundColor: theme.success + "20" }]}>
        <View style={[styles.availabilityDot, { backgroundColor: theme.success }]} />
        <ThemedText type="body" style={{ color: theme.success, fontWeight: "600" }}>
          Support agents available now
        </ThemedText>
      </View>

      <Pressable
        onPress={handleCallSupport}
        style={({ pressed }) => [
          styles.supportCard,
          {
            backgroundColor: theme.backgroundSecondary,
            opacity: pressed ? 0.9 : 1,
            ...Shadows.sm,
          },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.secondary }]}>
          <Feather name="phone" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4">Call Support</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Speak directly with a support agent
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.primary, marginTop: Spacing.xs }}>
            {SUPPORT_PHONE}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => setActiveTab("chat")}
        style={({ pressed }) => [
          styles.supportCard,
          {
            backgroundColor: theme.backgroundSecondary,
            opacity: pressed ? 0.9 : 1,
            ...Shadows.sm,
          },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: theme.primary }]}>
          <Feather name="message-circle" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.cardContent}>
          <ThemedText type="h4">Live Chat</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Chat with support in real-time
          </ThemedText>
          <View style={[styles.responseTime, { backgroundColor: theme.success + "20" }]}>
            <ThemedText type="small" style={{ color: theme.success }}>
              Avg. response: under 1 min
            </ThemedText>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <View style={[styles.faqSection, { backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
          Common Questions
        </ThemedText>
        {[
          { q: "How do I cancel a service request?", icon: "x-circle" as const },
          { q: "How do refunds work?", icon: "dollar-sign" as const },
          { q: "How do I update payment method?", icon: "credit-card" as const },
          { q: "Report a safety concern", icon: "shield" as const },
        ].map((item, index) => (
          <Pressable
            key={index}
            onPress={() => {
              setActiveTab("chat");
              setTimeout(() => handleSendMessage(item.q), 300);
            }}
            style={({ pressed }) => [
              styles.faqItem,
              {
                borderBottomColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name={item.icon} size={18} color={theme.textSecondary} />
            <ThemedText type="body" style={{ flex: 1, marginLeft: Spacing.sm }}>
              {item.q}
            </ThemedText>
            <Feather name="chevron-right" size={18} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  const renderLiveChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={[styles.chatHeader, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab("options")}
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <View style={styles.chatHeaderInfo}>
          <View style={[styles.agentAvatar, { backgroundColor: theme.primary }]}>
            <Feather name="headphones" size={18} color="#FFFFFF" />
          </View>
          <View>
            <ThemedText type="h4">ResqRide Support</ThemedText>
            <View style={styles.onlineStatus}>
              <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
              <ThemedText type="small" style={{ color: theme.success }}>
                Online
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: Spacing.xl,
        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message, index) => (
          <Animated.View
            key={message.id}
            entering={FadeInDown.delay(index * 50).springify()}
            style={[
              styles.messageBubble,
              message.isUser
                ? [styles.userMessage, { backgroundColor: theme.primary }]
                : [styles.agentMessage, { backgroundColor: theme.backgroundSecondary }],
            ]}
          >
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
            style={[styles.typingIndicator, { backgroundColor: theme.backgroundSecondary }]}
          >
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
            <View style={[styles.typingDot, { backgroundColor: theme.textSecondary }]} />
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
                onPress={() => handleQuickReply(reply)}
                style={({ pressed }) => [
                  styles.quickReplyButton,
                  {
                    borderColor: theme.primary,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {reply}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.chatInput,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
            },
          ]}
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
            {
              backgroundColor: inputText.trim() ? theme.primary : theme.border,
              opacity: pressed && inputText.trim() ? 0.9 : 1,
            },
          ]}
        >
          <Feather name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <ThemedView style={styles.container}>
      {activeTab === "options" ? renderSupportOptions() : renderLiveChat()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  supportIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  responseTime: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  faqSection: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  faqItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  chatHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  userMessage: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  agentMessage: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  typingIndicator: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  quickReplies: {
    marginTop: Spacing.lg,
  },
  quickReplyButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  chatInput: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
