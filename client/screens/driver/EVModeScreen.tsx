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
import { useTheme } from "@/hooks/useTheme";
import EVAnimatedBackground from "@/components/EVAnimatedBackground";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import { EV_DARK, EV_LIGHT, type EVColors } from "@/constants/evColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PulseRing({ delay = 0, ev }: { delay?: number; ev: EVColors }) {
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
          width: 140,
          height: 140,
          borderRadius: 70,
          borderWidth: 1,
          borderColor: ev.neonGreen,
        },
        style,
      ]}
    />
  );
}

function GlowCard({
  children,
  glowColor,
  onPress,
  style: extraStyle,
  ev,
}: {
  children: React.ReactNode;
  glowColor?: string;
  onPress?: () => void;
  style?: any;
  ev: EVColors;
}) {
  const gc = glowColor || ev.neonGreen;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = {
    backgroundColor: ev.bgCard,
    borderColor: gc + "30",
    shadowColor: gc,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  };

  const content = (
    <Animated.View
      style={[
        styles.glowCard,
        cardStyle,
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
        <View style={[styles.glowCard, cardStyle]}>
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
  ev,
}: {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  color: string;
  ev: EVColors;
}) {
  return (
    <View style={[styles.statPill, { borderColor: color + "25", backgroundColor: ev.bgCard }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View>
        <Animated.Text style={[styles.statValue, { color: ev.white }]}>{value}</Animated.Text>
        <Animated.Text style={[styles.statLabel, { color: ev.whiteDim }]}>{label}</Animated.Text>
      </View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
  ev,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress?: () => void;
  ev: EVColors;
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
        style={[styles.quickActionGradient, { borderColor: ev.border }]}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon} size={24} color={color} />
        </View>
        <Animated.Text style={[styles.quickActionLabel, { color: ev.white }]} numberOfLines={2}>
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
  ev,
}: {
  name: string;
  distance: string;
  chargerCount: number;
  speed: string;
  available: number;
  ev: EVColors;
}) {
  return (
    <View style={styles.stationCard}>
      <View style={styles.stationLeft}>
        <View style={[styles.stationDot, { backgroundColor: available > 0 ? ev.neonGreen : ev.neonPink }]} />
        <View style={{ flex: 1 }}>
          <Animated.Text style={[styles.stationName, { color: ev.white }]} numberOfLines={1}>{name}</Animated.Text>
          <Animated.Text style={[styles.stationMeta, { color: ev.whiteDim }]}>{distance} away</Animated.Text>
        </View>
      </View>
      <View style={styles.stationRight}>
        <View style={[styles.speedBadge, { backgroundColor: speed === "DC Fast" ? ev.neonCyan + "20" : ev.neonGreen + "15" }]}>
          <Feather name="zap" size={10} color={speed === "DC Fast" ? ev.neonCyan : ev.neonGreen} />
          <Animated.Text
            style={[styles.speedText, { color: speed === "DC Fast" ? ev.neonCyan : ev.neonGreen }]}
          >
            {speed}
          </Animated.Text>
        </View>
        <Animated.Text style={[styles.availText, { color: ev.whiteDim }]}>
          {available}/{chargerCount} open
        </Animated.Text>
      </View>
    </View>
  );
}

function AnimatedGradientButton({ onPress, ev }: { onPress: () => void; ev: EVColors }) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-402, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const gradientSlide = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <Pressable onPress={onPress} style={styles.gateButton}>
      <View style={[styles.gateButtonGradient, { overflow: "hidden" }]}>
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 804,
              flexDirection: "row",
            },
            gradientSlide,
          ]}
        >
          <LinearGradient
            colors={[
              ev.neonGreen,
              ev.neonCyan,
              ev.neonBlue,
              ev.neonPurple,
              ev.neonGreen,
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: 402, height: "100%" }}
          />
          <LinearGradient
            colors={[
              ev.neonGreen,
              ev.neonCyan,
              ev.neonBlue,
              ev.neonPurple,
              ev.neonGreen,
            ]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: 402, height: "100%" }}
          />
        </Animated.View>
        <Feather name="plus-circle" size={24} color="#000" style={{ zIndex: 1 }} />
        <Animated.Text style={[styles.gateButtonText, { zIndex: 1 }]}>Add Electric Vehicle</Animated.Text>
      </View>
    </Pressable>
  );
}

function PulsingZapIcon({ ev }: { ev: EVColors }) {
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0.5);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={{ width: 130, height: 130, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: 65,
            borderWidth: 2,
            borderColor: ev.neonGreen,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: ev.neonGreen,
          },
          glowStyle,
        ]}
      />
      <LinearGradient
        colors={[ev.neonGreen + "25", ev.bgCard]}
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={iconStyle}>
          <Feather name="zap" size={56} color={ev.neonGreen} />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

export default function EVModeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { vehicles, getDefaultVehicle } = useApp();
  const { isDark } = useTheme();

  const ev = isDark ? EV_DARK : EV_LIGHT;

  const hasEV = vehicles.some((v) => v.fuelType === "electric");
  const defaultVehicle = getDefaultVehicle();
  const evVehicle = defaultVehicle?.fuelType === "electric"
    ? defaultVehicle
    : vehicles.find((v) => v.fuelType === "electric");

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

  if (!hasEV) {
    return (
      <View style={[styles.container, { backgroundColor: ev.bg }]}>
        <EVAnimatedBackground isDark={isDark} />
        <LinearGradient
          colors={[...ev.topGradient]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.4 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.gateContainer, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + tabBarHeight + 20 }]}>
          <View style={styles.gateIconWrap}>
            <PulsingZapIcon ev={ev} />
          </View>
          <Animated.Text style={[styles.gateTitle, { color: ev.white }]}>EV Mode</Animated.Text>
          <Animated.Text style={[styles.gateSub, { color: ev.whiteDim }]}>
            Add an electric vehicle to your profile to unlock the full EV experience — battery monitoring, mobile charging, EV towing, range alerts, and more.
          </Animated.Text>
          <AnimatedGradientButton onPress={() => navigation.navigate("EVAddVehicle")} ev={ev} />
          <View style={styles.gateFeatures}>
            {[
              { icon: "battery-charging" as const, text: "Battery dashboard" },
              { icon: "zap" as const, text: "Mobile charging" },
              { icon: "truck" as const, text: "EV-safe towing" },
              { icon: "shield" as const, text: "Range alerts" },
            ].map((f, i) => (
              <View key={i} style={styles.gateFeatureRow}>
                <Feather name={f.icon} size={18} color={ev.neonGreen} />
                <Animated.Text style={[styles.gateFeatureText, { color: ev.whiteDim }]}>{f.text}</Animated.Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: ev.bg }]}>
      <EVAnimatedBackground isDark={isDark} />
      <LinearGradient
        colors={[...ev.topGradient]}
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
          <Animated.Text style={[styles.headerLabel, { color: ev.neonGreen }]}>EV MODE</Animated.Text>
          <View style={styles.headerTitleRow}>
            <Feather name="zap" size={26} color={ev.neonGreen} />
            <Animated.Text style={[styles.headerTitle, { color: ev.white }]}>Electric Hub</Animated.Text>
          </View>
          {evVehicle ? (
            <Animated.Text style={[styles.headerCar, { color: ev.whiteDim }]}>
              {evVehicle.year} {evVehicle.make} {evVehicle.model}
            </Animated.Text>
          ) : null}
        </View>

        <GlowCard glowColor={ev.neonGreen} ev={ev}>
          <View style={styles.batterySection}>
            <View style={styles.batteryRingContainer}>
              <PulseRing delay={0} ev={ev} />
              <PulseRing delay={800} ev={ev} />
              <View style={[styles.batteryCircle, { borderColor: ev.neonGreen + "60" }]}>
                <LinearGradient
                  colors={[ev.neonGreen + "25", ev.bgCard]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.batteryCircleInner}
                >
                  <Animated.Text style={[styles.batteryPercent, { color: ev.neonGreen }, scanStyle]}>
                    {batteryLevel}%
                  </Animated.Text>
                  <Animated.Text style={[styles.batteryLabel, { color: ev.whiteDim }]}>CHARGE</Animated.Text>
                </LinearGradient>
              </View>
            </View>
            <View style={styles.batteryStats}>
              <View style={styles.batteryStatItem}>
                <Feather name="navigation" size={16} color={ev.neonCyan} />
                <Animated.Text style={[styles.batteryStatValue, { color: ev.white }]}>{rangeEstimate} mi</Animated.Text>
                <Animated.Text style={[styles.batteryStatLabel, { color: ev.whiteDim }]}>Est. Range</Animated.Text>
              </View>
              <View style={[styles.batteryDivider, { backgroundColor: ev.border }]} />
              <View style={styles.batteryStatItem}>
                <Feather name="clock" size={16} color={ev.neonPurple} />
                <Animated.Text style={[styles.batteryStatValue, { color: ev.white }]}>1h 12m</Animated.Text>
                <Animated.Text style={[styles.batteryStatLabel, { color: ev.whiteDim }]}>To Full</Animated.Text>
              </View>
              <View style={[styles.batteryDivider, { backgroundColor: ev.border }]} />
              <View style={styles.batteryStatItem}>
                <Feather name="trending-up" size={16} color={ev.neonGreen} />
                <Animated.Text style={[styles.batteryStatValue, { color: ev.white }]}>3.8</Animated.Text>
                <Animated.Text style={[styles.batteryStatLabel, { color: ev.whiteDim }]}>mi/kWh</Animated.Text>
              </View>
            </View>
          </View>
        </GlowCard>

        <View style={styles.statsGrid}>
          <StatPill icon="battery-charging" value="Level 2" label="Last Charge" color={ev.neonGreen} ev={ev} />
          <StatPill icon="map-pin" value="0.4 mi" label="Nearest Charger" color={ev.neonCyan} ev={ev} />
          <StatPill icon="dollar-sign" value="$4.80" label="Est. Cost" color={ev.neonPurple} ev={ev} />
          <StatPill icon="thermometer" value="72F" label="Battery Temp" color={ev.neonBlue} ev={ev} />
        </View>

        <View style={styles.sectionHeader}>
          <Animated.Text style={[styles.sectionTitle, { color: ev.white }]}>Quick Actions</Animated.Text>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            icon="map-pin"
            label="Find Charger"
            color={ev.neonGreen}
            onPress={() => navigation.navigate("EVChargerMap")}
            ev={ev}
          />
          <QuickAction
            icon="zap"
            label="Mobile Charge"
            color={ev.neonCyan}
            onPress={() => navigation.navigate("EVMobileCharge")}
            ev={ev}
          />
          <QuickAction
            icon="truck"
            label="EV Tow"
            color={ev.neonPurple}
            onPress={() => navigation.navigate("EVTow")}
            ev={ev}
          />
          <QuickAction
            icon="tool"
            label="EV Diagnostic"
            color={ev.neonBlue}
            onPress={() => navigation.navigate("EVDiagnostic")}
            ev={ev}
          />
          <QuickAction
            icon="navigation"
            label="Trip Planner"
            color={ev.neonPink}
            ev={ev}
          />
          <QuickAction
            icon="shield"
            label="Range Alert"
            color={ev.neonGreenDim}
            onPress={() => navigation.navigate("EVRangeAlert")}
            ev={ev}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Animated.Text style={[styles.sectionTitle, { color: ev.white }]}>Nearby Chargers</Animated.Text>
          <Pressable onPress={() => navigation.navigate("EVChargerMap")}>
            <Animated.Text style={[styles.seeAll, { color: ev.neonCyan }]}>View Map</Animated.Text>
          </Pressable>
        </View>

        <GlowCard glowColor={ev.neonCyan} ev={ev}>
          <ChargingStation name="Volta Station - Downtown" distance="0.4 mi" chargerCount={8} speed="DC Fast" available={3} ev={ev} />
          <View style={[styles.stationSep, { backgroundColor: ev.border }]} />
          <ChargingStation name="ChargePoint - Oak Plaza" distance="1.2 mi" chargerCount={4} speed="Level 2" available={2} ev={ev} />
          <View style={[styles.stationSep, { backgroundColor: ev.border }]} />
          <ChargingStation name="Tesla Supercharger - Mall" distance="2.8 mi" chargerCount={12} speed="DC Fast" available={7} ev={ev} />
          <View style={[styles.stationSep, { backgroundColor: ev.border }]} />
          <ChargingStation name="EVgo - Gas Station" distance="3.1 mi" chargerCount={2} speed="DC Fast" available={0} ev={ev} />
        </GlowCard>

        <View style={styles.sectionHeader}>
          <Animated.Text style={[styles.sectionTitle, { color: ev.white }]}>EV Tips</Animated.Text>
        </View>

        <GlowCard glowColor={ev.neonPurple} style={{ marginBottom: 12 }} ev={ev}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: ev.neonPurple + "18" }]}>
              <Feather name="sun" size={20} color={ev.neonPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.tipTitle, { color: ev.white }]}>Precondition Your Battery</Animated.Text>
              <Animated.Text style={[styles.tipBody, { color: ev.whiteDim }]}>
                Warm up your battery before fast charging in cold weather. This can reduce charge time by up to 30%.
              </Animated.Text>
            </View>
          </View>
        </GlowCard>

        <GlowCard glowColor={ev.neonGreen} style={{ marginBottom: 12 }} ev={ev}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: ev.neonGreen + "18" }]}>
              <Feather name="zap" size={20} color={ev.neonGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.tipTitle, { color: ev.white }]}>Optimal Charge Range</Animated.Text>
              <Animated.Text style={[styles.tipBody, { color: ev.whiteDim }]}>
                Keep your battery between 20-80% for daily use. This extends battery lifespan and improves long-term performance.
              </Animated.Text>
            </View>
          </View>
        </GlowCard>

        <GlowCard glowColor={ev.neonCyan} ev={ev}>
          <View style={styles.tipCard}>
            <View style={[styles.tipIcon, { backgroundColor: ev.neonCyan + "18" }]}>
              <Feather name="wind" size={20} color={ev.neonCyan} />
            </View>
            <View style={{ flex: 1 }}>
              <Animated.Text style={[styles.tipTitle, { color: ev.white }]}>Regenerative Braking</Animated.Text>
              <Animated.Text style={[styles.tipBody, { color: ev.whiteDim }]}>
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
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 5,
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerCar: {
    fontSize: 16,
    marginTop: 4,
  },
  glowCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  batterySection: {
    alignItems: "center",
  },
  batteryRingContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  batteryCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    overflow: "hidden",
  },
  batteryCircleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  batteryPercent: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
  },
  batteryLabel: {
    fontSize: 11,
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
    fontSize: 18,
    fontWeight: "700",
  },
  batteryStatLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  batteryDivider: {
    width: 1,
    height: 40,
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
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    width: (SCREEN_WIDTH - 50) / 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 26,
  },
  quickAction: {
    width: (SCREEN_WIDTH - 60) / 3,
  },
  quickActionGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: "center",
  },
  quickActionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  stationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: "600",
  },
  stationMeta: {
    fontSize: 13,
    marginTop: 2,
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
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  tipBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  gateIconWrap: {
    marginBottom: 32,
  },
  gateTitle: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  gateSub: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 36,
  },
  gateButton: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 40,
    width: "100%",
  },
  gateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    borderRadius: 18,
  },
  gateButtonText: {
    color: "#000",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  gateFeatures: {
    gap: 18,
  },
  gateFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  gateFeatureText: {
    fontSize: 17,
  },
});
