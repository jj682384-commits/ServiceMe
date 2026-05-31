import React from "react";
import { View, StyleSheet, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  isDestructive?: boolean;
  iconBg?: string;
  iconColor?: string;
}

function MenuItem({ icon, label, value, onPress, showArrow = true, isDestructive = false, iconBg, iconColor }: MenuItemProps) {
  const { theme } = useTheme();
  const defaultIconColor = isDestructive ? theme.error : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.7 : 1 }]}
    >
      {iconBg ? (
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={16} color={iconColor || defaultIconColor} />
        </View>
      ) : (
        <Feather name={icon} size={20} color={defaultIconColor} />
      )}
      <ThemedText
        type="body"
        style={[styles.menuLabel, isDestructive ? { color: theme.error } : null]}
      >
        {label}
      </ThemedText>
      {value ? (
        <ThemedText type="body" style={{ color: theme.textSecondary, fontSize: 13 }}>
          {value}
        </ThemedText>
      ) : null}
      {showArrow ? (
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export default function DriverProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const {
    currentDriver,
    currentProvider,
    setUserRole,
    switchUserRole,
    logout,
    searchRadius,
    getTrialDaysRemaining,
    preferredProviders,
    toggleTheme,
    setThemePreference,
    themeOverride,
    notificationsEnabled,
    setNotificationsEnabled,
    requestHistory,
    vehicles,
  } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isPremium = currentDriver?.membership === "premium";
  const isOnTrial = currentDriver?.isOnTrial;
  const daysRemaining = getTrialDaysRemaining();
  const firstName = currentDriver?.name?.split(" ")[0] || "there";
  const sectionBg = theme.cardAnimatedBg;
  const completedServices = (requestHistory || []).filter((r: any) => r.status === "completed").length;

  const paddingTop = Math.max(insets.top, Spacing["2xl"]) + Spacing.lg;
  const paddingBottom = tabBarHeight + Spacing.xl;

  const handleSwitchRole = () => {
    const hasProviderProfile = currentProvider?.servicesOffered && currentProvider.servicesOffered.length > 0;
    Alert.alert(
      "Switch to Provider Mode",
      hasProviderProfile
        ? "Switch back to your provider dashboard?"
        : "You'll need to set up a provider profile first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: hasProviderProfile ? "Switch" : "Set Up",
          onPress: async () => {
            if (hasProviderProfile) {
              await switchUserRole("provider");
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
            } else {
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderSignUp" }] }));
            }
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
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your profile, history, and payment info will be permanently removed.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: async () => {
                    try { await apiRequest("DELETE", "/api/auth/account", undefined); } catch {}
                    logout();
                    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: Spacing.lg }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Greeting header */}
        <View style={styles.greetingRow}>
          <View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 2 }}>
              Hey there
            </ThemedText>
            <ThemedText type="h2" style={{ fontWeight: "800" }}>
              {firstName}
            </ThemedText>
          </View>
          {isPremium ? (
            <Pressable
              onPress={() => navigation.navigate("PremiumUpgrade")}
              style={[styles.memberPill, { borderColor: "#FFD70040", backgroundColor: "#FFD70015" }]}
            >
              <Feather name="star" size={12} color="#FFD700" />
              <ThemedText type="small" style={{ color: "#FFD700", fontWeight: "700", marginLeft: 5 }}>
                {isOnTrial ? `Trial · ${daysRemaining}d` : "Premium"}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigation.navigate("PremiumUpgrade")}
              style={[styles.memberPill, { borderColor: theme.border }]}
            >
              <Feather name="star" size={12} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: 5 }}>
                Free
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Account hero card */}
        <LinearGradient
          colors={["#1A1A2E", "#16213E", "#0F3460"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <ThemedText type="small" style={{ color: "#93C5FD", fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>
            {isPremium ? "PREMIUM MEMBER" : "FREE ACCOUNT"}
          </ThemedText>
          <ThemedText style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800", lineHeight: 30, marginBottom: 4 }}>
            {currentDriver?.name || "Driver"}
          </ThemedText>
          <ThemedText type="small" style={{ color: "#93C5FD80", marginBottom: 12 }}>
            {currentDriver?.email || ""}
          </ThemedText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { val: String(completedServices), label: "Services" },
              { val: String(preferredProviders?.length ?? 0), label: "Favorites" },
              { val: `${searchRadius} mi`, label: "Radius" },
            ].map((s) => (
              <View key={s.label} style={styles.heroStat}>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>{s.val}</ThemedText>
                <ThemedText style={{ color: "#93C5FD", fontSize: 11 }}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Go Premium CTA (free users only) */}
        {!isPremium && (
          <Pressable
            onPress={() => navigation.navigate("PremiumUpgrade")}
            style={[styles.premiumCta, { backgroundColor: sectionBg, borderColor: theme.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FFD70020" }]}>
              <Feather name="star" size={16} color="#FFD700" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "700" }}>Go Premium</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>10-day free trial · cancel anytime</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        )}

        {/* My Vehicles */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>MY VEHICLES</ThemedText>
            <Pressable onPress={() => navigation.navigate("VehicleManagement")}>
              <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700" }}>Manage</ThemedText>
            </Pressable>
          </View>
          {(vehicles && vehicles.length > 0) ? (
            vehicles.slice(0, 3).map((v: any) => (
              <MenuItem
                key={v.id}
                icon="truck"
                label={`${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "Vehicle"}
                value={v.licensePlate || undefined}
                onPress={() => navigation.navigate("VehicleManagement")}
              />
            ))
          ) : (
            <Pressable
              onPress={() => navigation.navigate("VehicleManagement")}
              style={[styles.menuItem, { gap: Spacing.md }]}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.border }]}>
                <Feather name="plus" size={16} color={theme.textSecondary} />
              </View>
              <ThemedText type="body" style={[styles.menuLabel, { color: theme.textSecondary }]}>Add your vehicle</ThemedText>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Quick Links */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>QUICK LINKS</ThemedText>
          <MenuItem
            icon="credit-card"
            label="Payment Methods"
            iconBg="#3B82F620" iconColor="#3B82F6"
            onPress={() => navigation.navigate("PaymentMethods")}
          />
          <MenuItem
            icon="file-text"
            label="Billing History"
            iconBg="#10B98120" iconColor="#10B981"
            onPress={() => navigation.navigate("BillingHistory")}
          />
          <MenuItem
            icon="heart"
            label="Preferred Providers"
            value={preferredProviders?.length > 0 ? `${preferredProviders.length}` : undefined}
            iconBg="#EC489920" iconColor="#EC4899"
            onPress={() => navigation.navigate("PreferredProviders")}
          />
          <MenuItem
            icon="map-pin"
            label="Search Radius"
            value={`${searchRadius} miles`}
            iconBg="#8B5CF620" iconColor="#8B5CF6"
            onPress={() => navigation.navigate("SearchRadius")}
          />
        </View>

        {/* Safety */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>SAFETY</ThemedText>
          <MenuItem
            icon="users"
            label="Emergency Contacts"
            iconBg={theme.error + "20"} iconColor={theme.error}
            onPress={() => navigation.navigate("EmergencyContacts")}
          />
          <MenuItem
            icon="alert-circle"
            label="Emergency Mode"
            iconBg={theme.error + "15"} iconColor={theme.error}
            onPress={() => navigation.navigate("EmergencyMode")}
          />
        </View>

        {/* Preferences */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>PREFERENCES</ThemedText>
          <View style={styles.menuItem}>
            <Feather name="bell" size={20} color={notificationsEnabled ? theme.text : theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={styles.menuLabel}>Push Notifications</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {notificationsEnabled ? "You'll get job status updates" : "Tap to enable alerts"}
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(enabled) => {
                setNotificationsEnabled(enabled);
                apiRequest("PATCH", "/api/auth/preferences", { notificationsEnabled: enabled }).catch(() => {});
              }}
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.border, flexDirection: "column", alignItems: "stretch", gap: Spacing.sm }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <Feather name="sun" size={20} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={styles.menuLabel}>Appearance</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {themeOverride === null ? "Following iOS setting" : themeOverride === "dark" ? "Dark theme" : "Light theme"}
                </ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {([["System", null], ["Light", "light"], ["Dark", "dark"]] as [string, "dark" | "light" | null][]).map(([label, val]) => {
                const active = themeOverride === val;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setThemePreference(val)}
                    style={{ flex: 1, paddingVertical: 7, borderRadius: BorderRadius.sm, borderWidth: 1.5, alignItems: "center",
                      backgroundColor: active ? theme.primary : "transparent",
                      borderColor: active ? theme.primary : theme.border,
                    }}
                  >
                    <ThemedText type="small" style={{ fontWeight: "700", color: active ? "#fff" : theme.textSecondary }}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>SUPPORT</ThemedText>
          <MenuItem icon="help-circle" label="Help & Support"
            iconBg={theme.textSecondary + "20"} iconColor={theme.textSecondary}
            onPress={() => navigation.navigate("Support")} />
          <MenuItem icon="alert-triangle" label="Report a Problem"
            iconBg={theme.error + "15"} iconColor={theme.error}
            onPress={() => navigation.navigate("ReportProblem")} />
          <MenuItem icon="shield" label="Privacy Policy"
            iconBg={theme.secondary + "15"} iconColor={theme.secondary}
            onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/privacy")} />
          <MenuItem icon="file-text" label="Terms of Service"
            iconBg={theme.secondary + "15"} iconColor={theme.secondary}
            onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/terms")} />
          <MenuItem icon="book" label="Liability Disclaimer"
            iconBg={theme.textSecondary + "15"} iconColor={theme.textSecondary}
            onPress={() => navigation.navigate("LegalDocuments", { initialTab: "liability" })} />
        </View>

        {/* Account actions */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <MenuItem icon="user" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <MenuItem icon="refresh-cw" label="Switch to Provider Mode" onPress={handleSwitchRole} />
          <MenuItem icon="log-out" label="Sign Out" isDestructive onPress={handleSignOut} />
          <MenuItem icon="trash-2" label="Delete Account" isDestructive onPress={handleDeleteAccount} />
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  memberPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
  },
  premiumCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  section: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: Spacing.lg,
  },
  sectionLabel: {
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
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
