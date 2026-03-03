import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp, Message } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

const mockMessages: Message[] = [
  {
    id: "m1",
    senderId: "p1",
    senderRole: "provider",
    content: "Hello! I'm on my way to your location.",
    timestamp: new Date(Date.now() - 600000),
    requestId: "c1",
  },
  {
    id: "m2",
    senderId: "d1",
    senderRole: "driver",
    content: "Great, thank you! I'm parked on the street.",
    timestamp: new Date(Date.now() - 540000),
    requestId: "c1",
  },
  {
    id: "m3",
    senderId: "p1",
    senderRole: "provider",
    content: "I'll be there in about 10 minutes. Can you describe your car?",
    timestamp: new Date(Date.now() - 480000),
    requestId: "c1",
  },
  {
    id: "m4",
    senderId: "d1",
    senderRole: "driver",
    content: "It's a silver Honda Civic, parked in front of the coffee shop.",
    timestamp: new Date(Date.now() - 420000),
    requestId: "c1",
  },
  {
    id: "m5",
    senderId: "p1",
    senderRole: "provider",
    content: "Perfect, I see you. I'll be there in 2 minutes!",
    timestamp: new Date(Date.now() - 300000),
    requestId: "c1",
  },
];

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const { theme } = useTheme();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <View style={[styles.messageBubbleContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: isOwn ? theme.primary : theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={{ color: isOwn ? "#FFFFFF" : theme.text }}
        >
          {message.content}
        </ThemedText>
      </View>
      <ThemedText type="small" style={[styles.timestamp, { color: theme.textSecondary }]}>
        {formatTime(message.timestamp)}
      </ThemedText>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<ChatRouteProp>();
  const { userRole, addMessage } = useApp();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    });
    return () => sub.remove();
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: userRole === "driver" ? "d1" : "p1",
      senderRole: userRole,
      content: inputText.trim(),
      timestamp: new Date(),
      requestId: route.params.conversationId,
    };

    setMessages((prev) => [...prev, newMessage]);
    addMessage(newMessage);
    setInputText("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
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
        />

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
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: theme.primary,
                opacity: !inputText.trim() ? 0.5 : pressed ? 0.8 : 1,
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
    borderTopWidth: 0,
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
