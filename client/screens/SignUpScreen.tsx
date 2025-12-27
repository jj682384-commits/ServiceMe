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

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setIsAuthenticated, setAuthUser } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setAuthUser({
        id: `user_${Date.now()}`,
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
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
            Create Account
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign up to get started with roadside assistance
          </ThemedText>
        </View>

        <View style={styles.form}>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            icon="user"
            autoCapitalize="words"
          />
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
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            icon="phone"
            keyboardType="phone-pad"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
          />
          <InputField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            icon="lock"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <View style={styles.footer}>
          <AnimatedPressable
            style={[
              styles.signUpButton,
              animatedButtonStyle,
              { backgroundColor: theme.primary, opacity: isLoading ? 0.7 : 1 },
            ]}
            onPress={handleSignUp}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading}
          >
            <ThemedText type="body" style={styles.signUpButtonText}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </ThemedText>
          </AnimatedPressable>

          <View style={styles.signInRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Already have an account?
            </ThemedText>
            <Pressable onPress={() => navigation.navigate("SignIn")}>
              <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                {" "}Sign In
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
  footer: {
    marginTop: "auto",
    gap: Spacing.lg,
  },
  signUpButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  signInRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
});
