import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const serviceTypeLabels: Partial<Record<ServiceType, string>> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
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

export default function ProviderProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const { currentProvider, setCurrentProvider, setUserRole, logout, serviceRadius, toggleTheme } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [priorityOptIn, setPriorityOptIn] = React.useState(currentProvider?.acceptsPriorityJobs ?? false);
  const [radiusInput, setRadiusInput] = useState(String(currentProvider?.serviceRadiusMiles ?? 25));
  const [savingRadius, setSavingRadius] = useState(false);

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

  const handlePriorityToggle = async (value: boolean) => {
    setPriorityOptIn(value);
    if (currentProvider) {
      setCurrentProvider({ ...currentProvider, acceptsPriorityJobs: value });
      try {
        await apiRequest("PATCH", `/api/providers/${currentProvider.id}/settings`, {
          acceptsPriorityJobs: value,
        });
      } catch {
        // persist locally regardless
      }
    }
  };
  const sectionBg = theme.cardAnimatedBg;

  const handleSwitchRole = () => {
    Alert.alert(
      "Switch Role",
      "Are you sure you want to switch to Driver mode?",
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
    <View style={[styles.container, { backgroundColor: isDark ? "#000000" : theme.backgroundRoot }]}>
      <AnimatedBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, Spacing["2xl"]) + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>Profile</ThemedText>

        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.secondary }]}>
            <Feather name="heart" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h3" style={styles.profileName}>
            {currentProvider?.name || "Helpful Neighbor"}
          </ThemedText>
          <View style={{ marginTop: Spacing.sm }}>
            <VerificationBadge 
              status={currentProvider?.verificationStatus || "not_started"} 
              size="medium" 
            />
          </View>
          <View style={[styles.ratingRow, { marginTop: Spacing.sm }]}>
            <Feather name="star" size={16} color={theme.warning} />
            <ThemedText type="body" style={{ marginLeft: 4 }}>
              {currentProvider?.rating?.toFixed(1) || "5.0"} ({currentProvider?.reviewCount || 0} reviews)
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            Earning by helping others on your own time
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            VEHICLE INFO
          </ThemedText>
          <MenuItem
            icon="truck"
            label="Vehicle"
            value={currentProvider?.vehicleMake ? `${currentProvider.vehicleMake} ${currentProvider.vehicleModel || ""}`.trim() : "Not set"}
            onPress={() => navigation.navigate("ProviderVehicle")}
          />
          <MenuItem
            icon="hash"
            label="License Plate"
            value={currentProvider?.licensePlate || "Not set"}
            onPress={() => navigation.navigate("ProviderVehicle")}
          />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SERVICES OFFERED
          </ThemedText>
          <View style={styles.servicesGrid}>
            {currentProvider?.servicesOffered?.map((service) => (
              <View
                key={service}
                style={[styles.serviceBadge, { backgroundColor: theme.secondary + "15" }]}
              >
                <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "500" }}>
                  {serviceTypeLabels[service]}
                </ThemedText>
              </View>
            )) || (
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                No services configured
              </ThemedText>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            EV CAPABILITIES
          </ThemedText>
          {currentProvider?.evCapable ? (
            <View>
              <View style={styles.evBadgeRow}>
                <View style={[styles.evActiveBadge, { backgroundColor: "#00C85318" }]}>
                  <Feather name="zap" size={14} color="#00C853" />
                  <ThemedText type="small" style={{ color: "#00C853", fontWeight: "700", marginLeft: 6 }}>
                    EV Certified Provider
                  </ThemedText>
                </View>
              </View>
              {(currentProvider.evServices || []).map((key) => {
                const info = evServiceLabels[key];
                if (!info) return null;
                return (
                  <View key={key} style={styles.evServiceItemProfile}>
                    <View style={[styles.evServiceIconProfile, { backgroundColor: "#00C85315" }]}>
                      <Feather name={info.icon} size={16} color="#00C853" />
                    </View>
                    <ThemedText type="body">{info.label}</ThemedText>
                  </View>
                );
              })}
              {(currentProvider.evServices || []).length === 0 ? (
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  No specific EV services selected yet. Tap Edit Profile to add them.
                </ThemedText>
              ) : null}
              <MenuItem icon="edit" label="Update EV Services" onPress={() => navigation.navigate("EditProfile")} />
            </View>
          ) : (
            <View style={styles.evOffRow}>
              <Feather name="zap-off" size={18} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  Not offering EV services
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  Enable in Edit Profile to accept EV job requests
                </ThemedText>
              </View>
              <Pressable onPress={() => navigation.navigate("EditProfile")} style={[styles.evEnableBtn, { borderColor: theme.primary }]}>
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>Enable</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            VERIFICATION
          </ThemedText>
          <MenuItem
            icon={
              currentProvider?.verificationStatus === "verified" ? "shield" :
              currentProvider?.verificationStatus === "pending" ? "clock" :
              "alert-circle"
            }
            label="ID Verification"
            value={
              currentProvider?.verificationStatus === "verified" ? "Verified" :
              currentProvider?.verificationStatus === "pending" ? "In Review" :
              "Not Started"
            }
            onPress={() => navigation.navigate("ProviderVerification")}
          />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            ACCOUNT
          </ThemedText>
          <MenuItem icon="user" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <MenuItem icon="phone" label="Phone" value={currentProvider?.phone || "Not set"} showArrow={false} />
          <MenuItem icon="mail" label="Email" value={currentProvider?.email || "Not set"} showArrow={false} />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            EARNINGS
          </ThemedText>
          <MenuItem icon="dollar-sign" label="Payout Settings" onPress={() => navigation.navigate("ProviderPaymentSettings")} />
          <MenuItem icon="bar-chart-2" label="Earnings History" onPress={() => navigation.navigate("ProviderEarningsHistory")} />
          <MenuItem icon="download" label="Tax Documents" onPress={() => navigation.navigate("ProviderPaymentSettings")} />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            SERVICE RADIUS
          </ThemedText>
          <View style={[styles.menuItem, { flexDirection: "column", alignItems: "flex-start", gap: Spacing.sm }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
              <Feather name="map-pin" size={20} color={theme.secondary} />
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                How far will you travel for jobs?
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 28 }}>
              You will only receive requests within this radius.
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginLeft: 28, marginTop: 4 }}>
              <TextInput
                value={radiusInput}
                onChangeText={setRadiusInput}
                keyboardType="number-pad"
                maxLength={3}
                style={{
                  width: 72,
                  height: 40,
                  borderWidth: 1.5,
                  borderColor: theme.secondary,
                  borderRadius: BorderRadius.md,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  backgroundColor: theme.cardAnimatedBg,
                }}
              />
              <ThemedText type="body" style={{ color: theme.textSecondary }}>miles</ThemedText>
              <Pressable
                onPress={handleSaveRadius}
                disabled={savingRadius}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? theme.secondary + "CC" : theme.secondary,
                  borderRadius: BorderRadius.md,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: 10,
                  opacity: savingRadius ? 0.6 : 1,
                })}
              >
                <ThemedText type="small" style={{ color: "#fff", fontWeight: "700" }}>
                  {savingRadius ? "Saving..." : "Save"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <ThemedText type="small" style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            PREFERENCES
          </ThemedText>
          <View style={styles.menuItem}>
            <Feather name="bell" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.menuLabel}>
              Push Notifications
            </ThemedText>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <Feather name="zap" size={20} color={priorityOptIn ? theme.warning : theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="body" style={styles.menuLabel}>
                Accept Priority Requests
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {priorityOptIn ? "Reduced 10% platform fee on priority jobs" : "Opt in for a reduced 10% fee on express jobs"}
              </ThemedText>
            </View>
            <Switch
              value={priorityOptIn}
              onValueChange={handlePriorityToggle}
              trackColor={{ false: theme.border, true: theme.warning }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <Feather name="moon" size={20} color={theme.textSecondary} />
            <ThemedText type="body" style={styles.menuLabel}>
              Dark Mode
            </ThemedText>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.secondary }}
              thumbColor="#FFFFFF"
            />
          </View>
          <MenuItem icon="map-pin" label="Service Radius" value={`${serviceRadius} miles`} onPress={() => navigation.navigate("SearchRadius")} />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
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
            icon="shield"
            label="Privacy Policy"
            onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/privacy")}
          />
          <MenuItem
            icon="file-text"
            label="Terms of Service"
            onPress={() => WebBrowser.openBrowserAsync("https://resqride.co/terms")}
          />
          <MenuItem 
            icon="book" 
            label="Liability Disclaimer" 
            onPress={() => navigation.navigate("LegalDocuments", { initialTab: "liability" })}
          />
        </View>

        <View style={[styles.section, { backgroundColor: sectionBg }]}>
          <MenuItem icon="refresh-cw" label="Switch to Driver Mode" onPress={handleSwitchRole} />
          <MenuItem icon="log-out" label="Sign Out" isDestructive onPress={handleSignOut} />
        </View>
      </ScrollView>
    </View>
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
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
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
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  serviceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  evBadgeRow: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm },
  evActiveBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.xl, alignSelf: "flex-start" },
  evServiceItemProfile: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  evServiceIconProfile: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  evOffRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  evEnableBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.md, borderWidth: 1.5 },
});
