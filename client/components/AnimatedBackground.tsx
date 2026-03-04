import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions, Image } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOGO_SIZE = SCREEN_WIDTH * 1.2;

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

const BASE_ORB_CONFIGS: OrbConfig[] = [
  { size: 320, colors: ["#00D9FF", "#0088CC"], startX: -60, startY: SCREEN_HEIGHT * 0.12, driftX: 100, driftY: -45, duration: 7000, delay: 0, opacityRange: [0.12, 0.28] },
  { size: 240, colors: ["#FF6B35", "#FF3D00"], startX: SCREEN_WIDTH - 60, startY: SCREEN_HEIGHT * 0.5, driftX: -90, driftY: 55, duration: 9000, delay: 800, opacityRange: [0.10, 0.24] },
  { size: 200, colors: ["#7B2FFF", "#4800FF"], startX: SCREEN_WIDTH * 0.4, startY: SCREEN_HEIGHT * 0.78, driftX: 65, driftY: -75, duration: 10000, delay: 1500, opacityRange: [0.10, 0.22] },
  { size: 160, colors: ["#FF6B35", "#FF8C5A"], startX: SCREEN_WIDTH * 0.6, startY: SCREEN_HEIGHT * 0.1, driftX: -55, driftY: 65, duration: 8000, delay: 500, opacityRange: [0.10, 0.20] },
  { size: 280, colors: ["#00D9FF", "#00FFD4"], startX: SCREEN_WIDTH * 0.05, startY: SCREEN_HEIGHT * 0.42, driftX: 70, driftY: 45, duration: 11000, delay: 1200, opacityRange: [0.08, 0.20] },
  { size: 180, colors: ["#7B2FFF", "#00D9FF"], startX: SCREEN_WIDTH * 0.5, startY: SCREEN_HEIGHT * 0.3, driftX: -50, driftY: -40, duration: 8500, delay: 2000, opacityRange: [0.08, 0.18] },
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
export const LIGHT_BG = "#EFF6FF";

function RotatingLogo({ isDark = true }: { isDark?: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 30000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 360])}deg` }],
  }));

  return (
    <View style={styles.logoContainer}>
      <Animated.View style={animStyle}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={[styles.logo, { opacity: isDark ? 0.04 : 0.06 }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

function TransitionFlash({ flashColor, trigger }: { flashColor: string; trigger: number }) {
  const flashOpacity = useSharedValue(0);
  const flashScale = useSharedValue(0.3);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (trigger > 0) {
      flashOpacity.value = 0.6;
      flashScale.value = 0.3;
      ringScale.value = 0;
      ringOpacity.value = 0.8;

      flashOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
      flashScale.value = withSpring(2.5, { damping: 12, stiffness: 80 });

      ringScale.value = withTiming(3, { duration: 600, easing: Easing.out(Easing.cubic) });
      ringOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
    }
  }, [trigger]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <>
      <Animated.View
        style={[
          styles.flashOverlay,
          { backgroundColor: flashColor },
          flashStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.flashRing,
          { borderColor: flashColor },
          ringStyle,
        ]}
      />
    </>
  );
}

interface AnimatedBackgroundProps {
  customColors?: string[][];
  opacityBoost?: number;
  flashColor?: string;
  isDark?: boolean;
}

export default function AnimatedBackground({ customColors, opacityBoost = 1, flashColor = "#FFFFFF", isDark = true }: AnimatedBackgroundProps) {
  const [flashTrigger, setFlashTrigger] = useState(0);
  const prevColorsRef = useRef<string | undefined>(undefined);

  const colorsKey = customColors ? customColors.map(c => c.join()).join("|") : "default";

  useEffect(() => {
    if (prevColorsRef.current !== undefined && prevColorsRef.current !== colorsKey) {
      setFlashTrigger(prev => prev + 1);
    }
    prevColorsRef.current = colorsKey;
  }, [colorsKey]);

  const configs = customColors
    ? BASE_ORB_CONFIGS.map((config, i) => ({
        ...config,
        colors: customColors[i % customColors.length],
        opacityRange: [
          Math.min(config.opacityRange[0] * opacityBoost, 0.5),
          Math.min(config.opacityRange[1] * opacityBoost, 0.7),
        ] as [number, number],
      }))
    : BASE_ORB_CONFIGS;

  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      <RotatingLogo isDark={isDark} />
      {configs.map((config, index) => (
        <FloatingOrb key={`${index}-${config.colors.join()}`} config={config} />
      ))}
      <TransitionFlash flashColor={flashColor} trigger={flashTrigger} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  logoContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  flashOverlay: {
    position: "absolute",
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    borderRadius: SCREEN_WIDTH,
    left: -SCREEN_WIDTH * 0.5,
    top: SCREEN_HEIGHT * 0.5 - SCREEN_WIDTH,
  },
  flashRing: {
    position: "absolute",
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    borderWidth: 3,
    left: SCREEN_WIDTH * 0.1,
    top: SCREEN_HEIGHT * 0.5 - SCREEN_WIDTH * 0.4,
    backgroundColor: "transparent",
  },
});
