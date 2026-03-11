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
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SW, height: SH } = Dimensions.get("window");

type ShapeType = "diamond" | "hexagon" | "streak" | "triangle" | "pill";

interface EVShapeConfig {
  width: number;
  height: number;
  shape: ShapeType;
  colors: string[];
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
  rotation?: number;
}

const EV_SHAPE_CONFIGS_DARK: EVShapeConfig[] = [
  { width: 220, height: 220, shape: "diamond", colors: ["#00FF88", "#00CC6A"], startX: -20, startY: SH * 0.08, driftX: 160, driftY: -40, duration: 3800, delay: 0, opacityRange: [0.04, 0.13], rotation: 45 },
  { width: 280, height: 40, shape: "streak", colors: ["#00E5FF", "#0088CC"], startX: SW + 50, startY: SH * 0.28, driftX: -SW - 100, driftY: 30, duration: 3200, delay: 300, opacityRange: [0.03, 0.10] },
  { width: 180, height: 200, shape: "hexagon", colors: ["#B44DFF", "#7C3AED"], startX: SW * 0.25, startY: SH * 0.65, driftX: 100, driftY: -110, duration: 4200, delay: 700, opacityRange: [0.03, 0.10] },
  { width: 160, height: 160, shape: "triangle", colors: ["#4D7CFF", "#00E5FF"], startX: SW * 0.75, startY: SH * 0.1, driftX: -90, driftY: 100, duration: 3600, delay: 400, opacityRange: [0.03, 0.09] },
  { width: 320, height: 50, shape: "streak", colors: ["#00FF88", "#00E5FF"], startX: -100, startY: SH * 0.5, driftX: SW + 200, driftY: 20, duration: 2800, delay: 1200, opacityRange: [0.02, 0.08] },
  { width: 140, height: 140, shape: "diamond", colors: ["#B44DFF", "#FF4DA6"], startX: SW * 0.6, startY: SH * 0.82, driftX: -80, driftY: -90, duration: 3500, delay: 500, opacityRange: [0.03, 0.08], rotation: 30 },
  { width: 200, height: 60, shape: "pill", colors: ["#00FF88", "#4D7CFF"], startX: SW * 0.8, startY: SH * 0.42, driftX: -130, driftY: -50, duration: 3000, delay: 200, opacityRange: [0.03, 0.09] },
  { width: 150, height: 170, shape: "hexagon", colors: ["#00E5FF", "#B44DFF"], startX: SW * 0.05, startY: SH * 0.35, driftX: 110, driftY: 70, duration: 4000, delay: 900, opacityRange: [0.02, 0.07] },
  { width: 240, height: 35, shape: "streak", colors: ["#B44DFF", "#00E5FF"], startX: SW * 0.3, startY: SH * 0.9, driftX: -SW * 0.6, driftY: -15, duration: 2600, delay: 1600, opacityRange: [0.02, 0.07] },
];

const EV_SHAPE_CONFIGS_LIGHT: EVShapeConfig[] = [
  { width: 220, height: 220, shape: "diamond", colors: ["#6EE7B7", "#34D399"], startX: -20, startY: SH * 0.08, driftX: 160, driftY: -40, duration: 3800, delay: 0, opacityRange: [0.08, 0.20], rotation: 45 },
  { width: 280, height: 40, shape: "streak", colors: ["#67E8F9", "#22D3EE"], startX: SW + 50, startY: SH * 0.28, driftX: -SW - 100, driftY: 30, duration: 3200, delay: 300, opacityRange: [0.06, 0.16] },
  { width: 180, height: 200, shape: "hexagon", colors: ["#C4B5FD", "#A78BFA"], startX: SW * 0.25, startY: SH * 0.65, driftX: 100, driftY: -110, duration: 4200, delay: 700, opacityRange: [0.06, 0.15] },
  { width: 160, height: 160, shape: "triangle", colors: ["#93C5FD", "#60A5FA"], startX: SW * 0.75, startY: SH * 0.1, driftX: -90, driftY: 100, duration: 3600, delay: 400, opacityRange: [0.06, 0.14] },
  { width: 320, height: 50, shape: "streak", colors: ["#6EE7B7", "#67E8F9"], startX: -100, startY: SH * 0.5, driftX: SW + 200, driftY: 20, duration: 2800, delay: 1200, opacityRange: [0.05, 0.12] },
  { width: 140, height: 140, shape: "diamond", colors: ["#C4B5FD", "#F9A8D4"], startX: SW * 0.6, startY: SH * 0.82, driftX: -80, driftY: -90, duration: 3500, delay: 500, opacityRange: [0.06, 0.14], rotation: 30 },
  { width: 200, height: 60, shape: "pill", colors: ["#6EE7B7", "#93C5FD"], startX: SW * 0.8, startY: SH * 0.42, driftX: -130, driftY: -50, duration: 3000, delay: 200, opacityRange: [0.06, 0.14] },
  { width: 150, height: 170, shape: "hexagon", colors: ["#67E8F9", "#C4B5FD"], startX: SW * 0.05, startY: SH * 0.35, driftX: 110, driftY: 70, duration: 4000, delay: 900, opacityRange: [0.05, 0.12] },
  { width: 240, height: 35, shape: "streak", colors: ["#C4B5FD", "#67E8F9"], startX: SW * 0.3, startY: SH * 0.9, driftX: -SW * 0.6, driftY: -15, duration: 2600, delay: 1600, opacityRange: [0.05, 0.12] },
];

interface ScanLineConfig {
  startY: number;
  duration: number;
  delay: number;
  width: number;
}

const SCAN_LINES: ScanLineConfig[] = [
  { startY: SH * 0.12, duration: 3500, delay: 0, width: SW * 0.8 },
  { startY: SH * 0.38, duration: 4200, delay: 1200, width: SW * 0.6 },
  { startY: SH * 0.65, duration: 3000, delay: 2500, width: SW * 0.7 },
  { startY: SH * 0.88, duration: 3800, delay: 800, width: SW * 0.5 },
];

function ShapeInner({ shape, width, height, colors }: { shape: ShapeType; width: number; height: number; colors: string[] }) {
  if (shape === "diamond") {
    return (
      <View style={{ width, height, transform: [{ rotate: "45deg" }], overflow: "hidden" }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width, height }} />
      </View>
    );
  }
  if (shape === "streak") {
    return (
      <LinearGradient
        colors={["transparent", colors[0], colors[1], "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width, height, borderRadius: height / 2 }}
      />
    );
  }
  if (shape === "triangle") {
    return (
      <View style={{ width: 0, height: 0, borderLeftWidth: width / 2, borderRightWidth: width / 2, borderBottomWidth: height, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors[0], opacity: 0.7 }} />
    );
  }
  if (shape === "pill") {
    return (
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width, height, borderRadius: height / 2 }} />
    );
  }
  if (shape === "hexagon") {
    const s = Math.min(width, height);
    return (
      <View style={{ width: s, height: s, overflow: "hidden", transform: [{ rotate: "30deg" }] }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: s, height: s, borderRadius: s * 0.22 }} />
      </View>
    );
  }
  return null;
}

function EVShape({ config }: { config: EVShapeConfig }) {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: config.duration, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        false
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: config.duration * 0.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration * 0.4, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
      cancelAnimation(pulse);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 0.25, 0.75, 1], [0, config.driftX * 0.4, config.driftX, 0]);
    const translateY = interpolate(progress.value, [0, 0.25, 0.75, 1], [0, config.driftY * 0.4, config.driftY, 0]);
    const opacity = interpolate(pulse.value, [0, 1], [config.opacityRange[0], config.opacityRange[1]]);
    const scale = interpolate(pulse.value, [0, 1], [0.85, 1.15]);
    const rotate = config.rotation
      ? interpolate(progress.value, [0, 1], [0, config.rotation])
      : 0;

    return {
      transform: [{ translateX }, { translateY }, { scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: config.startX - config.width / 2,
          top: config.startY - config.height / 2,
          width: config.width,
          height: config.height,
          alignItems: "center",
          justifyContent: "center",
        },
        animatedStyle,
      ]}
    >
      <ShapeInner shape={config.shape} width={config.width} height={config.height} colors={config.colors} />
    </Animated.View>
  );
}

function ScanLine({ config, isDark = true }: { config: ScanLineConfig; isDark?: boolean }) {
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
    return () => {
      clearTimeout(timer);
      cancelAnimation(sweep);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(sweep.value, [0, 1], [-config.width, SW + config.width]);
    const maxOpacity = isDark ? 0.08 : 0.12;
    const opacity = interpolate(sweep.value, [0, 0.2, 0.8, 1], [0, maxOpacity, maxOpacity, 0]);

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  const scanColors = isDark
    ? ["transparent", "#00FF8850", "#00E5FF70", "#B44DFF50", "transparent"]
    : ["transparent", "#05966940", "#0891B250", "#8B5CF640", "transparent"];

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: config.startY,
          left: 0,
          width: config.width,
          height: 2,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={scanColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: config.width, height: 2 }}
      />
    </Animated.View>
  );
}

function GridPulse({ isDark = true }: { isDark?: boolean }) {
  const gridOpacity = useSharedValue(0);

  useEffect(() => {
    gridOpacity.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(gridOpacity);
  }, []);

  const maxOpacity = isDark ? 0.05 : 0.06;
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(gridOpacity.value, [0, 1], [isDark ? 0.01 : 0.02, maxOpacity]),
  }));

  const vColor = isDark ? "#00FF88" : "#059669";
  const hColor = isDark ? "#00E5FF" : "#0891B2";

  const lines = [];
  const spacing = 50;
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
          backgroundColor: vColor,
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
          backgroundColor: hColor,
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

export default function EVAnimatedBackground({ isDark = true }: { isDark?: boolean }) {
  const configs = isDark ? EV_SHAPE_CONFIGS_DARK : EV_SHAPE_CONFIGS_LIGHT;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden", pointerEvents: "none" }]}>
      <GridPulse isDark={isDark} />
      {configs.map((config, index) => (
        <EVShape key={`${isDark ? "d" : "l"}-${index}`} config={config} />
      ))}
      {SCAN_LINES.map((config, index) => (
        <ScanLine key={`scan-${index}`} config={config} isDark={isDark} />
      ))}
    </View>
  );
}
