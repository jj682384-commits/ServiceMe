import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const avatarColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6"];

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  isDestructive?: boolean;
}

function MenuItem({ icon, label, value, onPress, showArrow = true, isDestructive = false }: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather
        name={icon}
        size={20}
        color={isDestructive ? theme.error : theme.textSecondary}
      />
      <ThemedText
        type="body"
        style={[styles.menuLabel, isDestructive ? { color: theme.error } : null]}
      >
        {label}
      </ThemedText>
      {value ? (
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {value}
        </ThemedText>
      ) : null}
      {showArrow ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

interface ToggleItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleItem({ icon, label, value, onValueChange }: ToggleItemProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.menuItem}>
      <Feather name={icon} size={20} color={theme.textSecondary} />
      <ThemedText type="body" style={styles.menuLabel}>
        {label}
      </ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.secondary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function DriverProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { currentDriver, setUserRole } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const avatarColor = avatarColors[(currentDriver?.avatarPreset || 1) % avatarColors.length];

  const handleSwitchRole = () => {
    Alert.alert(
      "Switch Role",
      "Are you sure you want to switch to Provider mode?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: () => {
            setUserRole(null);
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "RoleSelection" }],
              })
            );
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
              {currentDriver?.name?.charAt(0) || "A"}
            </ThemedText>
          </View>
          <ThemedText type="h3" style={styles.profileName}>
            {currentDriver?.name || "Alex Johnson"}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {currentDriver?.email || "alex@email.com"}
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </ThemedText>
          <MenuItem icon="user" label="Edit Profile" />
          <MenuItem icon="phone" label="Phone" value={currentDriver?.phone || "+1 555-1234"} showArrow={false} />
          <MenuItem icon="mail" label="Email" value={currentDriver?.email || "alex@email.com"} showArrow={false} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PAYMENT
          </ThemedText>
          <MenuItem icon="credit-card" label="Payment Methods" />
          <MenuItem icon="file-text" label="Billing History" />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PREFERENCES
          </ThemedText>
          <ToggleItem
            icon="bell"
            label="Push Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <MenuItem icon="map-pin" label="Search Radius" value="10 miles" />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            OTHER
          </ThemedText>
          <MenuItem icon="help-circle" label="Help & Support" />
          <MenuItem icon="file-text" label="Terms of Service" />
          <MenuItem icon="shield" label="Privacy Policy" />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <MenuItem icon="refresh-cw" label="Switch to Provider Mode" onPress={handleSwitchRole} />
          <MenuItem icon="log-out" label="Sign Out" isDestructive />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  profileName: {
    marginBottom: Spacing.xs,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sectionTitle: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  menuLabel: {
    flex: 1,
  },
});
