import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useApp } from "@/context/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EV = {
  bg: "#050510",
  bgCard: "#0C0C1E",
  bgCardLight: "#12122A",
  bgGlow: "#0A0A20",
  neonGreen: "#00FF88",
  neonGreenDim: "#00CC6A",
  neonCyan: "#00E5FF",
  neonBlue: "#4D7CFF",
  neonPurple: "#B44DFF",
  neonPink: "#FF4DA6",
  white: "#F0F4FF",
  whiteDim: "#8892A8",
  whiteGhost: "#4A5068",
  border: "#1A1A3A",
  borderGlow: "#00FF8820",
  gradientGreen: ["#00FF88", "#00CC6A", "#00E5FF"] as const,
  gradientPurple: ["#B44DFF", "#7C3AED", "#4D7CFF"] as const,
  gradientDark: ["#050510", "#0A0A20", "#0C0C1E"] as const,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PulseRing({ delay = 0 }: { delay?: number }) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    const timeout = setTimeout(() => {
      scale.value = withRepeat(
        withTiming(2.2, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: 60,
          borderWidth: 1,
          borderColor: EV.neonGreen,
        },
        style,
      ]}
    />
  );
}

function GlowCard({
  children,
  glowColor = EV.neonGreen,
  onPress,
  style: extraStyle,
}: {
  children: React.ReactNode;
  glowColor?: string;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <Animated.View
      style={[
        styles.glowCard,
        {
          borderColor: glowColor + "30",
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
        },
        animStyle,
        extraStyle,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 200 });
        }}
        onPress={onPress}
        style={[animStyle, extraStyle]}
      >
        <View
          style={[
            styles.glowCard,
            {
              borderColor: glowColor + "30",
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
            },
          ]}
        >
          {children}
        </View>
      </AnimatedPressable>
    );
  }

  return content;
}

function StatPill({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statPill, { borderColor: color + "25" }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View>
        <Animated.Text style={[styles.statValue, { color: EV.white }]}>{value}</Animated.Text>
        <Animated.Text style={[styles.statLabel, { color: EV.whiteDim }]}>{label}</Animated.Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 12, stiffness: 180 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      }}
      onPress={onPress}
      style={[styles.quickAction, animStyle]}
    >
      <LinearGradient
        colors={[color + "20", color + "08"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quickActionGradient}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={22} color={color} />
        </View>
        <Animated.Text style={[styles.quickActionLabel, { color: EV.white }]} numberOfLines={2}>
          {label}
        </Animated.Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function ChargingStation({
  name,
  distance,
  chargerCount,
  speed,
  available,
}: {
  name: string;
  distance: string;
  chargerCount: number;
  speed: string;
  available: number;
}) {
  return (
    <View style={styles.stationCard}>
      <View style={styles.stationLeft}>
        <View style={[styles.stationDot, { backgroundColor: available > 0 ? EV.neonGreen : EV.neonPink }]} />
        <View style={{ flex: 1 }}>
          <Animated.Text style={styles.stationName} numberOfLines={1}>{name}</Animated.Text>
          <Animated.Text style={styles.stationMeta}>{distance} away</Animated.Text>
        </View>
      </View>
      <View style={styles.stationRight}>
        <View style={[styles.speedBadge, { backgroundColor: speed === "DC Fast" ? EV.neonCyan + "20" : EV.neonGreen + "15" }]}>
          <Feather name="zap" size={10} color={speed === "DC Fast" ? EV.neonCyan : EV.neonGreen} />
          <Animated.Text
            style={[styles.speedText, { color: speed === "DC Fast" ? EV.neonCyan : EV.neonGreen }]}
          >
            {speed}
          </Animated.Text>
        </View>
        <Animated.Text style={styles.availText}>
          {available}/{chargerCount} open
        </Animated.Text>
      </View>
    </View>
  );
}

export default function EVModeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { vehicles, getDefaultVehicle } = useApp();

  const defaultVehicle = getDefaultVehicle();
  const isEV = defaultVehicle?.fuelType === "electric";

  const batteryLevel = 73;
  const rangeEstimate = 218;

  const scanPulse = useSharedValue(0);
  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(scanPulse);
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scanPulse.value, [0, 1], [0.4, 1]),
  }));

  return (
    <View style={[styles.container, { backgroundColor: EV.bg }]}>
      <LinearGradient
        colors={["#00FF8808", "#00E5FF05", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: tabBarHeight + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.header}>
          <Animated.Text style={styles.headerLabel}>EV MODE</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Feather name="zap" size={22} color={EV.neonGreen} />
            <Animated.Text style={styles.headerTitle}>Electric Hub</Animated.Text>
          </View>
          {defaultVehicle ? (
            <Animated.Text style={styles.headerCar}>
              {defaultVehicle.year} {defaultVehicle.make} {defaultVehicle.model}
            </Animated.Text>
          ) : (
            <Animated.Text style={styles.headerCar}>
              No EV selected
            </Animated.Text>
          )}
        </View>

        <GlowCard glowColor={EV.neonGreen}>
          <View style={styles.batterySection}>
            <View style={styles.batteryRingContainer}>
              <PulseRing delay={0} />
              <PulseRing delay={800} />
              <View style={styles.batteryCircle}>
                <LinearGradient
                  colors={[EV.neonGreen + "25", EV.bgCard]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.batteryCircleInner}
                >
                  <Animated.Text style={[styles.batteryPercent, scanStyle]}>
                    {batteryLevel}%
                  </Animated.Text>
                  <Animated.Text style={styles.batteryLabel}>CHARGE</Animated.Text>
                </LinearGradient>
              </View>
            </View>
            <View style={styles.batteryStats}>
              <View style={styles.batteryStatItem}>
                <Feather name="navigation" size={14} color={EV.neonCyan} />
                <Animated.Text style={styles.batteryStatValue}>{rangeEstimate} mi</Animated.Text>
                <Animated.Text style={styles.batteryStatLabel}>Est. Range</Animated.Text>
              </View>
              <View style={[styles.batteryDivider, { backgroundColor: EV.border }]} />
              <View style={styles.batteryStatItem}>
                <Feather name="clock" size={14} color={EV.neonPurple} />
                <Animated.Text style={styles.batteryStatValue}>1h 12m</Animated.Text>
                <Animated.Text style={styles.batteryStatLabel}>To Full</Animated.Text>
              </View>
              <View style={[styles.batteryDivider, { backgroundColor: EV.border }]} />
              <View style={styles.batteryStatItem}>
                <Feather name="trending-up" size={14} color={EV.neonGreen} />
                <Animated.Text style={styles.batteryStatValue}>3.8</Animated.Text>
                <Animated.Text style={styles.batteryStatLabel}>mi/kWh</Animated.Text>
              </View>
            </View>
          </View>
        </GlowCard>

        <View style={styles.statsGrid}>
          <StatPill icon="battery-charging" value="Level 2" label="Last Charge" color={EV.neonGreen} />
          <StatPill icon="map-pin" value="0.4 mi" label="Nearest Charger" color={EV.neonCyan} />
          <StatPill icon="dollar-sign" value="$4.80" label="Est. Cost" color={EV.neonPurple} />
          <StatPill icon="thermometer" value="72F" label="Battery Temp" color={EV.neonBlue} />
        </View>

        <View style={styles.sectionHeader}>
          <Animated.Text style={styles.sectionTitle}>Quick Actions</Animated.Text>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="map-pin"
            label="Find Charger"
            color={EV.neonGreen}
          />
          <QuickAction
            icon="zap"
            label="Mobile Charge"
            color={EV.neonCyan}
            onPress={() => navigation.navigate("ServiceRequest", { serviceType: "jump_start", notes: "EV Mobile Charging Requested" })}
          />
          <QuickAction
            icon="truck"
            label="EV Tow"
            color={EV.neonPurple}
            onPress={() => navigation.navigate("ServiceRequest", { serviceType: "tow", notes: "Electric vehicle - flatbed required" })}
          />
          <QuickAction
            icon="tool"
            label="EV Diagnostic"
            color={EV.neonBlue}
            onPress={() => navigation.navigate("SmartDiagnostic")}
          />
          <QuickAction
            icon="navigation"
            label="Trip Planner"
            color={EV.neonPink}
          />
          <QuickAction
            icon="shield"
            label="Range Alert"
            color={EV.neonGreenDim}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Animated.Text style={styles.sectionTitle}>Nearby Chargers</Animated.Text>
          <Pressable>
            <Animated.Text style={styles.seeAll}>View Map</Animated.Text>
          </Pressable>
        </View>

        <GlowCard glowColor={EV.neonCyan}>
          <ChargingStation name="Volta Station - Downtown" distance="0.4 mi" chargerCount={8} speed="DC Fast" available={3} />
          <View style={[styles.stationSep, { backgroundColor: EV.border }]} />
          <ChargingStation name="ChargePoint - Oak Plaza" distance="1.2 mi" chargerCount={4} speed="Level 2" available={2} />
          <View style={[styles.stationSep, { backgroundColor: EV.border }]} />
          <ChargingStation name="Tesla Supercharger - Mall" distance="2.8 mi" chargerCount={12} speed="DC Fast" available={7} />
          <View style={[styles.stationSep, { backgroundColor: EV.border }]} />
          <ChargingStation name="EVgo - Gas Station" distance="3.1 mi" chargerCount={2} speed="DC Fast" available={0} />
        </GlowCard>

        <View style={styles.sectionHeader}>
          <Animated.Text style={styles.sectionTitle}>EV Tips</Animated.Text>
        </View>

        <GlowCard glowColor={EV.neonPurple} style={{ marginBottom: 12 }}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: EV.neonPurple + "18" }]}>
              <Feather name="sun" size={20} color={EV.neonPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={styles.tipTitle}>Precondition Your Battery</Animated.Text>
              <Animated.Text style={styles.tipBody}>
                Warm up your battery before fast charging in cold weather. This can reduce charge time by up to 30%.
              </Animated.Text>
            </View>
          </View>
        </GlowCard>

        <GlowCard glowColor={EV.neonGreen} style={{ marginBottom: 12 }}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: EV.neonGreen + "18" }]}>
              <Feather name="zap" size={20} color={EV.neonGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={styles.tipTitle}>Optimal Charge Range</Animated.Text>
              <Animated.Text style={styles.tipBody}>
                Keep your battery between 20-80% for daily use. This extends battery lifespan and improves long-term performance.
              </Animated.Text>
            </View>
          </View>
        </GlowCard>

        <GlowCard glowColor={EV.neonCyan}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: EV.neonCyan + "18" }]}>
              <Feather name="wind" size={20} color={EV.neonCyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={styles.tipTitle}>Regenerative Braking</Animated.Text>
              <Animated.Text style={styles.tipBody}>
                Use one-pedal driving mode when available. Regenerative braking can recover up to 30% of energy and extend your range.
              </Animated.Text>
            </View>
          </View>
        </GlowCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  headerLabel: {
    color: EV.neonGreen,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  headerTitle: {
    color: EV.white,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerCar: {
    color: EV.whiteDim,
    fontSize: 14,
    marginTop: 2,
  },
  glowCard: {
    backgroundColor: EV.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  batterySection: {
    alignItems: "center",
  },
  batteryRingContainer: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  batteryCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: EV.neonGreen + "60",
    overflow: "hidden",
  },
  batteryCircleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  batteryPercent: {
    color: EV.neonGreen,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  batteryLabel: {
    color: EV.whiteDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: -2,
  },
  batteryStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
  },
  batteryStatItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  batteryStatValue: {
    color: EV.white,
    fontSize: 16,
    fontWeight: "700",
  },
  batteryStatLabel: {
    color: EV.whiteDim,
    fontSize: 11,
    fontWeight: "500",
  },
  batteryDivider: {
    width: 1,
    height: 36,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: EV.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    width: (SCREEN_WIDTH - 50) / 2,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: EV.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  seeAll: {
    color: EV.neonCyan,
    fontSize: 13,
    fontWeight: "600",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  quickAction: {
    width: (SCREEN_WIDTH - 60) / 3,
  },
  quickActionGradient: {
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: EV.border,
    minHeight: 100,
    justifyContent: "center",
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  stationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  stationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  stationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stationName: {
    color: EV.white,
    fontSize: 14,
    fontWeight: "600",
  },
  stationMeta: {
    color: EV.whiteDim,
    fontSize: 12,
    marginTop: 1,
  },
  stationRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  speedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  speedText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  availText: {
    color: EV.whiteDim,
    fontSize: 11,
  },
  stationSep: {
    height: StyleSheet.hairlineWidth,
  },
  tipCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTitle: {
    color: EV.white,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipBody: {
    color: EV.whiteDim,
    fontSize: 13,
    lineHeight: 18,
  },
});
