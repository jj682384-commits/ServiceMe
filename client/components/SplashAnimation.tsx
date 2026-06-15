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

const { width } = Dimensions.get("window");

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.72);
  const logoOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.6);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Hide the native splash screen the instant our custom animation
    // is mounted — guarantees no gap between native splash and our screen.
    SplashScreen.hideAsync().catch(() => {});

    logoOpacity.value = withTiming(1, { duration: 380 });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 90, mass: 0.8 });

    glowOpacity.value = withDelay(
      260,
      withSequence(
        withTiming(0.55, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0.0,  { duration: 440, easing: Easing.in(Easing.quad) })
      )
    );
    glowScale.value = withDelay(
      260,
      withTiming(1.6, { duration: 820, easing: Easing.out(Easing.cubic) })
    );

    containerOpacity.value = withDelay(
      980,
      withTiming(
        0,
        { duration: 360, easing: Easing.in(Easing.quad) },
        (finished) => { if (finished) runOnJS(onFinish)(); }
      )
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} />
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
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logo: {
    width: width * 0.52,
    height: width * 0.52,
  },
  glow: {
    position: "absolute",
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: width * 0.36,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 48,
  },
});
