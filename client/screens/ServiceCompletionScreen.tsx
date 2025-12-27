import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERVICE_FEE = 2.95;

const TIP_OPTIONS = [
  { label: "No Tip", value: 0 },
  { label: "$5", value: 5 },
  { label: "$10", value: 10 },
  { label: "$15", value: 15 },
  { label: "20%", value: "percent" as const },
];

function StarRating({ rating, onRate }: { rating: number; onRate: (r: number) => void }) {
  const { theme } = useTheme();

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onRate(star)} style={styles.starButton}>
          <Feather
            name={star <= rating ? "star" : "star"}
            size={40}
            color={star <= rating ? theme.warning : theme.border}
            style={star <= rating ? { opacity: 1 } : { opacity: 0.3 }}
          />
        </Pressable>
      ))}
    </View>
  );
}

function TipButton({ 
  label, 
  isSelected, 
  onPress 
}: { 
  label: string; 
  isSelected: boolean; 
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.tipButton,
        {
          backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
          borderColor: isSelected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <ThemedText
        type="body"
        style={{
          color: isSelected ? "#FFFFFF" : theme.text,
          fontWeight: isSelected ? "600" : "400",
        }}
      >
        {label}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function ServiceCompletionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { activeRequest, setActiveRequest } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [rating, setRating] = useState(0);
  const [selectedTipIndex, setSelectedTipIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const serviceCost = activeRequest?.estimatedCost || 0;
  
  const calculateTip = () => {
    const tipOption = TIP_OPTIONS[selectedTipIndex];
    if (tipOption.value === "percent") {
      return serviceCost * 0.2;
    }
    return tipOption.value as number;
  };

  const tipAmount = calculateTip();
  const totalAmount = serviceCost + SERVICE_FEE + tipAmount;

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    setTimeout(() => {
      setActiveRequest(null);
      setIsSubmitting(false);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "DriverTabs" }],
        })
      );
    }, 1000);
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 100,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.checkCircle, { backgroundColor: theme.success }]}>
            <Feather name="check" size={40} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.title}>
            Service Complete
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Thank you for using ServiceMe
          </ThemedText>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Rate Your Provider
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.md }}>
            {activeRequest?.provider?.name || "Your provider"}
          </ThemedText>
          <StarRating rating={rating} onRate={setRating} />
          {rating > 0 ? (
            <ThemedText type="body" style={{ color: theme.primary, marginTop: Spacing.sm }}>
              {ratingLabels[rating]}
            </ThemedText>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Add a Tip (Optional)
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.md }}>
            100% of your tip goes directly to your provider
          </ThemedText>
          <View style={styles.tipGrid}>
            {TIP_OPTIONS.map((option, index) => (
              <TipButton
                key={index}
                label={option.label}
                isSelected={selectedTipIndex === index}
                onPress={() => setSelectedTipIndex(index)}
              />
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Payment Summary
          </ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText type="body">Service</ThemedText>
            <ThemedText type="body">${serviceCost.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Service Fee
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              ${SERVICE_FEE.toFixed(2)}
            </ThemedText>
          </View>
          {tipAmount > 0 ? (
            <View style={styles.summaryRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Tip
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                ${tipAmount.toFixed(2)}
              </ThemedText>
            </View>
          ) : null}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Total
            </ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ${totalAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            {
              backgroundColor: theme.primary,
              opacity: isSubmitting ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {isSubmitting ? "Processing..." : `Pay $${totalAmount.toFixed(2)}`}
          </ThemedText>
        </Pressable>
        {rating === 0 ? (
          <Pressable onPress={handleSubmit} style={styles.skipButton}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Skip rating and pay
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  starsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  tipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  tipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: Spacing.sm,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
  },
  skipButton: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
});
