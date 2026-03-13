import React, { useState, useCallback } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

function InputField({
  label, value, onChangeText, placeholder, icon,
  secureTextEntry, keyboardType = "default", autoCapitalize = "sentences",
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <ThemedText type="small" style={styles.inputLabel}>{label}</ThemedText>
      <View style={[styles.inputWrapper, isFocused ? styles.inputWrapperFocused : null]}>
        <Feather name={icon} size={18} color={isFocused ? "#00D9FF" : "rgba(255,255,255,0.4)"} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          blurOnSubmit
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const LEGAL_DOCUMENTS = [
  {
    key: "privacy" as const,
    title: "Privacy Policy",
    icon: "shield" as const,
    summary: "How we collect, use, and protect your personal information including location data, payment details, and service history.",
    sections: [
      { heading: "Information We Collect", content: "We collect personal information (name, email, phone, payment info, vehicle details), location data (real-time GPS during service requests), device information, and service history." },
      { heading: "How We Use It", content: "To connect you with nearby providers, process payments, calculate arrival times, send notifications, and improve our services." },
      { heading: "Information Sharing", content: "Your location and contact info are shared with assigned providers. We also use payment processors, analytics, cloud storage, and map services." },
      { heading: "Your Rights", content: "You can request access, correction, deletion, or portability of your data. Opt out of marketing communications at any time. Contact privacy@serviceme.app." },
    ],
  },
  {
    key: "terms" as const,
    title: "Terms of Service",
    icon: "file-text" as const,
    summary: "Rules governing your use of ServiceMe, including your responsibilities, payment terms, and dispute resolution procedures.",
    sections: [
      { heading: "Platform Role", content: "ServiceMe connects drivers with independent service providers. We do not directly provide roadside assistance services. Providers are independent contractors." },
      { heading: "Your Responsibilities", content: "Provide accurate information, be present when providers arrive, treat providers with respect, and pay all applicable fees. Do not submit false requests or harass providers." },
      { heading: "Pricing & Payment", content: "Prices are displayed before confirmation. Payment is processed after service completion. Premium members receive discounted rates. All fees are non-refundable except per our Refund Policy." },
      { heading: "Dispute Resolution", content: "Disputes are resolved through binding arbitration in San Francisco, CA. You waive the right to participate in class action lawsuits. Governed by California law." },
    ],
  },
  {
    key: "liability" as const,
    title: "Liability Disclaimer",
    icon: "alert-triangle" as const,
    summary: "Important limitations on ServiceMe's liability and your assumption of risks when using roadside assistance services.",
    sections: [
      { heading: "Assumption of Risk", content: "Roadside assistance involves inherent risks including vehicle damage, personal injury, and property damage. You voluntarily assume all risks. ServiceMe has no control over the quality of work performed." },
      { heading: "Vehicle & Property", content: "You are responsible for vehicle safety and location. Minor damage may occur during services. Remove valuables before towing. ServiceMe is not liable for pre-existing conditions." },
      { heading: "Limitation of Liability", content: "ServiceMe is not liable for personal injury, vehicle damage, loss of income, or any indirect damages. Total liability is capped at fees paid in the prior 12 months or $100, whichever is greater." },
      { heading: "Insurance", content: "ServiceMe does not provide insurance. Customers should maintain auto insurance. Providers must maintain general liability insurance (min $1M recommended) and commercial auto insurance." },
    ],
  },
];

interface LegalDocumentCardProps {
  doc: typeof LEGAL_DOCUMENTS[number];
  isAccepted: boolean;
  isExpanded: boolean;
  onToggleAccept: () => void;
  onToggleExpand: () => void;
}

function LegalDocumentCard({ doc, isAccepted, isExpanded, onToggleAccept, onToggleExpand }: LegalDocumentCardProps) {
  const iconColor = doc.key === "liability" ? "#F59E0B" : "#00D9FF";

  return (
    <View style={styles.legalCard}>
      <Pressable onPress={onToggleExpand} style={styles.legalCardHeader}>
        <Feather name={doc.icon} size={18} color={iconColor} />
        <ThemedText type="body" style={styles.legalCardTitle}>{doc.title}</ThemedText>
        <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>

      {isExpanded ? (
        <View style={styles.legalCardBody}>
          <ThemedText type="small" style={styles.legalSummary}>{doc.summary}</ThemedText>
          {doc.sections.map((section, idx) => (
            <View key={idx} style={styles.legalSectionItem}>
              <ThemedText type="small" style={styles.legalSectionHeading}>{section.heading}</ThemedText>
              <ThemedText type="small" style={styles.legalSectionContent}>{section.content}</ThemedText>
            </View>
          ))}
          <ThemedText type="small" style={styles.fullDocLink}>View full document in Settings after sign up</ThemedText>
        </View>
      ) : null}

      <Pressable onPress={onToggleAccept} style={styles.acceptRow}>
        <View style={[styles.checkbox, isAccepted ? styles.checkboxChecked : null]}>
          {isAccepted ? <Feather name="check" size={14} color="#FFF" /> : null}
        </View>
        <ThemedText type="small" style={styles.acceptText}>I have read and accept the {doc.title}</ThemedText>
      </Pressable>
    </View>
  );
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsAuthenticated, setAuthUser, setUserRole, setCurrentDriver } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedDocs, setAcceptedDocs] = useState<Record<string, boolean>>({ privacy: false, terms: false, liability: false });
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const allAccepted = acceptedDocs.privacy && acceptedDocs.terms && acceptedDocs.liability;
  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleGoogleSuccess = (googleUser: { id: string; name: string; email: string }) => {
    const userId = `google_${googleUser.id}`;
    setAuthUser({ id: userId, name: googleUser.name, email: googleUser.email, phone: "" });
    setIsAuthenticated(true);
    setUserRole("driver");
    setCurrentDriver({ id: userId, name: googleUser.name, email: googleUser.email, phone: "", avatarPreset: Math.floor(Math.random() * 5) + 1, membership: "free" });
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
  };

  const handleGoogleError = (error: string) => {
    if (error && !error.toLowerCase().includes("cancel")) {
      Alert.alert("Google Sign-In Failed", error);
    }
  };

  const toggleAccept = useCallback((key: string) => {
    setAcceptedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpandedDoc((prev) => (prev === key ? null : key));
  }, []);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields to continue.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please try again.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long.");
      return;
    }
    if (!allAccepted) {
      Alert.alert("Agreement Required", "Please read and accept the Privacy Policy, Terms of Service, and Liability Disclaimer before creating your account.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const userId = `user_${Date.now()}`;
      setAuthUser({ id: userId, name: fullName.trim(), email: email.trim(), phone: phone.trim() });
      setIsAuthenticated(true);

      setUserRole("driver");
      setCurrentDriver({ id: userId, name: fullName.trim(), email: email.trim(), phone: phone.trim(), avatarPreset: Math.floor(Math.random() * 5) + 1, membership: "free" });
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
    }, 1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: DARK_BG }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonBg}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </View>
          </Pressable>
          <ThemedText type="h2" style={styles.title}>Create Account</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>Sign up to get started with roadside assistance</ThemedText>
        </View>

        <View style={styles.googleSection}>
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            showDivider={false}
          />
        </View>

        <View style={styles.form}>
          <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" icon="user" autoCapitalize="words" />
          <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail" keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" icon="phone" keyboardType="phone-pad" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" icon="lock" secureTextEntry autoCapitalize="none" />
          <InputField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" icon="lock" secureTextEntry autoCapitalize="none" />
        </View>

        <View style={styles.legalAgreements}>
          <ThemedText type="h4" style={styles.legalTitle}>Legal Agreements</ThemedText>
          <ThemedText type="small" style={styles.legalSubtitleText}>Please review and accept each to continue</ThemedText>
          {LEGAL_DOCUMENTS.map((doc) => (
            <LegalDocumentCard
              key={doc.key}
              doc={doc}
              isAccepted={acceptedDocs[doc.key]}
              isExpanded={expandedDoc === doc.key}
              onToggleAccept={() => toggleAccept(doc.key)}
              onToggleExpand={() => toggleExpand(doc.key)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.signUpButton, animatedButtonStyle, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSignUp}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading}
          >
            <LinearGradient
              colors={allAccepted ? ["#FF6B35", "#FF3D00"] : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <ThemedText type="body" style={[styles.signUpButtonText, { color: allAccepted ? "#FFF" : "rgba(255,255,255,0.4)" }]}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </ThemedText>
          </AnimatedPressable>

          {!allAccepted ? (
            <View style={styles.acceptHint}>
              <Feather name="info" size={14} color="rgba(255,255,255,0.4)" />
              <ThemedText type="small" style={styles.acceptHintText}>Accept all agreements above to create your account</ThemedText>
            </View>
          ) : null}

          <View style={styles.signInRow}>
            <ThemedText type="body" style={{ color: "rgba(255,255,255,0.5)" }}>Already have an account?</ThemedText>
            <Pressable onPress={() => navigation.navigate("SignIn")}>
              <ThemedText type="body" style={{ color: "#00D9FF", fontWeight: "600" }}> Sign In</ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  header: { marginBottom: Spacing.xl },
  backButton: { marginBottom: Spacing.lg },
  backButtonBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  title: { color: "#FFF", marginBottom: Spacing.xs },
  subtitle: { color: "rgba(255,255,255,0.5)" },
  form: { gap: 16, marginBottom: Spacing.xl },
  inputContainer: { gap: 6 },
  inputLabel: { fontWeight: "500", color: "rgba(255,255,255,0.6)", fontSize: 13 },
  inputWrapper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: 14, gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  inputWrapperFocused: { borderColor: "rgba(0,217,255,0.4)", backgroundColor: "rgba(0,217,255,0.06)" },
  input: { flex: 1, fontSize: 16, color: "#FFF" },
  legalAgreements: { marginBottom: Spacing.xl },
  legalTitle: { marginBottom: Spacing.xs, color: "#FFF" },
  legalSubtitleText: { marginBottom: Spacing.md, color: "rgba(255,255,255,0.4)" },
  legalCard: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", marginBottom: 10, overflow: "hidden" },
  legalCardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  legalCardTitle: { fontWeight: "600", flex: 1, color: "#FFF", fontSize: 15 },
  legalCardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  legalSummary: { lineHeight: 20, marginBottom: Spacing.md, color: "rgba(255,255,255,0.5)" },
  legalSectionItem: { marginBottom: Spacing.sm },
  legalSectionHeading: { fontWeight: "600", marginBottom: 4, color: "rgba(255,255,255,0.7)" },
  legalSectionContent: { color: "rgba(255,255,255,0.45)", lineHeight: 20 },
  fullDocLink: { marginTop: Spacing.sm, fontWeight: "500", fontStyle: "italic", color: "#00D9FF" },
  acceptRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)" },
  acceptText: { flex: 1, color: "rgba(255,255,255,0.5)" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { borderColor: "#00E676", backgroundColor: "#00E676" },
  footer: { marginTop: "auto", gap: Spacing.lg },
  signUpButton: { paddingVertical: 16, borderRadius: 16, alignItems: "center", overflow: "hidden" },
  signUpButtonText: { fontWeight: "700", fontSize: 16 },
  acceptHint: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  acceptHintText: { color: "rgba(255,255,255,0.4)", marginLeft: Spacing.xs },
  signInRow: { flexDirection: "row", justifyContent: "center" },
  googleSection: { marginBottom: Spacing.lg, gap: Spacing.lg },
});
