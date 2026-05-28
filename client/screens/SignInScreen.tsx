import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground, { DARK_BG, LIGHT_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest, setAuthToken } from "@/lib/query-client";
import { saveAuthToken } from "@/lib/secureStorage";
import * as AppleAuthentication from "expo-apple-authentication";

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

function InputField({ label, value, onChangeText, placeholder, icon, secureTextEntry, keyboardType = "default", autoCapitalize = "sentences" }: InputFieldProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputBg      = isDark ? "rgba(255,255,255,0.06)" : theme.backgroundDefault;
  const inputBorder  = isDark ? "rgba(255,255,255,0.08)" : theme.border;
  const focusBg      = isDark ? "rgba(192,192,192,0.05)" : theme.backgroundSecondary;
  const focusBorder  = isDark ? "rgba(192,192,192,0.30)" : "#555555";
  const iconColor    = isFocused
    ? (isDark ? "#C0C0C0" : "#333333")
    : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)");
  const labelColor   = isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary;
  const textColor    = isDark ? "#FFFFFF" : theme.text;
  const placeholderColor = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)";

  return (
    <View style={styles.inputContainer}>
      <ThemedText type="small" style={{ fontWeight: "500", color: labelColor, fontSize: 13, marginBottom: 6 }}>{label}</ThemedText>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: isFocused ? focusBg : inputBg, borderColor: isFocused ? focusBorder : inputBorder },
      ]}>
        <Feather name={icon} size={18} color={iconColor} />
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
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
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { setIsAuthenticated, setAuthUser, userRole, currentDriver, currentProvider, setUserRole, setCurrentProvider, setCurrentDriver } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const navigateAfterAuth = () => {
    if (userRole === "driver" && currentDriver) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
    } else if (userRole === "provider" && currentProvider) {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
    } else {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "RoleSelection" }] }));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ")
        : undefined;
      const res = await apiRequest("POST", "/api/auth/apple-signin", {
        appleUserId: credential.user,
        email: credential.email ?? undefined,
        fullName,
      });
      type AuthData = { userId: string; token: string; role: string; name: string; email: string; phone: string };
      const data = await res.json() as AuthData;
      setAuthToken(data.token);
      saveAuthToken(data.token).catch(() => {});
      const freshUser = { id: data.userId, name: data.name, email: data.email, phone: data.phone };
      setAuthUser(freshUser);
      setIsAuthenticated(true);
      setUserRole("driver");
      const updatedDriver = currentDriver
        ? { ...currentDriver, name: data.name, email: data.email, phone: data.phone }
        : { id: data.userId, name: data.name, email: data.email, phone: data.phone, avatarPreset: 1, membership: "free" as const };
      setCurrentDriver(updatedDriver);
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign-In Failed", err.message || "Something went wrong. Please try again.");
      }
    }
  };

  const handleGoogleSuccess = (googleUser: { id: string; name: string; email: string }) => {
    setAuthUser({ id: `google_${googleUser.id}`, name: googleUser.name, email: googleUser.email, phone: "" });
    setIsAuthenticated(true);
    navigateAfterAuth();
  };

  const handleGoogleError = (error: string) => {
    if (error && !error.toLowerCase().includes("cancel")) Alert.alert("Google Sign-In Failed", error);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    type AuthData = { userId: string; token: string; role: string; name: string; email: string; phone: string; };
    let data: AuthData | null = null;
    try {
      const res = await apiRequest("POST", "/api/auth/signin", { email: email.trim(), password });
      data = await res.json() as AuthData;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      Alert.alert("Sign In Failed", msg.includes("401") ? "Email or password is incorrect." : "Could not connect to the server. Check your connection and try again.");
      setIsLoading(false);
      return;
    }
    if (!data) { setIsLoading(false); return; }
    setAuthToken(data.token);
    saveAuthToken(data.token).catch(() => {});
    const freshUser = { id: data.userId, name: data.name, email: data.email, phone: data.phone };
    setAuthUser(freshUser);
    setIsAuthenticated(true);
    if (data.role === "provider") {
      setUserRole("provider");
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
      apiRequest("GET", `/api/providers/by-email/${encodeURIComponent(data.email)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setCurrentProvider(d); })
        .catch(() => {});
    } else {
      setUserRole("driver");
      const updatedDriver = currentDriver
        ? { ...currentDriver, name: data.name, email: data.email, phone: data.phone }
        : { id: data.userId, name: data.name, email: data.email, phone: data.phone, avatarPreset: 1, membership: "free" as const };
      setCurrentDriver(updatedDriver);
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "DriverTabs" }] }));
    }
    setIsLoading(false);
  };

  const backBg       = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const backIcon     = isDark ? "#FFF" : theme.text;
  const forgotColor  = isDark ? "rgba(192,192,192,0.7)" : theme.textSecondary;
  const mutedColor   = isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary;
  const signUpColor  = isDark ? "rgba(192,192,192,0.85)" : theme.text;
  const btnColors    = isDark ? ["#2A2A2A", "#181818"] as [string,string] : ["#1A1A1A", "#0A0A0A"] as [string,string];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? DARK_BG : LIGHT_BG }]}>
      <AnimatedBackground showEkg={false} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={[styles.backButtonBg, { backgroundColor: backBg }]}>
              <Feather name="arrow-left" size={20} color={backIcon} />
            </View>
          </Pressable>
          <ThemedText type="h2" style={[styles.title, { color: theme.text }]}>Welcome Back</ThemedText>
          <ThemedText type="body" style={{ color: isDark ? "rgba(255,255,255,0.5)" : theme.textSecondary }}>Sign in to continue with ResqRide</ThemedText>
        </View>

        <View style={styles.form}>
          <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail" keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" icon="lock" secureTextEntry autoCapitalize="none" />
          <Pressable
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <ThemedText type="small" style={{ color: forgotColor }}>Forgot Password?</ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.signInButton, animatedButtonStyle, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSignIn}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading}
          >
            <LinearGradient colors={btnColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
              {isLoading ? "Signing In..." : "Sign In"}
            </ThemedText>
          </AnimatedPressable>

          <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={{ width: "100%", height: 50 }}
              onPress={handleAppleSignIn}
            />
          )}

          <View style={styles.signUpRow}>
            <ThemedText type="body" style={{ color: mutedColor }}>Don't have an account?</ThemedText>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <ThemedText type="body" style={{ color: signUpColor, fontWeight: "600" }}> Sign Up</ThemedText>
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
  backButtonBg: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { marginBottom: Spacing.xs },
  form: { gap: 16, marginBottom: Spacing.xl },
  inputContainer: {},
  inputWrapper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: 14, gap: 10, borderWidth: 1 },
  input: { flex: 1, fontSize: 16 },
  forgotPassword: { alignSelf: "flex-end", marginTop: 4 },
  footer: { marginTop: "auto", gap: Spacing.lg },
  signInButton: { paddingVertical: 16, borderRadius: 16, alignItems: "center", overflow: "hidden" },
  signUpRow: { flexDirection: "row", justifyContent: "center" },
});
