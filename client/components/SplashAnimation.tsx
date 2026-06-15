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
const RING = width * 0.82;
const LOGO = width * 0.54;

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  const scanY       = useSharedValue(-4);
  const scanOpacity = useSharedValue(1);

  const logoScale   = useSharedValue(0.55);
  const logoOpacity = useSharedValue(0);

  const r1Scale = useSharedValue(0.08); const r1Opacity = useSharedValue(0);
  const r2Scale = useSharedValue(0.08); const r2Opacity = useSharedValue(0);
  const r3Scale = useSharedValue(0.08); const r3Opacity = useSharedValue(0);

  const flashOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    // — Scan line sweeps full height
    scanY.value = withTiming(height + 4, {
      duration: 620,
      easing: Easing.inOut(Easing.quad),
    });
    scanOpacity.value = withDelay(520, withTiming(0, { duration: 120 }));

    // — Logo materialises mid-sweep
    logoOpacity.value = withDelay(240, withTiming(1, { duration: 380 }));
    logoScale.value   = withDelay(240, withSpring(1, { damping: 11, stiffness: 75, mass: 0.9 }));

    // — Flash burst when scan finishes
    flashOpacity.value = withDelay(580, withSequence(
      withTiming(0.28, { duration: 60 }),
      withTiming(0,    { duration: 260 }),
    ));

    // — Three staggered pulse rings
    r1Scale.value   = withDelay(610, withTiming(1,    { duration: 680, easing: Easing.out(Easing.cubic) }));
    r1Opacity.value = withDelay(610, withSequence(
      withTiming(0.75, { duration: 80  }),
      withTiming(0,    { duration: 600 }),
    ));
    r2Scale.value   = withDelay(730, withTiming(1.18, { duration: 680, easing: Easing.out(Easing.cubic) }));
    r2Opacity.value = withDelay(730, withSequence(
      withTiming(0.50, { duration: 80  }),
      withTiming(0,    { duration: 600 }),
    ));
    r3Scale.value   = withDelay(860, withTiming(1.38, { duration: 680, easing: Easing.out(Easing.cubic) }));
    r3Opacity.value = withDelay(860, withSequence(
      withTiming(0.28, { duration: 80  }),
      withTiming(0,    { duration: 600 }),
    ));

    // — Fade out: logo drifts up slightly while fading
    containerOpacity.value = withDelay(
      1380,
      withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));

  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ translateY: scanY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const r1Style = useAnimatedStyle(() => ({ opacity: r1Opacity.value, transform: [{ scale: r1Scale.value }] }));
  const r2Style = useAnimatedStyle(() => ({ opacity: r2Opacity.value, transform: [{ scale: r2Scale.value }] }));
  const r3Style = useAnimatedStyle(() => ({ opacity: r3Opacity.value, transform: [{ scale: r3Scale.value }] }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>

      {/* Scan line */}
      <Animated.View style={[styles.scanLine, scanStyle]} />

      {/* Pulse rings */}
      <Animated.View style={[styles.ring, r1Style]} />
      <Animated.View style={[styles.ring, r2Style]} />
      <Animated.View style={[styles.ring, r3Style]} />

      {/* Logo */}
      <Animated.Image
        source={require("../../assets/images/resqride-logo-dark.png")}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />

      {/* Flash overlay */}
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: 3,
    backgroundColor: "#0066FF",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: "#0066FF",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0055CC",
  },
});
