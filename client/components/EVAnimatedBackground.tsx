import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SW, height: SH } = Dimensions.get("window");

interface EVOrbConfig {
  size: number;
  colors: string[];
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
  shape?: "circle" | "streak";
}

const EV_ORB_CONFIGS: EVOrbConfig[] = [
  { size: 260, colors: ["#00FF88", "#00CC6A"], startX: -40, startY: SH * 0.08, driftX: 130, driftY: -35, duration: 5500, delay: 0, opacityRange: [0.04, 0.12] },
  { size: 200, colors: ["#00E5FF", "#0088CC"], startX: SW - 30, startY: SH * 0.35, driftX: -120, driftY: 60, duration: 6200, delay: 400, opacityRange: [0.03, 0.10] },
  { size: 180, colors: ["#B44DFF", "#7C3AED"], startX: SW * 0.3, startY: SH * 0.7, driftX: 80, driftY: -90, duration: 7000, delay: 1000, opacityRange: [0.03, 0.09] },
  { size: 140, colors: ["#4D7CFF", "#00E5FF"], startX: SW * 0.7, startY: SH * 0.12, driftX: -70, driftY: 80, duration: 5800, delay: 600, opacityRange: [0.03, 0.08] },
  { size: 300, colors: ["#00FF88", "#00E5FF"], startX: SW * 0.1, startY: SH * 0.5, driftX: 90, driftY: 50, duration: 8000, delay: 1400, opacityRange: [0.02, 0.07] },
  { size: 160, colors: ["#B44DFF", "#FF4DA6"], startX: SW * 0.55, startY: SH * 0.85, driftX: -60, driftY: -70, duration: 6500, delay: 800, opacityRange: [0.02, 0.06] },
  { size: 120, colors: ["#00FF88", "#4D7CFF"], startX: SW * 0.8, startY: SH * 0.55, driftX: -50, driftY: -40, duration: 4800, delay: 200, opacityRange: [0.03, 0.08] },
];

interface ScanLineConfig {
  startY: number;
  duration: number;
  delay: number;
  width: number;
}

const SCAN_LINES: ScanLineConfig[] = [
  { startY: SH * 0.15, duration: 6000, delay: 0, width: SW * 0.7 },
  { startY: SH * 0.45, duration: 7500, delay: 2000, width: SW * 0.5 },
  { startY: SH * 0.75, duration: 5500, delay: 3500, width: SW * 0.6 },
];

function EVOrb({ config }: { config: EVOrbConfig }) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration * 0.45, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration * 0.45, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, config.driftX * 0.6, config.driftX, 0]);
    const translateY = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, config.driftY * 0.6, config.driftY, 0]);
    const opacity = interpolate(pulse.value, [0, 1], [config.opacityRange[0], config.opacityRange[1]]);
    const scale = interpolate(pulse.value, [0, 1], [0.8, 1.2]);

    return {
      transform: [{ translateX }, { translateY }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: config.startX - config.size / 2,
          top: config.startY - config.size / 2,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          overflow: "hidden",
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: config.size, height: config.size, borderRadius: config.size / 2 }}
      />
    </Animated.View>
  );
}

function ScanLine({ config }: { config: ScanLineConfig }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      sweep.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sweep.value, [0, 1], [-config.width, SW + config.width]);
    const opacity = interpolate(sweep.value, [0, 0.3, 0.7, 1], [0, 0.06, 0.06, 0]);

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: config.startY,
          left: 0,
          width: config.width,
          height: 1,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={["transparent", "#00FF8840", "#00E5FF60", "#00FF8840", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: config.width, height: 1 }}
      />
    </Animated.View>
  );
}

function GridPulse() {
  const gridOpacity = useSharedValue(0);

  useEffect(() => {
    gridOpacity.value = withRepeat(
      withSequence(
        withDelay(1000, withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) })),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(gridOpacity.value, [0, 1], [0.01, 0.04]),
  }));

  const lines = [];
  const spacing = 60;
  for (let i = 0; i < Math.ceil(SW / spacing); i++) {
    lines.push(
      <View
        key={`v-${i}`}
        style={{
          position: "absolute",
          left: i * spacing,
          top: 0,
          width: 1,
          height: SH,
          backgroundColor: "#00FF88",
        }}
      />
    );
  }
  for (let i = 0; i < Math.ceil(SH / spacing); i++) {
    lines.push(
      <View
        key={`h-${i}`}
        style={{
          position: "absolute",
          left: 0,
          top: i * spacing,
          width: SW,
          height: 1,
          backgroundColor: "#00E5FF",
        }}
      />
    );
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle]}>
      {lines}
    </Animated.View>
  );
}

export default function EVAnimatedBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden", pointerEvents: "none" }]}>
      <GridPulse />
      {EV_ORB_CONFIGS.map((config, index) => (
        <EVOrb key={index} config={config} />
      ))}
      {SCAN_LINES.map((config, index) => (
        <ScanLine key={`scan-${index}`} config={config} />
      ))}
    </View>
  );
}
