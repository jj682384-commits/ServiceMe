import React, { useEffect } from "react";
import { StyleSheet, Dimensions } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const LOGO = width * 0.58;
const RING = width * 0.72;

// Constellation stars — spread around the screen edges
const STARS: { x: number; y: number; r: number; a: number; d: number }[] = [
  { x: 0.08, y: 0.10, r: 1.8, a: 0.55, d: 60  },
  { x: 0.88, y: 0.08, r: 1.1, a: 0.35, d: 120 },
  { x: 0.94, y: 0.38, r: 1.5, a: 0.45, d: 180 },
  { x: 0.90, y: 0.76, r: 1.0, a: 0.30, d: 90  },
  { x: 0.72, y: 0.92, r: 1.7, a: 0.48, d: 150 },
  { x: 0.35, y: 0.94, r: 1.2, a: 0.38, d: 210 },
  { x: 0.06, y: 0.80, r: 1.6, a: 0.42, d: 80  },
  { x: 0.04, y: 0.44, r: 1.0, a: 0.28, d: 160 },
  { x: 0.18, y: 0.06, r: 1.4, a: 0.40, d: 100 },
  { x: 0.55, y: 0.04, r: 1.1, a: 0.32, d: 200 },
  { x: 0.62, y: 0.88, r: 0.9, a: 0.25, d: 240 },
  { x: 0.46, y: 0.97, r: 1.3, a: 0.36, d: 130 },
];

// Five rapid shockwave rings — spaced 45ms apart
const SHOCKWAVE_DELAYS = [460, 505, 550, 595, 640];

function StarDot({ x, y, r, a, d }: typeof STARS[0]) {
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(d, withTiming(a, { duration: 460 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      style={[styles.star, style, {
        width: r * 2, height: r * 2, borderRadius: r,
        left: width * x - r, top: height * y - r,
      }]}
    />
  );
}

function ShockRing({ delay }: { delay: number }) {
  const scale = useSharedValue(0.05);
  const op    = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withTiming(1.5, { duration: 640, easing: Easing.out(Easing.cubic) }));
    op.value    = withDelay(delay, withSequence(
      withTiming(0.65, { duration: 60  }),
      withTiming(0,    { duration: 560 }),
    ));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.shockRing, style]} />;
}

export function SplashAnimation({ onFinish }: Props) {
  // Logo: rises from below + visible spring bounce
  const logoScale     = useSharedValue(0.62);
  const logoOpacity   = useSharedValue(0);
  const logoTranslateY = useSharedValue(22);

  // Soft chrome aura behind the logo
  const auraOpacity = useSharedValue(0);
  const auraScale   = useSharedValue(0.4);

  // Lens-flare shimmer: thin horizontal bar across logo
  const flareOpacity = useSharedValue(0);

  // Fade the whole overlay out
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    // Aura blooms in just before logo
    auraOpacity.value = withTiming(0.18, { duration: 600 });
    auraScale.value   = withSpring(1, { damping: 18, stiffness: 50 });

    // Logo lands with visible bounce — damping 7 gives a noticeable overshoot
    logoOpacity.value   = withTiming(1, { duration: 380 });
    logoScale.value     = withSpring(1, { damping: 7, stiffness: 70, mass: 0.9 });
    logoTranslateY.value = withSpring(0, { damping: 9, stiffness: 68, mass: 0.85 });

    // Lens flare sweeps at peak of logo bounce
    flareOpacity.value = withDelay(420, withSequence(
      withTiming(0.22, { duration: 80  }),
      withTiming(0,    { duration: 200 }),
    ));

    // Fade out — logo drifts in very slightly as it disappears
    containerOpacity.value = withDelay(
      1480,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, []);

  const containerStyle  = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle       = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));
  const auraStyle  = useAnimatedStyle(() => ({ opacity: auraOpacity.value, transform: [{ scale: auraScale.value }] }));
  const flareStyle = useAnimatedStyle(() => ({ opacity: flareOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* Constellation stars */}
      {STARS.map((s, i) => <StarDot key={i} {...s} />)}

      {/* Chrome aura behind logo */}
      <Animated.View style={[styles.aura, auraStyle]} />

      {/* Five rapid shockwave rings */}
      {SHOCKWAVE_DELAYS.map((d, i) => <ShockRing key={i} delay={d} />)}

      {/* Logo */}
      <Animated.Image
        source={require("../../assets/images/resqride-logo-dark.png")}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />

      {/* Lens flare shimmer */}
      <Animated.View style={[styles.flare, flareStyle]} pointerEvents="none" />

    </Animated.View>
  );
}

interface Props { onFinish: () => void; }

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  aura: {
    position: "absolute",
    width: RING * 1.3,
    height: RING * 1.3,
    borderRadius: RING * 0.65,
    backgroundColor: "transparent",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 72,
  },
  shockRing: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: "rgba(200,200,200,0.7)",
    shadowColor: "#C0C0C0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
  flare: {
    position: "absolute",
    width: LOGO * 1.1,
    height: 2.5,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
});
