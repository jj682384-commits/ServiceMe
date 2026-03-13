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
import { useApp, ServiceRequest, BACKGROUND_SCHEMES } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const SERVICE_LABELS: Record<string, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other: "Other",
};

const STATUS_PREVIEWS: Record<string, string> = {
  completed: "Service completed successfully",
  cancelled: "Service was cancelled",
  accepted: "Job accepted, heading to driver",
  en_route: "Heading to the driver",
  arrived: "Arrived at location",
  in_progress: "Service in progress",
  pending: "New job request",
};

const avatarColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6"];

function getConversations(requestHistory: ServiceRequest[]) {
  return requestHistory
    .filter((r) => r.driver !== undefined)
    .map((r) => ({
      id: r.id,
      driverName: r.driver!.name,
      lastMessage: STATUS_PREVIEWS[r.status] ?? "Service request",
      timestamp: r.createdAt,
      serviceType: SERVICE_LABELS[r.serviceType] ?? r.serviceType,
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function ConversationItem({
  item,
  index,
  cardBg,
}: {
  item: ReturnType<typeof getConversations>[number];
  index: number;
  cardBg: string;
}) {
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
      onPress={() =>
        navigation.navigate("Chat", {
          conversationId: item.id,
          providerName: item.driverName,
        })
      }
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
        <ThemedText
          type="body"
          style={{ color: theme.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {item.lastMessage}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export default function ProviderMessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { requestHistory, backgroundPreferences } = useApp();
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const cardBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault;

  const conversations = getConversations(requestHistory);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isAnimated
            ? isDark
              ? scheme.bgColor
              : scheme.bgColorLight
            : theme.backgroundRoot,
        },
      ]}
    >
      {isAnimated ? (
        <AnimatedBackground
          customColors={isDark ? scheme.colors : scheme.colorsLight}
          opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight}
          flashColor={isDark ? scheme.flashColor : scheme.flashColorLight}
          isDark={isDark}
        />
      ) : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ConversationItem item={item} index={index} cardBg={cardBg} />
        )}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          gap: Spacing.md,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListHeaderComponent={
          <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>
            Messages
          </ThemedText>
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
              Conversations with drivers will appear here once you accept a job
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
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
});
