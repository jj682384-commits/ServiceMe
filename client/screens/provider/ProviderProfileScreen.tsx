import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import AnimatedBackground from "@/components/AnimatedBackground";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType, BACKGROUND_SCHEMES } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const serviceTypeLabels: Record<ServiceType, string> = {
  flat_tire: "Flat Tire",
  jump_start: "Jump Start",
  tow: "Tow Service",
  fuel: "Fuel Delivery",
  lockout: "Lockout",
  obd_diagnostic: "OBD Diagnostic",
  other: "Other",
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
  const { currentProvider, setUserRole, logout, serviceRadius, backgroundPreferences } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const isAnimated = backgroundPreferences.mode === "animated";
  const scheme = BACKGROUND_SCHEMES[backgroundPreferences.colorScheme];
  const sectionBg = isAnimated ? theme.cardAnimatedBg : theme.backgroundDefault;

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
    <View style={[styles.container, { backgroundColor: isAnimated ? (isDark ? scheme.bgColor : scheme.bgColorLight) : theme.backgroundRoot }]}>
      {isAnimated ? <AnimatedBackground customColors={isDark ? scheme.colors : scheme.colorsLight} opacityBoost={isDark ? scheme.opacityBoost : scheme.opacityBoostLight} flashColor={isDark ? scheme.flashColor : scheme.flashColorLight} isDark={isDark} /> : null}
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
            showArrow={false}
          />
          <MenuItem
            icon="hash"
            label="License Plate"
            value={currentProvider?.licensePlate || "Not set"}
            showArrow={false}
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
            icon="file-text" 
            label="Terms & Privacy" 
            onPress={() => navigation.navigate("LegalDocuments")}
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
});
