import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
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
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: InputFieldProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <ThemedText type="small" style={[styles.inputLabel, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: isFocused ? theme.primary : theme.border,
            borderWidth: 1,
          },
        ]}
      >
        <Feather name={icon} size={20} color={isFocused ? theme.primary : theme.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsAuthenticated, setAuthUser } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setAuthUser({
        id: `user_${Date.now()}`,
        name: "Returning User",
        email: email.trim(),
        phone: "+1 555-0000",
      });
      setIsAuthenticated(true);
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "RoleSelection" }],
        })
      );
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h2" style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to continue with ServiceMe
          </ThemedText>
        </View>

        <View style={styles.form}>
          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            icon="mail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable style={styles.forgotPassword}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              Forgot Password?
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[
              styles.signInButton,
              animatedButtonStyle,
              { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleSignIn}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading}
          >
            <ThemedText type="body" style={styles.signInButtonText}>
              {isLoading ? "Signing In..." : "Sign In"}
            </ThemedText>
          </AnimatedPressable>

          <View style={styles.signUpRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Don't have an account?
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("SignUp")}>
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                {" "}Sign Up
              </ThemedText>
            </Pressable>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.lg,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {},
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: Spacing.xs,
  },
  footer: {
    marginTop: "auto",
    gap: Spacing.lg,
  },
  signInButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  signInButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  signUpRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
