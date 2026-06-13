import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";

type Step = "email" | "code";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputBg     = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundDefault;
  const inputBorder = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const labelColor  = isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  const textColor   = isDark ? "#FFFFFF" : theme.text;
  const phColor     = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";
  const backBg      = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const hintColor   = isDark ? "rgba(255,255,255,0.35)" : theme.textSecondary;
  const btnColors   = isDark ? ["#2A2A2A", "#181818"] as [string, string] : ["#1A1A1A", "#0A0A0A"] as [string, string];

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      const data = await res.json() as { success: boolean; reset_code?: string | null };
      if (data.success) {
        if (data.reset_code) {
          setCode(data.reset_code);
          Alert.alert(
            "Your Reset Code",
            `Your 6-digit code is:\n\n${data.reset_code}\n\nWe've filled it in for you — just set your new password below.`,
            [{ text: "Continue", onPress: () => setStep("code") }]
          );
        } else {
          setStep("code");
        }
      }
    } catch {
      Alert.alert("Error", "Could not send reset code. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code.trim() || code.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit code.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords match.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        email: email.trim(),
        code: code.trim(),
        newPassword,
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        Alert.alert(
          "Password Reset",
          "Your password has been updated. Please sign in with your new password.",
          [{ text: "Sign In", onPress: () => navigation.navigate("SignIn") }]
        );
      } else {
        Alert.alert("Reset Failed", data.error || "Invalid or expired code.");
      }
    } catch {
      Alert.alert("Error", "Could not reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground showEkg={false} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View style={[styles.backBtnInner, { backgroundColor: backBg }]}>
              <Feather name="arrow-left" size={20} color={isDark ? "#FFF" : theme.text} />
            </View>
          </Pressable>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? "rgba(0,102,255,0.15)" : "rgba(0,102,255,0.1)" }]}>
            <Feather name="lock" size={28} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={{ color: theme.text, marginBottom: Spacing.xs }}>
            {step === "email" ? "Forgot Password?" : "Enter Reset Code"}
          </ThemedText>
          <ThemedText type="body" style={{ color: hintColor, textAlign: "center" }}>
            {step === "email"
              ? "Enter your email and we'll generate a 6-digit reset code for you."
              : `Enter the code we provided and choose a new password.`}
          </ThemedText>
        </View>

        {step === "email" ? (
          <View style={styles.form}>
            <View>
              <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>
                Email Address
              </ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="mail" size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={phColor}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            <Pressable
              style={[styles.btn, { opacity: isLoading ? 0.7 : 1, overflow: "hidden" }]}
              onPress={handleSendCode}
              disabled={isLoading}
            >
              <LinearGradient colors={btnColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                {isLoading ? "Sending..." : "Send Reset Code"}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View>
              <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>
                6-Digit Code
              </ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="hash" size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} />
                <TextInput
                  style={[styles.input, { color: textColor, letterSpacing: 6, fontSize: 20 }]}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={phColor}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View>
              <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>
                New Password
              </ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="lock" size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor={phColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} />
                </Pressable>
              </View>
            </View>

            <View>
              <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>
                Confirm New Password
              </ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="lock" size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"} />
                <TextInput
                  style={[styles.input, { color: textColor }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={phColor}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>

            <Pressable
              style={[styles.btn, { opacity: isLoading ? 0.7 : 1, overflow: "hidden" }]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient colors={btnColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </ThemedText>
            </Pressable>

            <Pressable onPress={() => setStep("email")} style={{ alignItems: "center" }}>
              <ThemedText type="small" style={{ color: hintColor }}>Didn't get a code? Go back</ThemedText>
            </Pressable>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: Spacing.xl },
  backBtn: { alignSelf: "flex-start", marginBottom: Spacing.xl },
  backBtnInner: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: Spacing.lg },
  form: { gap: Spacing.lg },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: BorderRadius.md, gap: 10, borderWidth: 1 },
  input: { flex: 1, fontSize: 16 },
  btn: { paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: "center" },
});
