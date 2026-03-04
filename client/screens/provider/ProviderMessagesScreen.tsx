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
  driverName: string;
  lastMessage: string;
  timestamp: Date;
  unreadCount: number;
  serviceType: string;
}

const mockConversations: Conversation[] = [
  {
    id: "c1",
    driverName: "Alex Johnson",
    lastMessage: "Thank you! I'm waiting by the blue car.",
    timestamp: new Date(Date.now() - 1800000),
    unreadCount: 2,
    serviceType: "Flat Tire",
  },
  {
    id: "c2",
    driverName: "Sarah Miller",
    lastMessage: "Great, see you soon!",
    timestamp: new Date(Date.now() - 86400000),
    unreadCount: 0,
    serviceType: "Jump Start",
  },
  {
    id: "c3",
    driverName: "Mike Chen",
    lastMessage: "The service was excellent. Thank you!",
    timestamp: new Date(Date.now() - 86400000 * 3),
    unreadCount: 0,
    serviceType: "Lockout",
  },
];

const avatarColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6"];

function ConversationItem({ item, index, cardBg }: { item: Conversation; index: number; cardBg: string }) {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const avatarColor = avatarColors[index % avatarColors.length];

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
      onPress={() => navigation.navigate("Chat", { conversationId: item.id, providerName: item.driverName })}
      style={({ pressed }) => [
        styles.conversationItem,
        { backgroundColor: cardBg, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
          {item.driverName.charAt(0)}
        </ThemedText>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
            {item.driverName}
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

export default function ProviderMessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { backgroundPreferences } = useApp();
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault;

  return (
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}
      <FlatList
        data={mockConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ConversationItem item={item} index={index} cardBg={cardBg} />}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
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
              Your conversations with drivers will appear here
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
