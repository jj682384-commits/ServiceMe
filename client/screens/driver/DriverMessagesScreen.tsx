import React from "react";
import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, BACKGROUND_SCHEMES } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface Conversation {
  id: string;
  providerName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  serviceType: string;
}

const mockConversations: Conversation[] = [
  {
    id: "c1",
    providerName: "Mike's Towing",
    lastMessage: "I'll be there in about 10 minutes",
    timestamp: new Date(Date.now() - 3600000),
    unreadCount: 1,
    serviceType: "Flat Tire",
  },
  {
    id: "c2",
    providerName: "Quick Fix Auto",
    lastMessage: "Your service has been completed. Thank you!",
    timestamp: new Date(Date.now() - 86400000 * 2),
    unreadCount: 0,
    serviceType: "Jump Start",
  },
  {
    id: "c3",
    providerName: "Road Rescue",
    lastMessage: "Can you confirm your exact location?",
    timestamp: new Date(Date.now() - 86400000 * 7),
    unreadCount: 0,
    serviceType: "Fuel Delivery",
  },
];

function ConversationItem({ item, cardBg }: { item: Conversation; cardBg: string }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    
    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  return (
    <Pressable
      onPress={() => navigation.navigate("Chat", { conversationId: item.id, providerName: item.providerName })}
      style={({ pressed }) => [
        styles.conversationItem,
        { backgroundColor: cardBg, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.secondary + "20" }]}>
        <Feather name="truck" size={24} color={theme.secondary} />
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
            {item.providerName}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatTime(item.timestamp)}
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {item.serviceType}
        </ThemedText>
        <View style={styles.messageRow}>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, flex: 1 }}
            numberOfLines={1}
          >
            {item.lastMessage}
          </ThemedText>
          {item.unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {item.unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function DriverMessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { backgroundPreferences } = useApp();
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isAnimated ? "rgba(20, 25, 45, 0.75)" : theme.backgroundDefault;

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? scheme.bgColor : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={scheme.colors} opacityBoost={scheme.opacityBoost} flashColor={scheme.flashColor} /> : null}
      <FlatList
        data={mockConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationItem item={item} cardBg={cardBg} />}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.md,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={
          <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>Messages</ThemedText>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
              No Messages
            </ThemedText>
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              Your conversations with service providers will appear here
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  conversationContent: {
    flex: 1,
    gap: 2,
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
