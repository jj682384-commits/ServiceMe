import React, { useState, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { ServiceType } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

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
      <View style={[styles.radioOuter, { borderColor: isSelected ? theme.primary : theme.border }]}>
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
            <View style={[styles.radioOuter, { borderColor: isSelected ? theme.primary : theme.border }]}>
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
          AI Diagnostic Confidence
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

function LoadingDiagnosis() {
  const { theme } = useTheme();
  return (
    <View style={styles.loadingContainer}>
      <View style={[styles.loadingIcon, { backgroundColor: theme.primary + "15" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
      <ThemedText type="h4" style={{ marginTop: Spacing.xl, textAlign: "center" }}>
        Analyzing Your Symptoms
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm, lineHeight: 22 }}>
        Our AI is reviewing your answers to find the most likely issue...
      </ThemedText>
    </View>
  );
}

export default function SmartDiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(0);
  const [selectedSymptom, setSelectedSymptom] = useState<SymptomKey | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  const followUpQuestions = selectedSymptom ? FOLLOW_UP_QUESTIONS[selectedSymptom] : [];
  const totalSteps = 3;

  const handleSymptomSelect = (symptomKey: SymptomKey) => {
    setSelectedSymptom(symptomKey);
    setFollowUpAnswers({});
    setCurrentFollowUpIndex(0);
    setResult(null);
    setDiagnosisError(null);
  };

  const fetchDiagnosis = async (symptom: SymptomKey, answers: Record<string, string>) => {
    setIsLoading(true);
    setDiagnosisError(null);
    setStep(2);

    const symptomObj = SYMPTOMS.find((s) => s.key === symptom);
    const questions = FOLLOW_UP_QUESTIONS[symptom];

    try {
      const response = await apiRequest("POST", "/api/diagnose", {
        symptom,
        symptomLabel: symptomObj?.label,
        followUpQuestions: questions,
        followUpAnswers: answers,
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Diagnosis error:", err);
      setDiagnosisError("Couldn't reach the AI right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 0 && selectedSymptom) {
      setStep(1);
      setCurrentFollowUpIndex(0);
    } else if (step === 1) {
      if (currentFollowUpIndex < followUpQuestions.length - 1) {
        setCurrentFollowUpIndex(currentFollowUpIndex + 1);
      } else {
        fetchDiagnosis(selectedSymptom!, followUpAnswers);
      }
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setCurrentFollowUpIndex(followUpQuestions.length - 1);
      setResult(null);
      setDiagnosisError(null);
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

  const handleRequestService = () => {
    if (!result) return;
    const notes = `AI Diagnostic: ${result.likelyIssue} (${result.confidence}% confidence). ${result.description}`;
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

    if (step === 2) {
      if (isLoading) {
        return <LoadingDiagnosis />;
      }

      if (diagnosisError) {
        return (
          <View style={styles.errorContainer}>
            <Feather name="wifi-off" size={48} color={theme.textTertiary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
              Connection Issue
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              {diagnosisError}
            </ThemedText>
            <Pressable
              onPress={() => fetchDiagnosis(selectedSymptom!, followUpAnswers)}
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
            >
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                Try Again
              </ThemedText>
            </Pressable>
          </View>
        );
      }

      if (result) {
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

            <View style={[styles.aiBadge, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="zap" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                Powered by AI — results are advisory, not a mechanical guarantee
              </ThemedText>
            </View>
          </View>
        );
      }
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
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      {step !== 2 || (!isLoading && !diagnosisError && !result) ? (
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
          <View style={styles.navButtons}>
            {step > 0 ? (
              <Pressable onPress={handleBack} style={[styles.backButton, { borderColor: theme.border }]}>
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
                {step === 1 && currentFollowUpIndex < followUpQuestions.length - 1
                  ? "Next Question"
                  : step === 1
                  ? "Analyze with AI"
                  : "Continue"}
              </ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: Spacing.sm }} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === 2 && !isLoading && result ? (
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
          <View style={styles.resultButtons}>
            <Pressable
              onPress={() => { setStep(0); setSelectedSymptom(null); setFollowUpAnswers({}); setResult(null); }}
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
        </View>
      ) : null}
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
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  symptomInfo: {
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  followUpContainer: {
    flex: 1,
  },
  followUpOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  navButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  resultButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  resultHeader: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  resultIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "space-between",
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
  confidenceContainer: {
    width: "100%",
    marginTop: Spacing.md,
  },
  confidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  loadingIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl * 2,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
});
