import React, { useEffect } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

export function KeyboardDismissButton() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        opacity.value = withTiming(1, { duration: 200 });
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        translateY.value = withTiming(80, { duration: 200 });
        opacity.value = withTiming(0, { duration: 150 });
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (Platform.OS === "web") return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 8 },
        animStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => Keyboard.dismiss()}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: isDark ? "rgba(30, 35, 55, 0.95)" : "rgba(255, 255, 255, 0.95)",
            borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-down" size={16} color={theme.text} />
        <ThemedText type="small" style={{ fontWeight: "600", marginLeft: 4 }}>
          Done
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 1000,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
  },
});
