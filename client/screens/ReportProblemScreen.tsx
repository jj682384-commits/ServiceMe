import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ProblemCategory = 
  | "service_issue"
  | "payment_issue"
  | "provider_issue"
  | "app_bug"
  | "safety_concern"
  | "other";

interface CategoryOption {
  id: ProblemCategory;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}

const categories: CategoryOption[] = [
  {
    id: "service_issue",
    label: "Service Issue",
    icon: "tool",
    description: "Problem with the roadside service received",
  },
  {
    id: "payment_issue",
    label: "Payment Issue",
    icon: "credit-card",
    description: "Billing, charges, or refund concerns",
  },
  {
    id: "provider_issue",
    label: "Provider Issue",
    icon: "user-x",
    description: "Problem with the service provider",
  },
  {
    id: "app_bug",
    label: "App Bug",
    icon: "alert-circle",
    description: "Something isn't working correctly",
  },
  {
    id: "safety_concern",
    label: "Safety Concern",
    icon: "shield",
    description: "Report a safety-related issue",
  },
  {
    id: "other",
    label: "Other",
    icon: "help-circle",
    description: "General feedback or other issues",
  },
];

interface CategoryCardProps {
  category: CategoryOption;
  isSelected: boolean;
  onSelect: () => void;
}

function CategoryCard({ category, isSelected, onSelect }: CategoryCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
      style={[
        styles.categoryCard,
        {
          backgroundColor: isSelected ? theme.primary + "15" : theme.backgroundDefault,
          borderColor: isSelected ? theme.primary : theme.border,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundSecondary }]}>
        <Feather name={category.icon} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
      </View>
      <View style={styles.categoryContent}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {category.label}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {category.description}
        </ThemedText>
      </View>
      {isSelected ? (
        <Feather name="check-circle" size={20} color={theme.primary} />
      ) : null}
    </AnimatedPressable>
  );
}

export default function ReportProblemScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { userRole, authUser, currentDriver, currentProvider } = useApp();
  const navigation = useNavigation();

  const [selectedCategory, setSelectedCategory] = useState<ProblemCategory | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const canSubmit = selectedCategory && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert(
        "More Details Needed",
        "Please select a category and provide at least 10 characters describing the issue."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/reports", {
        category: selectedCategory,
        description: description.trim(),
        userId: authUser?.id || currentDriver?.id || currentProvider?.id,
        userRole,
      });
      Alert.alert(
        "Report Submitted",
        "Thank you for your feedback. Our support team will review your report and get back to you within 24-48 hours.",
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch {
      Alert.alert(
        "Submission Failed",
        "We couldn't send your report right now. Please try again or call 1-800-SERVICE."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        bottomOffset={160}
      >
        <View style={styles.header}>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Help us improve by reporting any issues you've experienced.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            What type of issue?
          </ThemedText>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                isSelected={selectedCategory === category.id}
                onSelect={() => setSelectedCategory(category.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Describe the issue
          </ThemedText>
          <View
            style={[
              styles.textInputContainer,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Please provide details about what happened..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {description.length}/500 characters (minimum 10)
          </ThemedText>
        </View>

        <AnimatedPressable
          onPress={handleSubmit}
          onPressIn={() => { scale.value = withSpring(0.97); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit ? theme.primary : theme.border,
              opacity: isSubmitting ? 0.7 : 1,
            },
            animatedButtonStyle,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.submitButtonText}>
                Submit Report
              </ThemedText>
            </>
          )}
        </AnimatedPressable>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="info" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
            For urgent safety concerns, please contact local emergency services. Our team typically responds within 24-48 hours.
          </ThemedText>
        </View>
      </KeyboardAwareScrollViewCompat>
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
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  categoriesGrid: {
    gap: Spacing.sm,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryContent: {
    flex: 1,
    gap: 2,
  },
  textInputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  textInput: {
    fontSize: 16,
    minHeight: 120,
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "flex-start",
  },
});
