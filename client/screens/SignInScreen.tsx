import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, Image, Keyboard } from "react-native";
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
import { apiRequest, setAuthToken } from "@/lib/query-client";
import { saveAuthToken } from "@/lib/secureStorage";

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

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsAuthenticated, setAuthUser, userRole, currentDriver, currentProvider, setUserRole, setCurrentProvider } = useApp();
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

  const handleGoogleSuccess = (googleUser: { id: string; name: string; email: string }) => {
    setAuthUser({
      id: `google_${googleUser.id}`,
      name: googleUser.name,
      email: googleUser.email,
      phone: "",
    });
    setIsAuthenticated(true);
    navigateAfterAuth();
  };

  const handleGoogleError = (error: string) => {
    if (error && !error.toLowerCase().includes("cancel")) {
      Alert.alert("Google Sign-In Failed", error);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/signin", {
        email: email.trim(),
        password,
      });
      const data = await res.json() as {
        userId: string; token: string; role: string;
        name: string; email: string; phone: string;
      };
      setAuthToken(data.token);
      await saveAuthToken(data.token);
      setAuthUser({ id: data.userId, name: data.name, email: data.email, phone: data.phone });
      setIsAuthenticated(true);

      if (data.role === "provider") {
        setUserRole("provider");
        // Navigate immediately — don't block on the provider-data fetch
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
        // Load provider profile in the background after the screen is already open
        apiRequest("GET", `/api/providers/by-email/${encodeURIComponent(data.email)}`)
          .then((provRes) => provRes.ok ? provRes.json() : null)
          .then((provData) => { if (provData) setCurrentProvider(provData); })
          .catch(() => {});
      } else {
        navigateAfterAuth();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      const friendly = msg.includes("401") ? "Email or password is incorrect." : "Could not sign in. Please try again.";
      Alert.alert("Sign In Failed", friendly);
    } finally {
      setIsLoading(false);
    }
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
          <ThemedText type="h2" style={styles.title}>Welcome Back</ThemedText>
          <ThemedText type="body" style={styles.subtitle}>Sign in to continue with ServiceMe</ThemedText>
        </View>

        <View style={styles.form}>
          <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail" keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" icon="lock" secureTextEntry autoCapitalize="none" />
          <Pressable style={styles.forgotPassword}>
            <ThemedText type="small" style={{ color: "#00D9FF" }}>Forgot Password?</ThemedText>
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
            <LinearGradient colors={["#FF6B35", "#FF3D00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
            <ThemedText type="body" style={styles.signInButtonText}>
              {isLoading ? "Signing In..." : "Sign In"}
            </ThemedText>
          </AnimatedPressable>

          <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

          <View style={styles.signUpRow}>
            <ThemedText type="body" style={{ color: "rgba(255,255,255,0.5)" }}>Don't have an account?</ThemedText>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <ThemedText type="body" style={{ color: "#00D9FF", fontWeight: "600" }}> Sign Up</ThemedText>
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
  forgotPassword: { alignSelf: "flex-end", marginTop: 4 },
  footer: { marginTop: "auto", gap: Spacing.lg },
  signInButton: { paddingVertical: 16, borderRadius: 16, alignItems: "center", overflow: "hidden" },
  signInButtonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  signUpRow: { flexDirection: "row", justifyContent: "center" },
});
