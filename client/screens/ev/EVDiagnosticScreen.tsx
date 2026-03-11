import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getEVColors, type EVColors } from "@/constants/evColors";
import EVAnimatedBackground from "@/components/EVAnimatedBackground";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type EVSymptomKey =
  | "battery_drain"
  | "charging_issue"
  | "regen_braking"
  | "motor_inverter"
  | "thermal_management"
  | "range_drop"
  | "hv_warning"
  | "ev_other";

interface EVSymptom {
  key: EVSymptomKey;
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
  serviceType: string;
  serviceLabel: string;
  confidence: number;
  tips: string[];
  severity: "low" | "medium" | "high" | "critical";
}

const EV_SYMPTOMS: EVSymptom[] = [
  { key: "battery_drain", label: "Battery Draining Fast", icon: "battery", description: "Unusual range loss or rapid charge depletion" },
  { key: "charging_issue", label: "Charging Problems", icon: "zap-off", description: "Won't charge, slow charging, or charge port issues" },
  { key: "regen_braking", label: "Regen Braking Issue", icon: "wind", description: "Regenerative braking feels weak or inconsistent" },
  { key: "motor_inverter", label: "Motor / Drivetrain", icon: "settings", description: "Unusual noises, vibrations, or power loss from motor" },
  { key: "thermal_management", label: "Battery Temperature", icon: "thermometer", description: "Overheating warnings or cold weather performance issues" },
  { key: "range_drop", label: "Sudden Range Drop", icon: "trending-down", description: "Range estimate dropped significantly overnight or mid-drive" },
  { key: "hv_warning", label: "High Voltage Warning", icon: "alert-triangle", description: "Dashboard warning light for HV battery or electrical system" },
  { key: "ev_other", label: "Other EV Issue", icon: "help-circle", description: "Another EV-specific issue not listed above" },
];

const EV_FOLLOW_UP_QUESTIONS: Record<EVSymptomKey, FollowUpQuestion[]> = {
  battery_drain: [
    { id: "drain_pattern", question: "When does the battery drain happen?", options: ["While driving", "Overnight while parked", "Both driving and parked"] },
    { id: "drain_amount", question: "How much range are you losing?", options: ["10-20% more than normal", "30-50% more than normal", "Battery dies very quickly"] },
  ],
  charging_issue: [
    { id: "charge_type", question: "What type of charger are you using?", options: ["Home Level 1 (wall outlet)", "Home Level 2 (240V)", "Public DC Fast Charger"] },
    { id: "charge_behavior", question: "What happens when you plug in?", options: ["Nothing at all", "Starts then stops", "Charges very slowly", "Error on screen"] },
  ],
  regen_braking: [
    { id: "regen_when", question: "When does the issue occur?", options: ["All the time", "Only when cold", "Only at high speeds", "Intermittently"] },
    { id: "regen_severity", question: "How does it feel?", options: ["No regen at all", "Weaker than usual", "Jerky or inconsistent", "Makes unusual noise"] },
  ],
  motor_inverter: [
    { id: "motor_symptom", question: "What are you experiencing?", options: ["Whining or grinding noise", "Loss of power", "Vibration at certain speeds", "Vehicle won't move"] },
    { id: "motor_when", question: "When does it happen?", options: ["During acceleration", "At constant speed", "During deceleration", "All the time"] },
  ],
  thermal_management: [
    { id: "temp_condition", question: "What's the weather like?", options: ["Very hot (above 95F)", "Very cold (below 32F)", "Normal temperature", "Temperature warning on dash"] },
    { id: "temp_impact", question: "How is it affecting your vehicle?", options: ["Reduced range", "Charging is limited", "Performance is reduced", "Fan running constantly"] },
  ],
  range_drop: [
    { id: "range_when", question: "When did the range drop?", options: ["Overnight", "During a drive", "After a software update", "Gradually over weeks"] },
    { id: "range_amount", question: "How much range did you lose?", options: ["10-20 miles", "20-50 miles", "50+ miles", "More than half my range"] },
  ],
  hv_warning: [
    { id: "hv_light", question: "What warning are you seeing?", options: ["Red battery warning", "Yellow/amber warning", "Turtle/reduced power mode", "Multiple warnings"] },
    { id: "hv_driving", question: "Can you still drive?", options: ["Yes, drives normally", "Yes, but reduced power", "Barely moves", "Won't move at all"] },
  ],
  ev_other: [
    { id: "ev_category", question: "What best describes the issue?", options: ["12V auxiliary battery", "Infotainment/electronics", "Suspension or chassis", "Software/connectivity"] },
    { id: "ev_urgency", question: "How urgent is this?", options: ["Can't drive at all", "Can drive but concerned", "Just need a checkup"] },
  ],
};

function getEVDiagnosticResult(symptom: EVSymptomKey, answers: Record<string, string>): DiagnosticResult {
  switch (symptom) {
    case "battery_drain": {
      if (answers["drain_pattern"] === "Overnight while parked") {
        return {
          likelyIssue: "Phantom Drain / 12V Battery Issue",
          description: "Your EV may be experiencing phantom drain from systems staying active while parked, or the 12V auxiliary battery may be failing and drawing from the main pack.",
          costRange: "$75 - $150",
          serviceType: "obd_diagnostic",
          serviceLabel: "EV Battery Diagnostic",
          confidence: 82,
          severity: "medium",
          tips: ["Disable Sentry Mode or cabin overheat protection temporarily to test", "Check if the 12V battery is more than 3 years old", "A software update may resolve phantom drain issues"],
        };
      }
      return {
        likelyIssue: "Battery Cell Degradation",
        description: "One or more battery cells may be degrading faster than normal, causing reduced capacity and faster drain during driving. An EV-specialized diagnostic can measure individual cell health.",
        costRange: "$100 - $200",
        serviceType: "obd_diagnostic",
        serviceLabel: "EV Cell Health Check",
        confidence: 75,
        severity: "medium",
        tips: ["Avoid charging to 100% regularly — keep between 20-80%", "Extreme temperatures accelerate cell degradation", "Check your battery health report in the vehicle's app if available"],
      };
    }
    case "charging_issue": {
      if (answers["charge_behavior"] === "Nothing at all") {
        return {
          likelyIssue: "Charge Port or EVSE Fault",
          description: "The charge port latch, connector pins, or the charging equipment itself may have a fault. This could be a stuck latch, corroded pins, or a communication error between the vehicle and charger.",
          costRange: "$50 - $120",
          serviceType: "obd_diagnostic",
          serviceLabel: "Charge System Diagnostic",
          confidence: 88,
          severity: "high",
          tips: ["Try a different charging cable or station to isolate the issue", "Check the charge port for debris or visible damage", "A hard reset of the vehicle may clear communication errors"],
        };
      }
      if (answers["charge_behavior"] === "Charges very slowly") {
        return {
          likelyIssue: "Onboard Charger Limitation",
          description: "The vehicle's onboard charger may be derated due to temperature, or the charging station may not be delivering full power. Battery temperature management could also be limiting charge speed.",
          costRange: "$0 - $80",
          serviceType: "obd_diagnostic",
          serviceLabel: "Charging Rate Analysis",
          confidence: 78,
          severity: "low",
          tips: ["Precondition the battery before fast charging in cold weather", "Check if the station is sharing power with other vehicles", "Your vehicle may limit charging speed above 80% SOC"],
        };
      }
      return {
        likelyIssue: "Charging Communication Error",
        description: "The vehicle and charger may not be handshaking properly. This is often caused by a firmware issue, faulty pilot signal, or ground fault in the charging circuit.",
        costRange: "$60 - $140",
        serviceType: "obd_diagnostic",
        serviceLabel: "EVSE Diagnostic",
        confidence: 80,
        severity: "medium",
        tips: ["Try unplugging and re-plugging after 30 seconds", "Reset the charger's circuit breaker if at home", "Different charger networks may have better compatibility"],
      };
    }
    case "regen_braking": {
      if (answers["regen_when"] === "Only when cold") {
        return {
          likelyIssue: "Cold Battery Limiting Regen",
          description: "This is normal EV behavior. When the battery is cold, the vehicle limits regenerative braking to protect battery cells. Regen will restore as the battery warms up during driving.",
          costRange: "$0",
          serviceType: "obd_diagnostic",
          serviceLabel: "No Service Needed",
          confidence: 95,
          severity: "low",
          tips: ["Precondition your battery before driving in cold weather", "Regen typically restores within 10-15 minutes of driving", "Using scheduled departure/preconditioning helps significantly"],
        };
      }
      return {
        likelyIssue: "Regen System Calibration Needed",
        description: "The regenerative braking system may need recalibration, or there could be an issue with the motor controller or brake sensors affecting regen performance.",
        costRange: "$80 - $160",
        serviceType: "obd_diagnostic",
        serviceLabel: "Regen System Diagnostic",
        confidence: 72,
        severity: "medium",
        tips: ["Check if regen settings were accidentally changed in vehicle settings", "A full stop and restart of the vehicle may help", "Brake fluid service can sometimes affect regen feel"],
      };
    }
    case "motor_inverter": {
      if (answers["motor_symptom"] === "Vehicle won't move") {
        return {
          likelyIssue: "Drive Unit Failure",
          description: "The electric drive unit (motor + inverter) may have a critical fault preventing the vehicle from moving. This requires immediate professional EV service — do not attempt to force the vehicle to drive.",
          costRange: "$150 - $300",
          serviceType: "tow",
          serviceLabel: "EV-Safe Flatbed Tow",
          confidence: 90,
          severity: "critical",
          tips: ["Do not attempt to drive — call for an EV-safe flatbed tow", "Never tow an EV with wheels on the ground", "Check if any dashboard warnings appeared before the issue"],
        };
      }
      return {
        likelyIssue: "Motor Bearing or Inverter Issue",
        description: "Unusual noises or vibrations from the motor area could indicate worn bearings, inverter switching issues, or a failing reduction gear. EV-specialized diagnostics can pinpoint the exact component.",
        costRange: "$100 - $250",
        serviceType: "obd_diagnostic",
        serviceLabel: "EV Drivetrain Diagnostic",
        confidence: 70,
        severity: "medium",
        tips: ["Note the speed at which the noise occurs — this helps diagnosis", "Reduced power mode is the vehicle protecting itself", "Most motor issues are covered under EV powertrain warranty"],
      };
    }
    case "thermal_management": {
      if (answers["temp_condition"] === "Temperature warning on dash") {
        return {
          likelyIssue: "Battery Thermal Management Fault",
          description: "The battery cooling/heating system may have a malfunction. A coolant leak, failed pump, or sensor issue could cause the battery to overheat or underperform in extreme temperatures.",
          costRange: "$120 - $250",
          serviceType: "obd_diagnostic",
          serviceLabel: "Thermal System Diagnostic",
          confidence: 85,
          severity: "high",
          tips: ["Reduce speed and avoid fast charging until diagnosed", "Park in shade if overheating, or warm garage if cold", "Check coolant levels if your EV has a visible reservoir"],
        };
      }
      return {
        likelyIssue: "Temperature-Related Performance Reduction",
        description: "Extreme temperatures cause the battery management system to limit performance and range to protect battery health. This is usually normal behavior but can be exacerbated by a thermal management issue.",
        costRange: "$0 - $100",
        serviceType: "obd_diagnostic",
        serviceLabel: "Battery Health Check",
        confidence: 80,
        severity: "low",
        tips: ["Precondition the battery before driving in extreme weather", "Range loss of 20-40% is common in very cold weather", "Parking in a garage helps maintain battery temperature"],
      };
    }
    case "range_drop": {
      if (answers["range_when"] === "After a software update") {
        return {
          likelyIssue: "Software Recalibration Needed",
          description: "Software updates can reset the battery management system's range estimation. The system needs to recalibrate by completing a few full charge cycles to accurately predict range again.",
          costRange: "$0",
          serviceType: "obd_diagnostic",
          serviceLabel: "No Service Needed",
          confidence: 88,
          severity: "low",
          tips: ["Complete 2-3 full charge cycles (20% to 80%) to recalibrate", "The range estimate should stabilize within a week of normal driving", "Check the manufacturer's release notes for known issues"],
        };
      }
      if (answers["range_amount"] === "More than half my range") {
        return {
          likelyIssue: "Battery Module Failure",
          description: "A significant sudden range drop may indicate one or more battery modules have failed or become disconnected. This requires urgent EV-specialized diagnosis to prevent further damage.",
          costRange: "$150 - $300",
          serviceType: "obd_diagnostic",
          serviceLabel: "Emergency Battery Diagnostic",
          confidence: 82,
          severity: "critical",
          tips: ["Avoid deep discharging — charge as soon as possible", "Do not attempt fast charging until diagnosed", "This may be covered under your battery warranty"],
        };
      }
      return {
        likelyIssue: "Battery Capacity Drift",
        description: "Gradual range loss can be caused by normal battery aging, frequent fast charging, or environmental factors. A battery health check can determine if this is within expected degradation rates.",
        costRange: "$80 - $150",
        serviceType: "obd_diagnostic",
        serviceLabel: "Battery Health Analysis",
        confidence: 75,
        severity: "medium",
        tips: ["Charge between 20-80% for daily use to slow degradation", "Minimize DC fast charging when possible", "Check your battery's state of health percentage in vehicle settings"],
      };
    }
    case "hv_warning": {
      if (answers["hv_driving"] === "Won't move at all") {
        return {
          likelyIssue: "High Voltage System Fault",
          description: "A high voltage warning combined with inability to drive indicates a critical safety fault in the HV battery, wiring, or contactors. The vehicle has disabled drive as a safety measure. Requires immediate EV-safe towing.",
          costRange: "$150 - $300",
          serviceType: "tow",
          serviceLabel: "EV-Safe Emergency Tow",
          confidence: 95,
          severity: "critical",
          tips: ["Do not touch any orange cables under the hood", "Stay away from any visible damage to the battery pack", "Only certified EV technicians should work on HV systems"],
        };
      }
      return {
        likelyIssue: "HV Battery Management Alert",
        description: "The battery management system has detected an anomaly. While the vehicle is still drivable, the system may limit power to protect components. Professional EV diagnostics are recommended.",
        costRange: "$100 - $200",
        serviceType: "obd_diagnostic",
        serviceLabel: "HV System Diagnostic",
        confidence: 80,
        severity: "high",
        tips: ["Drive to the nearest safe location and avoid highways if possible", "Reduced power mode is the vehicle protecting itself — don't ignore it", "Schedule a service appointment as soon as possible"],
      };
    }
    case "ev_other":
    default: {
      if (answers["ev_category"] === "12V auxiliary battery") {
        return {
          likelyIssue: "12V Auxiliary Battery Failure",
          description: "EVs rely on a 12V battery for accessories and to boot up the main HV system. A failing 12V battery can prevent the vehicle from starting even with a full main battery.",
          costRange: "$50 - $120",
          serviceType: "jump_start",
          serviceLabel: "12V Battery Service",
          confidence: 90,
          severity: "medium",
          tips: ["EV 12V batteries typically last 3-5 years", "A jump start may get you going temporarily", "The 12V battery is often located in the trunk or under the hood"],
        };
      }
      return {
        likelyIssue: "General EV Diagnostic Needed",
        description: "Based on your description, an EV-specialized on-site diagnostic is recommended. A certified EV technician will use advanced diagnostic tools to identify the exact issue.",
        costRange: "$75 - $180",
        serviceType: "obd_diagnostic",
        serviceLabel: "EV Diagnostic",
        confidence: 55,
        severity: "medium",
        tips: ["Note any warning lights or error codes on the dashboard", "Describe unusual sounds, smells, or behaviors", "Check if the issue correlates with temperature or charging"],
      };
    }
  }
}

function ProgressDots({ step, totalSteps, ev }: { step: number; totalSteps: number; ev: EVColors }) {
  return (
    <View style={pStyles.progressContainer}>
      {[...Array(totalSteps)].map((_, i) => (
        <View
          key={i}
          style={[
            pStyles.progressDot,
            {
              backgroundColor: i <= step ? ev.neonGreen : ev.border,
              flex: 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SeverityBadge({ severity, ev }: { severity: DiagnosticResult["severity"]; ev: EVColors }) {
  const colors = {
    low: ev.neonGreen,
    medium: ev.neonYellow,
    high: ev.neonPink,
    critical: "#FF3B30",
  };
  const labels = {
    low: "Low Severity",
    medium: "Medium Severity",
    high: "High Severity",
    critical: "Critical",
  };

  return (
    <View style={[pStyles.severityBadge, { backgroundColor: colors[severity] + "20", borderColor: colors[severity] + "40" }]}>
      <View style={[pStyles.severityDot, { backgroundColor: colors[severity] }]} />
      <Animated.Text style={[pStyles.severityText, { color: colors[severity] }]}>{labels[severity]}</Animated.Text>
    </View>
  );
}

function ConfidenceMeter({ confidence, ev }: { confidence: number; ev: EVColors }) {
  const color = confidence >= 90 ? ev.neonGreen : confidence >= 70 ? ev.neonYellow : ev.neonCyan;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(confidence, { damping: 15, stiffness: 80 });
  }, [confidence]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={pStyles.confidenceContainer}>
      <View style={pStyles.confidenceHeader}>
        <Animated.Text style={[pStyles.confidenceLabel, { color: ev.whiteDim }]}>Diagnostic Confidence</Animated.Text>
        <Animated.Text style={[pStyles.confidenceValue, { color }]}>{confidence}%</Animated.Text>
      </View>
      <View style={[pStyles.confidenceTrack, { backgroundColor: ev.border }]}>
        <Animated.View style={[pStyles.confidenceFill, { backgroundColor: color }, fillStyle]} />
      </View>
    </View>
  );
}

export default function EVDiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const ev = getEVColors(isDark);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(0);
  const [selectedSymptom, setSelectedSymptom] = useState<EVSymptomKey | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);

  const followUpQuestions = selectedSymptom ? EV_FOLLOW_UP_QUESTIONS[selectedSymptom] : [];
  const totalSteps = 3;

  const handleSymptomSelect = (key: EVSymptomKey) => {
    setSelectedSymptom(key);
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
    } else {
      navigation.goBack();
    }
  };

  const handleFollowUpAnswer = (questionId: string, answer: string) => {
    setFollowUpAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const result = selectedSymptom ? getEVDiagnosticResult(selectedSymptom, followUpAnswers) : null;

  const handleRequestService = () => {
    if (!result) return;
    const notes = `EV Diagnostic: ${result.likelyIssue} (${result.confidence}% confidence, ${result.severity} severity). ${result.description}`;
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

  return (
    <View style={[pStyles.container, { backgroundColor: ev.bg }]}>
      <EVAnimatedBackground isDark={isDark} />

      <View style={[pStyles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleBack} style={pStyles.backButton} hitSlop={12}>
          <Feather name={step === 0 ? "x" : "arrow-left"} size={22} color={ev.white} />
        </Pressable>
        <Animated.Text style={[pStyles.headerTitle, { color: ev.white }]}>EV Diagnostic</Animated.Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressDots step={step} totalSteps={totalSteps} ev={ev} />

      <ScrollView
        style={pStyles.scrollView}
        contentContainerStyle={[pStyles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Animated.Text style={[pStyles.stepTitle, { color: ev.white }]}>
              What's going on with your EV?
            </Animated.Text>
            <Animated.Text style={[pStyles.stepSubtitle, { color: ev.whiteDim }]}>
              Select the issue that best matches your situation
            </Animated.Text>
            {EV_SYMPTOMS.map((symptom) => {
              const isSelected = selectedSymptom === symptom.key;
              return (
                <Pressable
                  key={symptom.key}
                  onPress={() => handleSymptomSelect(symptom.key)}
                  style={[
                    pStyles.symptomCard,
                    {
                      backgroundColor: isSelected ? ev.neonGreen + "15" : ev.bgCard,
                      borderColor: isSelected ? ev.neonGreen : ev.border,
                    },
                  ]}
                >
                  <View style={[pStyles.symptomIcon, { backgroundColor: isSelected ? ev.neonGreen : ev.bgCardLight }]}>
                    <Feather name={symptom.icon} size={22} color={isSelected ? "#FFFFFF" : ev.neonCyan} />
                  </View>
                  <View style={pStyles.symptomInfo}>
                    <Animated.Text style={[pStyles.symptomLabel, { color: isSelected ? ev.neonGreen : ev.white }]}>
                      {symptom.label}
                    </Animated.Text>
                    <Animated.Text style={[pStyles.symptomDesc, { color: ev.whiteDim }]}>
                      {symptom.description}
                    </Animated.Text>
                  </View>
                  <View style={[pStyles.radioOuter, { borderColor: isSelected ? ev.neonGreen : ev.border }]}>
                    {isSelected ? <View style={[pStyles.radioInner, { backgroundColor: ev.neonGreen }]} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {step === 1 && followUpQuestions.length > 0 ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Animated.Text style={[pStyles.stepSubtitle, { color: ev.whiteDim, marginBottom: 8 }]}>
              Question {currentFollowUpIndex + 1} of {followUpQuestions.length}
            </Animated.Text>
            <Animated.Text style={[pStyles.stepTitle, { color: ev.white, marginBottom: 24 }]}>
              {followUpQuestions[currentFollowUpIndex].question}
            </Animated.Text>
            {followUpQuestions[currentFollowUpIndex].options.map((option) => {
              const isSelected = followUpAnswers[followUpQuestions[currentFollowUpIndex].id] === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => handleFollowUpAnswer(followUpQuestions[currentFollowUpIndex].id, option)}
                  style={[
                    pStyles.optionCard,
                    {
                      backgroundColor: isSelected ? ev.neonCyan + "15" : ev.bgCard,
                      borderColor: isSelected ? ev.neonCyan : ev.border,
                    },
                  ]}
                >
                  <View style={[pStyles.radioOuter, { borderColor: isSelected ? ev.neonCyan : ev.border }]}>
                    {isSelected ? <View style={[pStyles.radioInner, { backgroundColor: ev.neonCyan }]} /> : null}
                  </View>
                  <Animated.Text style={[pStyles.optionText, { color: isSelected ? ev.neonCyan : ev.white }]}>
                    {option}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        {step === 2 && result ? (
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={[pStyles.resultHeader, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
              <View style={[pStyles.resultIconWrap, { backgroundColor: ev.neonGreen + "20" }]}>
                <Feather name="cpu" size={28} color={ev.neonGreen} />
              </View>
              <Animated.Text style={[pStyles.resultTitle, { color: ev.white }]}>
                {result.likelyIssue}
              </Animated.Text>
              <SeverityBadge severity={result.severity} ev={ev} />
              <ConfidenceMeter confidence={result.confidence} ev={ev} />
            </View>

            <View style={[pStyles.resultCard, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
              <Animated.Text style={[pStyles.resultDesc, { color: ev.whiteDim }]}>
                {result.description}
              </Animated.Text>
            </View>

            <View style={[pStyles.resultCard, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
              <View style={pStyles.costRow}>
                <View style={pStyles.costLabel}>
                  <Feather name="dollar-sign" size={18} color={ev.neonGreen} />
                  <Animated.Text style={[pStyles.costLabelText, { color: ev.white }]}>Estimated Cost</Animated.Text>
                </View>
                <Animated.Text style={[pStyles.costValue, { color: ev.neonGreen }]}>{result.costRange}</Animated.Text>
              </View>
              <View style={[pStyles.divider, { backgroundColor: ev.border }]} />
              <View style={pStyles.costRow}>
                <View style={pStyles.costLabel}>
                  <Feather name="tool" size={18} color={ev.neonCyan} />
                  <Animated.Text style={[pStyles.costLabelText, { color: ev.white }]}>Recommended Service</Animated.Text>
                </View>
                <View style={[pStyles.serviceBadge, { backgroundColor: ev.neonCyan + "20" }]}>
                  <Animated.Text style={[pStyles.serviceBadgeText, { color: ev.neonCyan }]}>{result.serviceLabel}</Animated.Text>
                </View>
              </View>
            </View>

            <View style={[pStyles.resultCard, { backgroundColor: ev.bgCard, borderColor: ev.border }]}>
              <Animated.Text style={[pStyles.tipsTitle, { color: ev.white }]}>EV Tips</Animated.Text>
              {result.tips.map((tip, index) => (
                <View key={index} style={pStyles.tipRow}>
                  <Feather name="check-circle" size={16} color={ev.neonGreen} />
                  <Animated.Text style={[pStyles.tipText, { color: ev.whiteDim }]}>{tip}</Animated.Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleRequestService}
              style={pStyles.requestButton}
            >
              <LinearGradient
                colors={[ev.neonGreen, ev.neonCyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={pStyles.requestButtonGradient}
              >
                <Feather name="zap" size={20} color="#FFFFFF" />
                <Animated.Text style={pStyles.requestButtonText}>Request This Service</Animated.Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => { setStep(0); setSelectedSymptom(null); setFollowUpAnswers({}); setCurrentFollowUpIndex(0); }}
              style={[pStyles.startOverButton, { borderColor: ev.border }]}
            >
              <Animated.Text style={[pStyles.startOverText, { color: ev.whiteDim }]}>Start Over</Animated.Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>

      {step < 2 ? (
        <View style={[pStyles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: ev.bg + "E6" }]}>
          <Pressable
            onPress={handleNext}
            disabled={!canProceed()}
            style={[pStyles.nextButton, { opacity: canProceed() ? 1 : 0.4 }]}
          >
            <LinearGradient
              colors={canProceed() ? [ev.neonGreen, ev.neonCyan] : [ev.border, ev.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={pStyles.nextButtonGradient}
            >
              <Animated.Text style={pStyles.nextButtonText}>
                {step === 0 ? "Next" : currentFollowUpIndex < followUpQuestions.length - 1 ? "Next Question" : "Get Diagnosis"}
              </Animated.Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const pStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 16,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
  },
  symptomCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  symptomIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  symptomInfo: {
    flex: 1,
    marginRight: 12,
  },
  symptomLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  symptomDesc: {
    fontSize: 13,
    lineHeight: 18,
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
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    gap: 14,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  resultHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  resultIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  confidenceContainer: {
    width: "100%",
  },
  confidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 13,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  confidenceTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    height: 6,
    borderRadius: 3,
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 15,
    lineHeight: 24,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  costLabelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  costValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  serviceBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  requestButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  requestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  startOverButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  startOverText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
