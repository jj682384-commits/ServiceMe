import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, Alert, TextInput, ScrollView } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const serviceTypeLabels: Partial<Record<ServiceType, string>> = {
  flat_tire:        "Flat Tire",
  jump_start:       "Jump Start",
  tow:              "Tow Service",
  fuel:             "Fuel Delivery",
  lockout:          "Lockout",
  obd_diagnostic:   "OBD Diagnostic",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check:       "Tire Inspection",
  tire_replacement: "Tire Replacement",
  battery_check:    "Battery Check",
};

const evServiceLabels: Record<string, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  ev_charging: { label: "Mobile EV Charging", icon: "zap" },
  ev_towing: { label: "EV-Safe Towing", icon: "truck" },
  hv_certified: { label: "High-Voltage Certified", icon: "shield" },
};

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

export default function ProviderProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider, setUserRole, switchUserRole, logout, serviceRadius, toggleTheme, setThemePreference, themeOverride, notificationsEnabled, setNotificationsEnabled } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [priorityOptIn, setPriorityOptIn] = React.useState(currentProvider?.acceptsPriorityJobs ?? false);
  const [radiusInput, setRadiusInput] = useState(String(currentProvider?.serviceRadiusMiles ?? 25));
  const [savingRadius, setSavingRadius] = useState(false);

  const isBusinessAccount = currentProvider?.providerType === "shop";

  const handleSaveRadius = async () => {
    const miles = parseInt(radiusInput, 10);
    if (isNaN(miles) || miles < 1 || miles > 200) {
      Alert.alert("Invalid Radius", "Please enter a number between 1 and 200.");
      return;
    }
    setSavingRadius(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider?.id}/service-radius`, { serviceRadiusMiles: miles });
      if (currentProvider) setCurrentProvider({ ...currentProvider, serviceRadiusMiles: miles });
    } catch {
      Alert.alert("Error", "Could not save service radius.");
    } finally {
      setSavingRadius(false);
    }
  };

  const handleRadiusSelect = async (miles: number) => {
    if (!currentProvider) return;
    setRadiusInput(String(miles));
    setSavingRadius(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider.id}/service-radius`, { serviceRadiusMiles: miles });
      setCurrentProvider({ ...currentProvider, serviceRadiusMiles: miles });
    } catch {
      Alert.alert("Error", "Could not save service radius.");
    } finally {
      setSavingRadius(false);
    }
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    apiRequest("PATCH", "/api/auth/preferences", { notificationsEnabled: enabled }).catch(() => {
      setNotificationsEnabled(!enabled);
      Alert.alert("Update Failed", "Could not update notification preference. Please try again.");
    });
  };

  const handlePriorityToggle = async (value: boolean) => {
    setPriorityOptIn(value);
    if (currentProvider) {
      setCurrentProvider({ ...currentProvider, acceptsPriorityJobs: value });
      try {
        await apiRequest("PATCH", `/api/providers/${currentProvider.id}/settings`, { acceptsPriorityJobs: value });
      } catch {
        setPriorityOptIn(!value);
        setCurrentProvider({ ...currentProvider, acceptsPriorityJobs: !value });
        Alert.alert("Update Failed", "Could not update priority job preference. Please try again.");
      }
    }
  };

  const handleSwitchRole = () => {
    Alert.alert("Switch to Driver Mode", "Switch back to your driver dashboard?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Switch",
        onPress: async () => {
          await switchUserRole("driver");
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Welcome" }] }));
        },
      },
    ]);
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
              "Your profile, history, earnings, and all data will be permanently removed.",
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

  const sectionBg = theme.cardAnimatedBg;
  const paddingTop = Math.max(insets.top, Spacing["2xl"]) + Spacing.lg;
  const paddingBottom = tabBarHeight + Spacing.xl;

  if (isBusinessAccount) {
    return <BusinessProfile
      currentProvider={currentProvider}
      theme={theme}
      isDark={isDark}
      sectionBg={sectionBg}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      insets={insets}
      navigation={navigation}
      notificationsEnabled={notificationsEnabled}
      handleNotificationsToggle={handleNotificationsToggle}
      priorityOptIn={priorityOptIn}
      handlePriorityToggle={handlePriorityToggle}
      radiusInput={radiusInput}
      setRadiusInput={setRadiusInput}
      savingRadius={savingRadius}
      handleSaveRadius={handleSaveRadius}
      handleRadiusSelect={handleRadiusSelect}
      setThemePreference={setThemePreference}
      themeOverride={themeOverride}
      handleSignOut={handleSignOut}
      handleDeleteAccount={handleDeleteAccount}
    />;
  }

  return <IndependentProfile
    currentProvider={currentProvider}
    theme={theme}
    isDark={isDark}
    sectionBg={sectionBg}
    paddingTop={paddingTop}
    paddingBottom={paddingBottom}
    insets={insets}
    navigation={navigation}
    notificationsEnabled={notificationsEnabled}
    handleNotificationsToggle={handleNotificationsToggle}
    priorityOptIn={priorityOptIn}
    handlePriorityToggle={handlePriorityToggle}
    radiusInput={radiusInput}
    setRadiusInput={setRadiusInput}
    savingRadius={savingRadius}
    handleSaveRadius={handleSaveRadius}
    handleRadiusSelect={handleRadiusSelect}
    setThemePreference={setThemePreference}
    themeOverride={themeOverride}
    handleSwitchRole={handleSwitchRole}
    handleSignOut={handleSignOut}
    handleDeleteAccount={handleDeleteAccount}
  />;
}

// ─────────────────────────────────────────────
// INDEPENDENT PROVIDER — relaxed, personal
// ─────────────────────────────────────────────
const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 75, 100];

function RadiusChipPicker({
  selected, onSelect, saving, theme,
}: {
  selected: number; onSelect: (miles: number) => void; saving: boolean; theme: any;
}) {
  return (
    <View style={{ paddingVertical: Spacing.sm, gap: Spacing.sm }}>
      <ThemedText type="small" style={{ color: theme.textSecondary, paddingHorizontal: 4 }}>
        You will only receive requests within this distance.
      </ThemedText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, paddingHorizontal: 4, paddingTop: 4 }}>
        {RADIUS_OPTIONS.map((miles) => {
          const active = selected === miles;
          return (
            <Pressable
              key={miles}
              onPress={() => !saving && onSelect(miles)}
              style={[
                styles.radiusChip,
                {
                  backgroundColor: active ? "#0066FF22" : theme.cardAnimatedBg,
                  borderColor: active ? "#0066FF" : theme.border,
                  opacity: saving ? 0.6 : 1,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: active ? "#60A5FA" : theme.text,
                  fontWeight: active ? "700" : "400",
                  fontSize: 13,
                }}
              >
                {miles} mi
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {saving ? (
        <ThemedText type="small" style={{ color: theme.textSecondary, paddingHorizontal: 4, fontSize: 11 }}>
          Saving...
        </ThemedText>
      ) : (
        <ThemedText type="small" style={{ color: theme.textSecondary, paddingHorizontal: 4, fontSize: 11 }}>
          Currently set to {selected} mi — tap a distance to update
        </ThemedText>
      )}
    </View>
  );
}

function IndependentProfile({ currentProvider, theme, isDark, sectionBg, paddingTop, paddingBottom, insets, navigation, notificationsEnabled, handleNotificationsToggle, priorityOptIn, handlePriorityToggle, radiusInput, setRadiusInput, savingRadius, handleSaveRadius, handleRadiusSelect, setThemePreference, themeOverride, handleSwitchRole, handleSignOut, handleDeleteAccount }: any) {
  const firstName = currentProvider?.name?.split(" ")[0] || "there";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop, paddingBottom, paddingHorizontal: Spacing.lg, gap: Spacing.md }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Casual greeting header */}
        <View style={styles.indyHeader}>
          <View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 2 }}>
              Hey there
            </ThemedText>
            <ThemedText type="h2" style={{ fontWeight: "800" }}>
              {firstName}
            </ThemedText>
          </View>
          <View style={[styles.onlinePill, { borderColor: currentProvider?.isAvailable ? "#00C85340" : "#64748B40", backgroundColor: currentProvider?.isAvailable ? "#00C85310" : "rgba(100,116,139,0.08)" }]}>
            <View style={[styles.onlineDot, { backgroundColor: currentProvider?.isAvailable ? "#00C853" : "#64748B" }]} />
            <ThemedText type="small" style={{ color: currentProvider?.isAvailable ? "#00C853" : "#94A3B8", fontWeight: "700" }}>{currentProvider?.isAvailable ? "Online" : "Offline"}</ThemedText>
          </View>
        </View>

        {/* Earnings hero card */}
        <LinearGradient
          colors={["#1A1A2E", "#16213E", "#0F3460"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earningsCard}
        >
          <ThemedText type="small" style={{ color: "#93C5FD", fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>
            TODAY'S EARNINGS
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, marginBottom: 4 }}>
            <ThemedText style={{ color: "#FFFFFF", fontSize: 40, fontWeight: "800", lineHeight: 44 }}>
              ${Math.floor(currentProvider?.earningsBalance ?? 0)}
            </ThemedText>
            <ThemedText style={{ color: "#93C5FD", fontSize: 20, fontWeight: "500", marginBottom: 4 }}>
              .{String(Math.round(((currentProvider?.earningsBalance ?? 0) % 1) * 100)).padStart(2, "0")}
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {[
              { val: currentProvider?.rating?.toFixed(1) || "5.0", label: "Rating" },
              { val: currentProvider?.reviewCount || 0, label: "Reviews" },
              { val: `${currentProvider?.serviceRadiusMiles ?? 25} mi`, label: "Radius" },
            ].map((s) => (
              <View key={s.label} style={styles.earningsStat}>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>{s.val}</ThemedText>
                <ThemedText style={{ color: "#93C5FD", fontSize: 11 }}>{s.label}</ThemedText>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* My Services */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>MY SERVICES</ThemedText>
            <Pressable onPress={() => navigation.navigate("EditProfile")}>
              <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "700" }}>Edit</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.servicesGrid, { paddingBottom: Spacing.lg }]}>
            {(currentProvider?.servicesOffered?.length ?? 0) > 0
              ? currentProvider.servicesOffered.map((service: ServiceType) => (
                  <View key={service} style={[styles.servicePill, { backgroundColor: theme.secondary, borderColor: theme.secondary }]}>
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {serviceTypeLabels[service]}
                    </ThemedText>
                  </View>
                ))
              : (
                <Pressable onPress={() => navigation.navigate("EditProfile")} style={[styles.servicePill, { backgroundColor: theme.border, borderColor: theme.border }]}>
                  <Feather name="plus" size={12} color={theme.textSecondary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>Add services</ThemedText>
                </Pressable>
              )}
          </View>
        </View>

        {/* My Ride */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>MY RIDE</ThemedText>
          <MenuItem
            icon="truck"
            label={currentProvider?.vehicleMake ? `${currentProvider.vehicleMake} ${currentProvider.vehicleModel || ""}`.trim() : "Add your vehicle"}
            value={currentProvider?.licensePlate || undefined}
            onPress={() => navigation.navigate("ProviderVehicle")}
          />
        </View>

        {/* EV Capabilities */}
        {currentProvider?.evCapable ? (
          <View style={[styles.section, { backgroundColor: sectionBg }]}>
            <View style={[styles.evActiveBadge, { backgroundColor: "#00C85318", margin: Spacing.lg }]}>
              <Feather name="zap" size={14} color="#00C853" />
              <ThemedText type="small" style={{ color: "#00C853", fontWeight: "700", marginLeft: 6 }}>EV Certified</ThemedText>
            </View>
            {(currentProvider.evServices || []).map((key: string) => {
              const info = evServiceLabels[key];
              if (!info) return null;
              return (
                <View key={key} style={styles.evServiceItem}>
                  <View style={[styles.evServiceIcon, { backgroundColor: "#00C85315" }]}>
                    <Feather name={info.icon} size={16} color="#00C853" />
                  </View>
                  <ThemedText type="body">{info.label}</ThemedText>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Quick links */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>QUICK LINKS</ThemedText>
          <MenuItem icon="dollar-sign" label="Payout & Earnings"
            value={currentProvider?.earningsBalance ? `$${currentProvider.earningsBalance.toFixed(2)} available` : undefined}
            iconBg={theme.secondary + "20"} iconColor={theme.secondary}
            onPress={() => navigation.navigate("ProviderPaymentSettings")} />
          <MenuItem icon="shield" label="Verification"
            value={currentProvider?.verificationStatus === "verified" ? "Verified" : currentProvider?.verificationStatus === "pending" ? "In Review" : "Not Started"}
            iconBg="#00C85320" iconColor="#00C853"
            onPress={() => navigation.navigate("ProviderVerification")} />
          <View style={styles.menuItem}>
            <View style={[styles.iconBox, { backgroundColor: theme.textSecondary + "20" }]}>
              <Feather name="bell" size={16} color={theme.textSecondary} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>Notifications</ThemedText>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Service radius */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>HOW FAR WILL YOU TRAVEL?</ThemedText>
          <RadiusChipPicker
            selected={currentProvider?.serviceRadiusMiles ?? 25}
            onSelect={handleRadiusSelect}
            saving={savingRadius}
            theme={theme}
          />
        </View>

        {/* Preferences */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</ThemedText>
          <View style={styles.menuItem}>
            <Feather name="zap" size={20} color={priorityOptIn ? theme.text : theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={styles.menuLabel}>Priority Jobs</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {priorityOptIn ? "Reduced 10% platform fee" : "Opt in for a reduced 10% fee"}
              </ThemedText>
            </View>
            <Switch
              value={priorityOptIn}
              onValueChange={handlePriorityToggle}
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
                  <Pressable key={label} onPress={() => setThemePreference(val)}
                    style={{ flex: 1, paddingVertical: 7, borderRadius: BorderRadius.sm, borderWidth: 1.5, alignItems: "center",
                      backgroundColor: active ? theme.primary : "transparent", borderColor: active ? theme.primary : theme.border }}>
                    <ThemedText type="small" style={{ fontWeight: "700", color: active ? "#fff" : theme.textSecondary }}>{label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</ThemedText>
          <MenuItem icon="help-circle" label="Help & Support" onPress={() => navigation.navigate("Support")} />
          <MenuItem icon="alert-triangle" label="Report a Problem" onPress={() => navigation.navigate("ReportProblem")} />
          <MenuItem icon="shield" label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/privacy")} />
          <MenuItem icon="file-text" label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/terms")} />
        </View>

        {/* Account actions */}
        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <MenuItem icon="user" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <MenuItem icon="refresh-cw" label="Switch to Driver Mode" onPress={handleSwitchRole} />
          <MenuItem icon="log-out" label="Sign Out" isDestructive onPress={handleSignOut} />
          <MenuItem icon="trash-2" label="Delete Account" isDestructive onPress={handleDeleteAccount} />
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

// ─────────────────────────────────────────────
// BUSINESS PROVIDER — professional, management
// ─────────────────────────────────────────────
function BusinessProfile({ currentProvider, theme, isDark, sectionBg, paddingTop, paddingBottom, insets, navigation, notificationsEnabled, handleNotificationsToggle, priorityOptIn, handlePriorityToggle, radiusInput, setRadiusInput, savingRadius, handleSaveRadius, handleRadiusSelect, setThemePreference, themeOverride, handleSignOut, handleDeleteAccount }: any) {
  const companyName = currentProvider?.name || "My Business";
  const initials = companyName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : "#EEF0F5" }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingTop: 0, paddingBottom, paddingHorizontal: 0 }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Company banner */}
        <LinearGradient
          colors={["#0A0F1E", "#132040"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bizBanner, { paddingTop: paddingTop }]}
        >
          <View style={styles.bizBannerRow}>
            <View style={styles.bizLogoBox}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 18 }}>{initials}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 17, lineHeight: 22 }}>
                {companyName}
              </ThemedText>
              <ThemedText type="small" style={{ color: "#93C5FD", marginTop: 1 }}>Business Account</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#4ADE80" }} />
                <ThemedText type="small" style={{ color: "#4ADE80", fontWeight: "700" }}>Open · Accepting jobs</ThemedText>
              </View>
            </View>
            <Pressable
              onPress={() => navigation.navigate("EditProfile")}
              style={({ pressed }) => [styles.bizSettingsBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="settings" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* KPI metrics */}
          <View style={styles.kpiRow}>
            {[
              { val: `$${currentProvider?.earningsBalance?.toFixed(0) ?? "0"}`, label: "Balance" },
              { val: String(currentProvider?.reviewCount ?? 0), label: "Jobs Done" },
              { val: `${currentProvider?.rating?.toFixed(1) ?? "5.0"}`, label: "Avg Rating" },
            ].map((m) => (
              <View key={m.label} style={styles.kpiBox}>
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 20 }}>{m.val}</ThemedText>
                <ThemedText style={{ color: "#93C5FD", fontSize: 11, marginTop: 2 }}>{m.label}</ThemedText>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: Spacing.lg }}>

          {/* Business Management */}
          <View style={{ marginTop: Spacing.xl }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              BUSINESS MANAGEMENT
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <MenuItem icon="users" label="Team Members"
                value={(currentProvider?.teamMembers?.length ?? 0) > 0 ? `${currentProvider!.teamMembers!.length} staff` : "Staff accounts"}
                iconBg="#A855F720" iconColor="#A855F7"
                onPress={() => navigation.navigate("TeamMembers")} />
              <MenuItem icon="truck" label="Fleet Management"
                value={(currentProvider?.fleetVehicles?.length ?? 0) > 0 ? `${currentProvider!.fleetVehicles!.length} vehicles` : "Add vehicles"}
                iconBg="#3B82F620" iconColor="#3B82F6"
                onPress={() => navigation.navigate("FleetManagement")} />
              <MenuItem icon="map-pin" label="Service Territory"
                value={currentProvider?.serviceRadiusMiles ? `${currentProvider.serviceRadiusMiles} mi radius` : "Set radius"}
                iconBg="#6366F120" iconColor="#6366F1"
                onPress={() => navigation.navigate("ServiceTerritory")} />
              <MenuItem icon="clock" label="Business Hours"
                value={currentProvider?.businessHours ? `${Object.values(currentProvider.businessHours).filter((d: any) => d.open).length} days/week` : "Set schedule"}
                iconBg="#10B98120" iconColor="#10B981"
                onPress={() => navigation.navigate("BusinessHours")} />
            </View>
          </View>

          {/* Services offered */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              SERVICES OFFERED
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <View style={[styles.servicesGrid, { paddingBottom: Spacing.lg, paddingTop: Spacing.sm }]}>
                {(currentProvider?.servicesOffered?.length ?? 0) > 0
                  ? currentProvider.servicesOffered.map((service: ServiceType) => (
                      <View key={service} style={[styles.servicePill, { backgroundColor: theme.secondary + "20", borderColor: theme.secondary + "40" }]}>
                        <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600" }}>
                          {serviceTypeLabels[service]}
                        </ThemedText>
                      </View>
                    ))
                  : (
                    <Pressable onPress={() => navigation.navigate("EditProfile")} style={[styles.servicePill, { backgroundColor: theme.border, borderColor: theme.border }]}>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>Add services</ThemedText>
                    </Pressable>
                  )}
              </View>
              <MenuItem icon="edit" label="Edit Services" onPress={() => navigation.navigate("EditProfile")} />
            </View>
          </View>

          {/* Financials */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              FINANCIALS
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <MenuItem icon="bar-chart-2" label="Revenue Analytics"
                value="Reports & trends"
                iconBg="#10B98120" iconColor="#10B981"
                onPress={() => navigation.navigate("ProviderRevenueAnalytics")} />
              <MenuItem icon="credit-card" label="Payout Account"
                iconBg="#3B82F620" iconColor="#3B82F6"
                onPress={() => navigation.navigate("ProviderPaymentSettings")} />
              <MenuItem icon="file-text" label="Tax Documents"
                iconBg={theme.text + "15"} iconColor={theme.text}
                onPress={() => navigation.navigate("ProviderTaxDocuments")} />
              {/* Priority Jobs — inline toggle row */}
              <View style={styles.menuItem}>
                <View style={[styles.iconBox, {
                  backgroundColor: priorityOptIn ? theme.secondary + "20" : theme.border,
                }]}>
                  <Feather
                    name="zap"
                    size={16}
                    color={priorityOptIn ? theme.secondary : theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText type="body" style={styles.menuLabel}>
                    Priority Jobs
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 1 }}>
                    {priorityOptIn ? "10% fee · Priority dispatch" : "15% fee · Standard dispatch"}
                  </ThemedText>
                </View>
                <Switch
                  value={priorityOptIn}
                  onValueChange={handlePriorityToggle}
                  trackColor={{ false: theme.border, true: theme.secondary + "80" }}
                  thumbColor={priorityOptIn ? theme.secondary : theme.textSecondary}
                />
              </View>
            </View>
          </View>

          {/* Compliance */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              COMPLIANCE & CREDENTIALS
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <MenuItem icon="shield" label="Business Verification"
                value={
                  currentProvider?.verificationStatus === "verified" ? "Fully Verified" :
                  currentProvider?.verificationStatus === "pending" ? "In Review" : "Not Started"
                }
                iconBg="#10B98120" iconColor="#10B981"
                onPress={() => navigation.navigate("ProviderVerification")} />
              <MenuItem icon="clipboard" label="Insurance & Licensing"
                iconBg="#3B82F620" iconColor="#3B82F6"
                onPress={() => Alert.alert("Coming Soon", "Insurance management will be available in a future update.")} />
              <MenuItem icon="award" label="Certifications"
                value={currentProvider?.evCapable ? "EV Certified" : "Add certs"}
                iconBg={theme.text + "15"} iconColor={theme.text}
                onPress={() => navigation.navigate("EditProfile")} />
            </View>
          </View>

          {/* Service radius */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              SERVICE TERRITORY RADIUS
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <RadiusChipPicker
                selected={currentProvider?.serviceRadiusMiles ?? 25}
                onSelect={handleRadiusSelect}
                saving={savingRadius}
                theme={theme}
              />
            </View>
          </View>

          {/* Preferences */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              PREFERENCES
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <View style={styles.menuItem}>
                <Feather name="bell" size={20} color={theme.textSecondary} />
                <ThemedText type="body" style={styles.menuLabel}>Push Notifications</ThemedText>
                <Switch value={notificationsEnabled} onValueChange={handleNotificationsToggle}
                  trackColor={{ false: theme.border, true: theme.secondary }} thumbColor="#FFFFFF" />
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
                      <Pressable key={label} onPress={() => setThemePreference(val)}
                        style={{ flex: 1, paddingVertical: 7, borderRadius: BorderRadius.sm, borderWidth: 1.5, alignItems: "center",
                          backgroundColor: active ? theme.primary : "transparent", borderColor: active ? theme.primary : theme.border }}>
                        <ThemedText type="small" style={{ fontWeight: "700", color: active ? "#fff" : theme.textSecondary }}>{label}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Support */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              SUPPORT
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <MenuItem icon="help-circle" label="Help & Support" onPress={() => navigation.navigate("Support")} />
              <MenuItem icon="alert-triangle" label="Report a Problem" onPress={() => navigation.navigate("ReportProblem")} />
              <MenuItem icon="shield" label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/privacy")} />
              <MenuItem icon="file-text" label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/terms")} />
            </View>
          </View>

          {/* Account */}
          <View style={{ marginTop: Spacing.md, marginBottom: 0 }}>
            <ThemedText type="small" style={[styles.bizSectionLabel, { color: theme.textSecondary }]}>
              ACCOUNT
            </ThemedText>
            <View style={[styles.section, { backgroundColor: sectionBg, marginTop: Spacing.sm }]}>
              <MenuItem icon="log-out" label="Sign Out" isDestructive onPress={handleSignOut} />
              <MenuItem icon="trash-2" label="Delete Account" isDestructive onPress={handleDeleteAccount} />
            </View>
          </View>

        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Independent
  indyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  onlinePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 3.5 },
  earningsCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl },
  earningsStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: BorderRadius.md, paddingVertical: 8, alignItems: "center" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },

  // Business
  bizBanner: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  bizBannerRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.lg },
  bizLogoBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(147,197,253,0.3)" },
  bizSettingsBtn: { width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  kpiRow: { flexDirection: "row", gap: 8 },
  kpiBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  bizSectionLabel: { fontWeight: "700", letterSpacing: 0.8, paddingLeft: 4 },

  // Shared
  section: { borderRadius: BorderRadius.md, marginBottom: 0, overflow: "hidden" },
  sectionTitle: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, fontWeight: "600" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  menuLabel: { flex: 1 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  servicePill: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.xl, borderWidth: 1 },
  evActiveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.xl, alignSelf: "flex-start" },
  evServiceItem: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  radiusChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1.5, minWidth: 56, alignItems: "center" },
  evServiceIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
