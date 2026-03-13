import React, { useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAX_RING_SIZE = SCREEN_WIDTH * 0.78;
const RING_CYCLE = 3600;

interface RibbonConfig {
  colors: [string, string];
  yPosition: number;
  height: number;
  driftY: number;
  driftX: number;
  duration: number;
  delay: number;
  opacityRange: [number, number];
}

const BASE_RIBBON_CONFIGS: RibbonConfig[] = [
  { colors: ["#00D9FF", "#0088CC"], yPosition: 0.10, height: 110, driftY: 38, driftX: 22, duration: 7200, delay: 0,    opacityRange: [0.10, 0.28] },
  { colors: ["#FF6B35", "#FF3D00"], yPosition: 0.26, height: 85,  driftY: 52, driftX: 18, duration: 9400, delay: 600,  opacityRange: [0.08, 0.22] },
  { colors: ["#7B2FFF", "#4800FF"], yPosition: 0.43, height: 130, driftY: 44, driftX: 30, duration: 8100, delay: 1400, opacityRange: [0.09, 0.24] },
  { colors: ["#FF6B35", "#FF8C5A"], yPosition: 0.58, height: 90,  driftY: 36, driftX: 16, duration: 10200, delay: 400, opacityRange: [0.08, 0.20] },
  { colors: ["#00D9FF", "#00FFD4"], yPosition: 0.73, height: 105, driftY: 48, driftX: 25, duration: 8800, delay: 1100, opacityRange: [0.09, 0.22] },
  { colors: ["#7B2FFF", "#00D9FF"], yPosition: 0.88, height: 75,  driftY: 30, driftX: 14, duration: 7600, delay: 900,  opacityRange: [0.07, 0.18] },
];

function AuroraRibbon({ config }: { config: RibbonConfig }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(config.opacityRange[0]);

  useEffect(() => {
    const timer = setTimeout(() => {
      translateY.value = withRepeat(
        withSequence(
          withTiming(config.driftY, { duration: config.duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(-config.driftY, { duration: config.duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      translateX.value = withRepeat(
        withSequence(
          withTiming(config.driftX, { duration: config.duration * 1.4, easing: Easing.inOut(Easing.sin) }),
          withTiming(-config.driftX, { duration: config.duration * 1.4, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(config.opacityRange[1], { duration: config.duration * 0.65, easing: Easing.inOut(Easing.sin) }),
          withTiming(config.opacityRange[0], { duration: config.duration * 0.65, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }, config.delay);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: -SCREEN_WIDTH * 0.12,
          top: config.yPosition * SCREEN_HEIGHT - config.height / 2,
          width: SCREEN_WIDTH * 1.24,
          height: config.height,
        },
        animStyle,
      ]}
    >
      <LinearGradient
        colors={["transparent", config.colors[0], config.colors[1], config.colors[0], "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

function PulsingRing({ delay, color }: { delay: number; color: string }) {
  const scale = useSharedValue(0.04);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(0.04, { duration: 0 }),
          withTiming(1, { duration: RING_CYCLE, easing: Easing.out(Easing.cubic) })
        ),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.32, { duration: 180 }),
          withTiming(0, { duration: RING_CYCLE - 180, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: MAX_RING_SIZE,
          height: MAX_RING_SIZE,
          borderRadius: MAX_RING_SIZE / 2,
          borderWidth: 1.5,
          borderColor: color,
          position: "absolute",
        },
        animStyle,
      ]}
    />
  );
}

function PulsingRings({ color }: { color: string }) {
  const interval = Math.round(RING_CYCLE / 3);
  return (
    <View style={styles.ringsContainer}>
      <PulsingRing delay={0} color={color} />
      <PulsingRing delay={interval} color={color} />
      <PulsingRing delay={interval * 2} color={color} />
    </View>
  );
}

function RibbonLayer({ configs, layerOpacity, ringColor }: {
  configs: RibbonConfig[];
  layerOpacity: SharedValue<number>;
  ringColor: string;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: layerOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]}>
      <PulsingRings color={ringColor} />
      {configs.map((config, index) => (
        <AuroraRibbon key={`${index}-${config.colors.join()}`} config={config} />
      ))}
    </Animated.View>
  );
}

export const DARK_BG = "#060918";
export const LIGHT_BG = "#EFF6FF";

interface AnimatedBackgroundProps {
  customColors?: string[][];
  opacityBoost?: number;
  flashColor?: string;
  isDark?: boolean;
}

export default function AnimatedBackground({
  customColors,
  opacityBoost = 1,
  flashColor = "#FFFFFF",
  isDark = true,
}: AnimatedBackgroundProps) {
  const colorsKey = customColors ? customColors.map(c => c.join()).join("|") : "default";
  const [activeLayer, setActiveLayer] = useState<"a" | "b">("a");
  const [layerAColors, setLayerAColors] = useState(customColors);
  const [layerABoost, setLayerABoost] = useState(opacityBoost);
  const [layerBColors, setLayerBColors] = useState(customColors);
  const [layerBBoost, setLayerBBoost] = useState(opacityBoost);
  const layerAOpacity = useSharedValue(1);
  const layerBOpacity = useSharedValue(0);
  const prevColorsRef = useRef(colorsKey);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prevColorsRef.current === colorsKey) return;
    prevColorsRef.current = colorsKey;

    if (activeLayer === "a") {
      setLayerBColors(customColors);
      setLayerBBoost(opacityBoost);
      layerBOpacity.value = 0;
      layerBOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) });
      layerAOpacity.value = withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) });
      setTimeout(() => setActiveLayer("b"), 850);
    } else {
      setLayerAColors(customColors);
      setLayerABoost(opacityBoost);
      layerAOpacity.value = 0;
      layerAOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) });
      layerBOpacity.value = withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) });
      setTimeout(() => setActiveLayer("a"), 850);
    }
  }, [colorsKey]);

  const buildConfigs = (colors: string[][] | undefined, boost: number): RibbonConfig[] => {
    if (!colors) return BASE_RIBBON_CONFIGS;
    return BASE_RIBBON_CONFIGS.map((config, i) => {
      const pair = colors[i % colors.length];
      return {
        ...config,
        colors: [pair[0], pair[1] ?? pair[0]] as [string, string],
        opacityRange: [
          Math.min(config.opacityRange[0] * boost, 0.5),
          Math.min(config.opacityRange[1] * boost, 0.7),
        ] as [number, number],
      };
    });
  };

  const configsA = useMemo(() => buildConfigs(layerAColors, layerABoost), [layerAColors, layerABoost]);
  const configsB = useMemo(() => buildConfigs(layerBColors, layerBBoost), [layerBColors, layerBBoost]);

  const ringColorA = layerAColors ? layerAColors[0][0] : "#00D9FF";
  const ringColorB = layerBColors ? layerBColors[0][0] : "#00D9FF";

  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      <RibbonLayer configs={configsA} layerOpacity={layerAOpacity} ringColor={ringColorA} />
      <RibbonLayer configs={configsB} layerOpacity={layerBOpacity} ringColor={ringColorB} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ringsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
