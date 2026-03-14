import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useChat, ChatMessage } from "@/hooks/useChat";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  const { theme } = useTheme();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <View style={[styles.messageBubbleContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: isOwn ? theme.primary : theme.backgroundSecondary },
        ]}
      >
        <ThemedText type="body" style={{ color: isOwn ? "#FFFFFF" : theme.text }}>
          {message.content}
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.timestamp, { color: theme.textSecondary }]}>
        {formatTime(message.timestamp)}
      </ThemedText>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { theme } = useTheme();
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <View style={[styles.statusBadge, { backgroundColor: theme.backgroundSecondary }]}>
      {isConnecting ? (
        <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 4 }} />
      ) : (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: isConnected ? "#22C55E" : "#EF4444",
            },
          ]}
        />
      )}
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Reconnecting..."}
      </ThemedText>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<ChatRouteProp>();
  const { userRole, currentDriver, currentProvider } = useApp();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");

  const senderId = userRole === "driver"
    ? (currentDriver?.id || `d-${Date.now()}`)
    : (currentProvider?.id || `p-${Date.now()}`);

  const { messages, status, sendMessage } = useChat({
    conversationId: route.params.conversationId,
    senderId,
    senderRole: userRole,
  });

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText("");
    Keyboard.dismiss();
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <StatusBadge status={status} />

        {messages.length === 0 && status === "connected" ? (
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
              No messages yet.{"\n"}Send a message to start the conversation.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwn={
                  (userRole === "driver" && item.senderRole === "driver") ||
                  (userRole === "provider" && item.senderRole === "provider")
                }
              />
            )}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: Spacing.lg },
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.sm,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || status !== "connected"}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: theme.primary,
                opacity: !inputText.trim() || status !== "connected" ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  messagesList: {
    padding: Spacing.lg,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubbleContainer: {
    marginBottom: Spacing.md,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
