import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface OrbConfig {
  size: number;
  colors: string[];
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
}

const ORB_CONFIGS: OrbConfig[] = [
  { size: 320, colors: ["#00D9FF", "#0088CC"], startX: -60, startY: SCREEN_HEIGHT * 0.12, driftX: 100, driftY: -45, duration: 7000, delay: 0, opacityRange: [0.04, 0.1] },
  { size: 240, colors: ["#FF6B35", "#FF3D00"], startX: SCREEN_WIDTH - 60, startY: SCREEN_HEIGHT * 0.5, driftX: -90, driftY: 55, duration: 9000, delay: 800, opacityRange: [0.03, 0.08] },
  { size: 200, colors: ["#7B2FFF", "#4800FF"], startX: SCREEN_WIDTH * 0.4, startY: SCREEN_HEIGHT * 0.78, driftX: 65, driftY: -75, duration: 10000, delay: 1500, opacityRange: [0.03, 0.07] },
  { size: 160, colors: ["#FF6B35", "#FF8C5A"], startX: SCREEN_WIDTH * 0.6, startY: SCREEN_HEIGHT * 0.1, driftX: -55, driftY: 65, duration: 8000, delay: 500, opacityRange: [0.03, 0.06] },
  { size: 280, colors: ["#00D9FF", "#00FFD4"], startX: SCREEN_WIDTH * 0.05, startY: SCREEN_HEIGHT * 0.42, driftX: 70, driftY: 45, duration: 11000, delay: 1200, opacityRange: [0.02, 0.06] },
  { size: 180, colors: ["#7B2FFF", "#00D9FF"], startX: SCREEN_WIDTH * 0.5, startY: SCREEN_HEIGHT * 0.3, driftX: -50, driftY: -40, duration: 8500, delay: 2000, opacityRange: [0.02, 0.05] },
];

function FloatingOrb({ config }: { config: OrbConfig }) {
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
          withTiming(1, { duration: config.duration * 0.6, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: config.duration * 0.6, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 0.5, 1], [0, config.driftX, 0]);
    const translateY = interpolate(progress.value, [0, 0.5, 1], [0, config.driftY, 0]);
    const opacity = interpolate(pulse.value, [0, 1], [config.opacityRange[0], config.opacityRange[1]]);
    const scale = interpolate(pulse.value, [0, 1], [0.85, 1.15]);

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

export const DARK_BG = "#060918";

export default function AnimatedBackground() {
  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      {ORB_CONFIGS.map((config, index) => (
        <FloatingOrb key={index} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
