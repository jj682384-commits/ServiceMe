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
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
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
  const { currentDriver, setUserRole, logout, searchRadius, getTrialDaysRemaining } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const isPremium = currentDriver?.membership === "premium";
  const isOnTrial = currentDriver?.isOnTrial;
  const daysRemaining = getTrialDaysRemaining();

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

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            logout();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Welcome" }],
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

        {!isPremium && (
          <Pressable
            onPress={() => navigation.navigate("PremiumUpgrade")}
            style={[
              styles.premiumCard,
              { backgroundColor: theme.primary, ...Shadows.lg },
            ]}
          >
            <Feather name="star" size={24} color="#FFFFFF" />
            <View style={styles.premiumContent}>
              <ThemedText type="h4" style={{ color: "#FFFFFF", marginBottom: Spacing.xs }}>
                Go Premium
              </ThemedText>
              <ThemedText type="small" style={{ color: "rgba(255,255,255,0.9)" }}>
                10-day free trial - cancel anytime
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color="#FFFFFF" />
          </Pressable>
        )}

        {isPremium && isOnTrial && (
          <Pressable
            onPress={() => navigation.navigate("PremiumUpgrade")}
            style={[
              styles.trialBadge,
              { backgroundColor: theme.success + "20", borderColor: theme.success },
            ]}
          >
            <Feather name="clock" size={18} color={theme.success} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText
                type="body"
                style={{ color: theme.success, fontWeight: "600" }}
              >
                Free Trial Active
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {daysRemaining} days remaining - Cancel anytime
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.success} />
          </Pressable>
        )}

        {isPremium && !isOnTrial && (
          <View
            style={[
              styles.premiumBadge,
              { backgroundColor: theme.secondary, borderColor: theme.secondary },
            ]}
          >
            <Feather name="star" size={18} color={theme.primary} />
            <ThemedText
              type="body"
              style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}
            >
              Premium Member
            </ThemedText>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </ThemedText>
          <MenuItem icon="user" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
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
          <MenuItem icon="map-pin" label="Search Radius" value={`${searchRadius} miles`} onPress={() => navigation.navigate("SearchRadius")} />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SUPPORT
          </ThemedText>
          <MenuItem icon="help-circle" label="Help & Support" onPress={() => navigation.navigate("Support")} />
          <MenuItem 
            icon="alert-triangle" 
            label="Report a Problem" 
            onPress={() => navigation.navigate("ReportProblem")}
          />
          <MenuItem 
            icon="file-text" 
            label="Terms & Privacy" 
            onPress={() => navigation.navigate("LegalDocuments")}
          />
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <MenuItem icon="refresh-cw" label="Switch to Provider Mode" onPress={handleSwitchRole} />
          <MenuItem icon="log-out" label="Sign Out" isDestructive onPress={handleSignOut} />
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
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  premiumContent: {
    flex: 1,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    alignSelf: "center",
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
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
