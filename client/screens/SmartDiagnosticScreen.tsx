import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, Animated as RNAnimated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  SlideInRight,
} from "react-native-reanimated";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ServiceType } from "@/context/AppContext";

type SymptomKey = "wont_start" | "clicking" | "low_fuel" | "tire_pressure" | "locked_out" | "other";

interface Symptom {
  key: SymptomKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}

interface FollowUpQuestion {
  id: string;
  question: string;
  options: string[];
}

interface DiagnosticResult {
  likelyIssue: string;
  description: string;
  costRange: string;
  serviceType: ServiceType;
  serviceLabel: string;
  confidence: number;
  tips: string[];
}

const SYMPTOMS: Symptom[] = [
  { key: "wont_start", label: "Won't Start", icon: "power", description: "Engine won't turn over or start" },
  { key: "clicking", label: "Clicking Noise", icon: "volume-2", description: "Rapid clicking when turning key" },
  { key: "low_fuel", label: "Low Fuel Warning", icon: "droplet", description: "Fuel light is on or ran out of gas" },
  { key: "tire_pressure", label: "Tire Pressure Alert", icon: "disc", description: "Flat tire or tire pressure warning" },
  { key: "locked_out", label: "Locked Out", icon: "lock", description: "Keys locked inside or key fob issue" },
  { key: "other", label: "Something Else", icon: "help-circle", description: "Other issue not listed above" },
];

const FOLLOW_UP_QUESTIONS: Record<SymptomKey, FollowUpQuestion[]> = {
  wont_start: [
    { id: "dashboard", question: "Do your dashboard lights come on?", options: ["Yes, lights work", "No, everything is dead", "Lights are dim"] },
    { id: "sound", question: "What sound does it make?", options: ["Nothing at all", "Grinding noise", "Single click"] },
  ],
  clicking: [
    { id: "speed", question: "How fast is the clicking?", options: ["Rapid clicking", "Slow single clicks", "Intermittent"] },
    { id: "lights", question: "Are your headlights working?", options: ["Bright and normal", "Dim or flickering", "Not working at all"] },
  ],
  low_fuel: [
    { id: "gauge", question: "What does the fuel gauge show?", options: ["Completely empty", "Just below empty", "Shows some fuel left"] },
    { id: "driving", question: "Did the car stop while driving?", options: ["Yes, it stalled", "No, it won't start", "Engine is sputtering"] },
  ],
  tire_pressure: [
    { id: "visible", question: "Can you see the flat tire?", options: ["Yes, completely flat", "Looks low but not flat", "Not sure which tire"] },
    { id: "spare", question: "Do you have a spare tire?", options: ["Yes, in the trunk", "No spare available", "Not sure"] },
  ],
  locked_out: [
    { id: "keys", question: "Where are your keys?", options: ["Inside the car", "Lost completely", "Key fob not working"] },
    { id: "type", question: "What type of lock system?", options: ["Traditional key", "Push button / Smart key", "Combination lock"] },
  ],
  other: [
    { id: "category", question: "What best describes the issue?", options: ["Engine/mechanical", "Electrical problem", "Stuck or immobile"] },
    { id: "urgency", question: "How urgent is this?", options: ["Can't drive at all", "Can drive but concerned", "Just need a checkup"] },
  ],
};

function getDiagnosticResult(symptom: SymptomKey, answers: Record<string, string>): DiagnosticResult {
  switch (symptom) {
    case "wont_start": {
      if (answers["dashboard"] === "No, everything is dead" || answers["dashboard"] === "Lights are dim") {
        return {
          likelyIssue: "Dead Battery",
          description: "Your battery has likely lost its charge. This is one of the most common roadside issues and is usually a quick fix with a jump start.",
          costRange: "$35 - $55",
          serviceType: "jump_start",
          serviceLabel: "Jump Start",
          confidence: 92,
          tips: ["Turn off all accessories before jump starting", "Let the engine run for at least 15 minutes after", "Consider replacing the battery if it's over 3 years old"],
        };
      }
      return {
        likelyIssue: "Starter Motor Issue",
        description: "The starter motor may be failing. If dashboard lights work but the engine won't crank, the starter solenoid or motor itself could need attention.",
        costRange: "$50 - $80",
        serviceType: "other",
        serviceLabel: "Diagnostic & Repair",
        confidence: 75,
        tips: ["Try tapping the starter gently if accessible", "Check if the car is in Park/Neutral", "A mechanic can test the starter on-site"],
      };
    }
    case "clicking":
      return {
        likelyIssue: "Weak Battery",
        description: "Rapid clicking typically indicates a battery that doesn't have enough charge to engage the starter. A jump start should get you going.",
        costRange: "$35 - $55",
        serviceType: "jump_start",
        serviceLabel: "Jump Start",
        confidence: 95,
        tips: ["This is almost always a battery issue", "Check battery terminals for corrosion", "If this happens often, your battery may need replacing"],
      };
    case "low_fuel":
      return {
        likelyIssue: "Out of Fuel",
        description: "Your vehicle has run out of fuel or is critically low. A fuel delivery service will bring enough gas to get you to the nearest station.",
        costRange: "$25 - $45",
        serviceType: "fuel",
        serviceLabel: "Fuel Delivery",
        confidence: 98,
        tips: ["We'll deliver enough fuel to reach the nearest gas station", "Running on empty can damage your fuel pump over time", "Consider keeping your tank above 1/4 to prevent this"],
      };
    case "tire_pressure": {
      if (answers["visible"] === "Yes, completely flat") {
        return {
          likelyIssue: "Flat Tire",
          description: "You have a completely flat tire that needs to be changed or repaired. A mobile technician can swap it with your spare or patch the tire on-site.",
          costRange: "$45 - $75",
          serviceType: "flat_tire",
          serviceLabel: "Flat Tire Service",
          confidence: 99,
          tips: ["Move to a safe location away from traffic", "Turn on your hazard lights", "If on a highway, stay in your vehicle until help arrives"],
        };
      }
      return {
        likelyIssue: "Low Tire Pressure",
        description: "Your tire pressure is below the recommended level. This could be a slow leak or temperature-related. A technician can inspect and inflate or repair the tire.",
        costRange: "$40 - $65",
        serviceType: "flat_tire",
        serviceLabel: "Tire Service",
        confidence: 85,
        tips: ["Check the tire for visible nails or damage", "Low pressure can affect fuel economy and handling", "Temperature changes can cause pressure fluctuations"],
      };
    }
    case "locked_out":
      return {
        likelyIssue: "Vehicle Lockout",
        description: "You're locked out of your vehicle. A professional locksmith can safely gain entry without damaging your car.",
        costRange: "$45 - $65",
        serviceType: "lockout",
        serviceLabel: "Lockout Service",
        confidence: 99,
        tips: ["Never try to force entry - it can cause damage", "Check all doors and the trunk", "Some insurance plans cover lockout service"],
      };
    case "other":
    default:
      return {
        likelyIssue: "General Diagnostic Needed",
        description: "Based on your description, we recommend an on-site diagnostic to determine the exact issue. A certified technician will assess your vehicle.",
        costRange: "$25 - $80",
        serviceType: "obd_diagnostic",
        serviceLabel: "OBD Diagnostic",
        confidence: 60,
        tips: ["Note any warning lights on your dashboard", "Describe any unusual sounds or smells", "Mention when the issue first started"],
      };
  }
}

function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  const { theme } = useTheme();
  return (
    <View style={styles.progressContainer}>
      {[...Array(totalSteps)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            {
              backgroundColor: i <= step ? theme.primary : theme.border,
              flex: 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SymptomCard({
  symptom,
  isSelected,
  onPress,
}: {
  symptom: Symptom;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.symptomCard,
        {
          backgroundColor: isSelected ? theme.primary + "15" : theme.backgroundSecondary,
          borderColor: isSelected ? theme.primary : "transparent",
          borderWidth: 2,
        },
      ]}
    >
      <View style={[styles.symptomIcon, { backgroundColor: isSelected ? theme.primary : theme.backgroundTertiary }]}>
        <Feather name={symptom.icon} size={24} color={isSelected ? "#FFFFFF" : theme.textSecondary} />
      </View>
      <View style={styles.symptomInfo}>
        <ThemedText type="body" style={{ fontWeight: "600", color: isSelected ? theme.primary : theme.text }}>
          {symptom.label}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
          {symptom.description}
        </ThemedText>
      </View>
      <View
        style={[
          styles.radioOuter,
          { borderColor: isSelected ? theme.primary : theme.border },
        ]}
      >
        {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

function FollowUpCard({
  question,
  selectedAnswer,
  onSelect,
}: {
  question: FollowUpQuestion;
  selectedAnswer: string | undefined;
  onSelect: (answer: string) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.followUpContainer}>
      <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
        {question.question}
      </ThemedText>
      {question.options.map((option) => {
        const isSelected = selectedAnswer === option;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.followUpOption,
              {
                backgroundColor: isSelected ? theme.primary + "15" : theme.backgroundSecondary,
                borderColor: isSelected ? theme.primary : "transparent",
                borderWidth: 2,
              },
            ]}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: isSelected ? theme.primary : theme.border },
              ]}
            >
              {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
            </View>
            <ThemedText type="body" style={{ flex: 1, color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? "600" : "400" }}>
              {option}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const { theme } = useTheme();
  const color = confidence >= 90 ? theme.success : confidence >= 70 ? theme.warning : theme.primary;

  return (
    <View style={styles.confidenceContainer}>
      <View style={styles.confidenceHeader}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Diagnostic Confidence
        </ThemedText>
        <ThemedText type="body" style={{ color, fontWeight: "700" }}>
          {confidence}%
        </ThemedText>
      </View>
      <View style={[styles.confidenceTrack, { backgroundColor: theme.backgroundTertiary }]}>
        <View style={[styles.confidenceFill, { width: `${confidence}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function SmartDiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(0);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomKey | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);

  const followUpQuestions = selectedSymptom ? FOLLOW_UP_QUESTIONS[selectedSymptom] : [];
  const totalSteps = 3;

  const handleSymptomSelect = (symptomKey: SymptomKey) => {
    setSelectedSymptom(symptomKey);
    setFollowUpAnswers({});
    setCurrentFollowUpIndex(0);
  };

  const handleNext = () => {
    if (step === 0 && selectedSymptom) {
      setStep(1);
      setCurrentFollowUpIndex(0);
    } else if (step === 1) {
      if (currentFollowUpIndex < followUpQuestions.length - 1) {
        setCurrentFollowUpIndex(currentFollowUpIndex + 1);
      } else {
        setStep(2);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setCurrentFollowUpIndex(followUpQuestions.length - 1);
    } else if (step === 1) {
      if (currentFollowUpIndex > 0) {
        setCurrentFollowUpIndex(currentFollowUpIndex - 1);
      } else {
        setStep(0);
      }
    }
  };

  const handleFollowUpAnswer = (questionId: string, answer: string) => {
    setFollowUpAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const result = selectedSymptom ? getDiagnosticResult(selectedSymptom, followUpAnswers) : null;

  const handleRequestService = () => {
    if (!result) return;
    const notes = `Smart Diagnostic: ${result.likelyIssue} (${result.confidence}% confidence). ${result.description}`;
    navigation.goBack();
    navigation.navigate("ServiceRequest", {
      serviceType: result.serviceType,
      notes,
    });
  };

  const canProceed = () => {
    if (step === 0) return selectedSymptom !== null;
    if (step === 1) {
      const currentQuestion = followUpQuestions[currentFollowUpIndex];
      return currentQuestion ? followUpAnswers[currentQuestion.id] !== undefined : false;
    }
    return false;
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <View>
          <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
            What's happening?
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
            Select the symptom that best describes your situation
          </ThemedText>
          {SYMPTOMS.map((symptom) => (
            <SymptomCard
              key={symptom.key}
              symptom={symptom}
              isSelected={selectedSymptom === symptom.key}
              onPress={() => handleSymptomSelect(symptom.key)}
            />
          ))}
        </View>
      );
    }

    if (step === 1 && followUpQuestions.length > 0) {
      const currentQuestion = followUpQuestions[currentFollowUpIndex];
      return (
        <View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
            Question {currentFollowUpIndex + 1} of {followUpQuestions.length}
          </ThemedText>
          <FollowUpCard
            key={currentQuestion.id}
            question={currentQuestion}
            selectedAnswer={followUpAnswers[currentQuestion.id]}
            onSelect={(answer) => handleFollowUpAnswer(currentQuestion.id, answer)}
          />
        </View>
      );
    }

    if (step === 2 && result) {
      return (
        <View>
          <View style={[styles.resultHeader, { backgroundColor: theme.primary + "10" }]}>
            <View style={[styles.resultIconContainer, { backgroundColor: theme.primary }]}>
              <Feather name="cpu" size={28} color="#FFFFFF" />
            </View>
            <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
              {result.likelyIssue}
            </ThemedText>
            <ConfidenceMeter confidence={result.confidence} />
          </View>

          <View style={[styles.resultCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 24 }}>
              {result.description}
            </ThemedText>
          </View>

          <View style={[styles.costCard, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.costRow}>
              <View style={styles.costLabel}>
                <Feather name="dollar-sign" size={18} color={theme.success} />
                <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                  Estimated Cost
                </ThemedText>
              </View>
              <ThemedText type="h4" style={{ color: theme.success }}>
                {result.costRange}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.costRow}>
              <View style={styles.costLabel}>
                <Feather name="tool" size={18} color={theme.secondary} />
                <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                  Recommended Service
                </ThemedText>
              </View>
              <View style={[styles.serviceBadge, { backgroundColor: theme.secondary + "20" }]}>
                <ThemedText type="small" style={{ color: theme.secondary, fontWeight: "600" }}>
                  {result.serviceLabel}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.tipsCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
              Helpful Tips
            </ThemedText>
            {result.tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Feather name="check-circle" size={16} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <ThemedView style={styles.container}>
      <ProgressBar step={step} totalSteps={totalSteps} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
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
        {step === 2 ? (
          <View style={styles.resultButtons}>
            <Pressable
              onPress={() => { setStep(0); setSelectedSymptom(null); setFollowUpAnswers({}); }}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: Spacing.sm }}>
                Start Over
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleRequestService}
              style={[styles.primaryButton, { backgroundColor: theme.primary, flex: 1 }]}
            >
              <Feather name="zap" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                Request This Service
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.navButtons}>
            {step > 0 ? (
              <Pressable
                onPress={handleBack}
                style={[styles.backButton, { borderColor: theme.border }]}
              >
                <Feather name="arrow-left" size={18} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: Spacing.sm }}>
                  Back
                </ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleNext}
              disabled={!canProceed()}
              style={[
                styles.nextButton,
                {
                  backgroundColor: theme.primary,
                  opacity: canProceed() ? 1 : 0.5,
                  flex: step > 0 ? 1 : undefined,
                },
              ]}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {step === 1 && currentFollowUpIndex < followUpQuestions.length - 1 ? "Next Question" : step === 1 ? "See Results" : "Continue"}
              </ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: Spacing.sm }} />
            </Pressable>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  symptomCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  symptomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  symptomInfo: {
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  followUpContainer: {
    marginTop: Spacing.sm,
  },
  followUpOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  resultHeader: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  resultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceContainer: {
    width: "100%",
    marginTop: Spacing.lg,
  },
  confidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  confidenceTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 4,
  },
  resultCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  costCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  serviceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tipsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  navButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  resultButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.full,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
  },
});
