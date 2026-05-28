import React, { useRef, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, Dimensions, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const { width: SCREEN_W } = Dimensions.get("window");
export const ONBOARDING_KEY = "@resqride_onboarded_v1";

const SLIDES = [
  {
    icon: "alert-circle" as const,
    iconColor: "#D92222",
    title: "Help in Minutes",
    body: "Stuck on the side of the road? Tap once and a verified provider is on their way — flat tire, jump start, fuel, lockout, and more.",
    gradient: ["#1a0a0a", "#04060E"] as [string, string],
    accent: "#D92222",
  },
  {
    icon: "shield" as const,
    iconColor: "#0066FF",
    title: "Verified & Trusted",
    body: "Every provider goes through ID verification. Live GPS tracking shows you exactly where they are, every step of the way.",
    gradient: ["#040E1a", "#04060E"] as [string, string],
    accent: "#0066FF",
  },
  {
    icon: "dollar-sign" as const,
    iconColor: "#22C55E",
    title: "Earn on Your Schedule",
    body: "Got a car and a little spare time? Become a provider and earn money helping drivers in your neighborhood — no experience needed.",
    gradient: ["#061a0a", "#04060E"] as [string, string],
    accent: "#22C55E",
  },
];

interface SlideProps {
  item: typeof SLIDES[number];
}

function Slide({ item }: SlideProps) {
  const { isDark } = useTheme();
  const bodyColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <LinearGradient colors={isDark ? item.gradient : ["#f0f4ff", "#ffffff"]} style={StyleSheet.absoluteFill} />

      <Animated.View
        entering={FadeIn.duration(600)}
        style={[styles.iconWrap, { backgroundColor: item.accent + "1A", borderColor: item.accent + "30" }]}
      >
        <Feather name={item.icon} size={52} color={item.accent} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.textBlock}>
        <ThemedText type="h2" style={{ textAlign: "center", color: isDark ? "#FFFFFF" : "#0D0D0D", marginBottom: Spacing.md }}>
          {item.title}
        </ThemedText>
        <ThemedText type="body" style={{ textAlign: "center", color: bodyColor, lineHeight: 26 }}>
          {item.body}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const dotInactive = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  const btnColors = isDark ? ["#2A2A2A", "#181818"] as [string, string] : ["#1A1A1A", "#0A0A0A"] as [string, string];

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true").catch(() => {});
    navigation.replace("Welcome");
  };

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#04060E" : "#ffffff" }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        renderItem={({ item }) => <Slide item={item} />}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? SLIDES[i].accent : dotInactive,
                  width: i === currentIndex ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable style={[styles.nextBtn, { overflow: "hidden" }]} onPress={next}>
          <LinearGradient colors={btnColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
            {isLast ? "Get Started" : "Next"}
          </ThemedText>
          {!isLast ? <Feather name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 6 }} /> : null}
        </Pressable>

        {!isLast ? (
          <Pressable onPress={finish} style={{ alignItems: "center", paddingTop: Spacing.sm }}>
            <ThemedText type="small" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)" }}>
              Skip
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: Spacing.xl },
  iconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  textBlock: { gap: Spacing.md },
  footer: { paddingHorizontal: 24, gap: Spacing.md, backgroundColor: "transparent" },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 16 },
});
