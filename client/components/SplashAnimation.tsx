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
const RING = width * 0.78;
const LOGO = width * 0.54;

// Fixed star positions matching the constellation aesthetic
const STARS = [
  { x: 0.12, y: 0.18, r: 1.6, a: 0.50, delay: 80  },
  { x: 0.83, y: 0.14, r: 1.0, a: 0.30, delay: 160 },
  { x: 0.76, y: 0.72, r: 1.8, a: 0.45, delay: 240 },
  { x: 0.22, y: 0.76, r: 1.2, a: 0.35, delay: 140 },
  { x: 0.91, y: 0.42, r: 1.0, a: 0.25, delay: 300 },
  { x: 0.08, y: 0.58, r: 1.4, a: 0.40, delay: 200 },
  { x: 0.60, y: 0.12, r: 1.1, a: 0.28, delay: 110 },
  { x: 0.38, y: 0.86, r: 1.6, a: 0.38, delay: 260 },
  { x: 0.48, y: 0.22, r: 0.9, a: 0.22, delay: 340 },
  { x: 0.68, y: 0.88, r: 1.2, a: 0.32, delay: 190 },
];

interface Props {
  onFinish: () => void;
}

function StarDot({ x, y, r, a, delay }: typeof STARS[0]) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(a, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        styles.star,
        style,
        {
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          left: width * x - r,
          top: height * y - r,
        },
      ]}
    />
  );
}

export function SplashAnimation({ onFinish }: Props) {
  const logoScale        = useSharedValue(0.60);
  const logoOpacity      = useSharedValue(0);
  const ringScale        = useSharedValue(0.10);
  const ringOpacity      = useSharedValue(0);
  const ring2Scale       = useSharedValue(0.10);
  const ring2Opacity     = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    // Logo springs in
    logoOpacity.value = withTiming(1, { duration: 420 });
    logoScale.value   = withSpring(1, { damping: 12, stiffness: 72, mass: 0.85 });

    // Inner chrome ring expands and dissolves
    ringOpacity.value = withDelay(320, withSequence(
      withTiming(0.55, { duration: 120 }),
      withTiming(0,    { duration: 580 }),
    ));
    ringScale.value = withDelay(320,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Outer ring — slightly later, softer
    ring2Opacity.value = withDelay(460, withSequence(
      withTiming(0.28, { duration: 120 }),
      withTiming(0,    { duration: 620 }),
    ));
    ring2Scale.value = withDelay(460,
      withTiming(1.22, { duration: 740, easing: Easing.out(Easing.cubic) }),
    );

    // Fade out entire overlay
    containerOpacity.value = withDelay(
      1280,
      withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle      = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const ringStyle  = useAnimatedStyle(() => ({ opacity: ringOpacity.value,  transform: [{ scale: ringScale.value  }] }));
  const ring2Style = useAnimatedStyle(() => ({ opacity: ring2Opacity.value, transform: [{ scale: ring2Scale.value }] }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* Constellation dots */}
      {STARS.map((s, i) => <StarDot key={i} {...s} />)}

      {/* Chrome shimmer rings */}
      <Animated.View style={[styles.ring, ringStyle]}  />
      <Animated.View style={[styles.ring, ring2Style]} />

      {/* Logo */}
      <Animated.Image
        source={require("../../assets/images/resqride-logo-dark.png")}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />

    </Animated.View>
  );
}

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
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: "rgba(192,192,192,0.6)",
    shadowColor: "#C0C0C0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
});
