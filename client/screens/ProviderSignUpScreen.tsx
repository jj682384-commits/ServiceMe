import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, Platform, ScrollView, Keyboard, FlatList, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import AnimatedBackground, { DARK_BG } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { useApp, ServiceType } from "@/context/AppContext";
import { getApiUrl, setAuthToken } from "@/lib/query-client";
import { saveAuthToken } from "@/lib/secureStorage";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import {
  VEHICLE_MAKES,
  VEHICLE_MAKES_MODELS,
  TOW_TRUCK_MAKES,
  TOW_TRUCK_MAKES_MODELS,
  TOW_TRUCK_CLASSES,
} from "@/constants/vehicleData";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ProviderSignUpRouteProp = RouteProp<RootStackParamList, "ProviderSignUp">;

const TOTAL_STEPS = 4;

const SERVICE_OPTIONS: { key: ServiceType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "flat_tire", label: "Flat Tire", icon: "disc" },
  { key: "jump_start", label: "Jump Start", icon: "battery-charging" },
  { key: "tow", label: "Towing", icon: "truck" },
  { key: "fuel", label: "Fuel Delivery", icon: "droplet" },
  { key: "lockout", label: "Lockout", icon: "key" },
  { key: "obd_diagnostic", label: "OBD Diagnostic", icon: "cpu" },
  { key: "other", label: "Other", icon: "more-horizontal" },
];

const LEGAL_DOCUMENTS = [
  {
    key: "privacy" as const,
    title: "Privacy Policy",
    icon: "shield" as const,
    summary: "How we collect, use, and protect your personal information including location data, payment details, and service history.",
  },
  {
    key: "terms" as const,
    title: "Terms of Service",
    icon: "file-text" as const,
    summary: "Rules governing your use of ServiceMe, including your responsibilities, payment terms, and dispute resolution procedures.",
  },
  {
    key: "liability" as const,
    title: "Liability Disclaimer",
    icon: "alert-triangle" as const,
    summary: "Important limitations on ServiceMe's liability and your assumption of risks when providing roadside assistance services.",
  },
];

function InputField({
  label, value, onChangeText, placeholder, icon,
  secureTextEntry, keyboardType = "default", autoCapitalize = "sentences", multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: keyof typeof Feather.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <ThemedText type="small" style={styles.inputLabel}>{label}</ThemedText>
      <View style={[styles.inputWrapper, isFocused ? styles.inputWrapperFocused : null, multiline ? { minHeight: 80, alignItems: "flex-start", paddingTop: 12 } : null]}>
        <Feather name={icon} size={18} color={isFocused ? "#00D9FF" : "rgba(255,255,255,0.4)"} style={multiline ? { marginTop: 2 } : undefined} />
        <TextInput
          style={[styles.input, multiline ? { textAlignVertical: "top", minHeight: 60 } : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={multiline ? "default" : "done"}
          onSubmitEditing={multiline ? undefined : () => Keyboard.dismiss()}
          blurOnSubmit={!multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
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

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const stepLabels = ["Personal Info", "Provider Details", "ID Verification", "Legal"];

  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <View key={i} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                isCompleted ? styles.stepDotCompleted : null,
                isActive ? styles.stepDotActive : null,
              ]}>
                {isCompleted ? <Feather name="check" size={12} color="#FFF" /> : (
                  <ThemedText type="small" style={{ color: isActive ? "#FFF" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700" }}>
                    {i + 1}
                  </ThemedText>
                )}
              </View>
              {i < totalSteps - 1 ? (
                <View style={[styles.stepLine, isCompleted ? styles.stepLineCompleted : null]} />
              ) : null}
            </View>
          );
        })}
      </View>
      <ThemedText type="small" style={styles.stepLabel}>
        Step {currentStep + 1}: {stepLabels[currentStep]}
      </ThemedText>
    </View>
  );
}

function UploadArea({ label, isUploaded, onPress, icon }: { label: string; isUploaded: boolean; onPress: () => void; icon: keyof typeof Feather.glyphMap }) {
  return (
    <Pressable onPress={onPress} style={[styles.uploadArea, isUploaded ? styles.uploadAreaDone : null]}>
      <View style={[styles.uploadIcon, isUploaded ? styles.uploadIconDone : null]}>
        <Feather name={isUploaded ? "check" : icon} size={24} color={isUploaded ? "#FFF" : "rgba(255,255,255,0.5)"} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}>{label}</ThemedText>
        <ThemedText type="small" style={{ color: isUploaded ? "#00E676" : "rgba(255,255,255,0.4)", marginTop: 2 }}>
          {isUploaded ? "Uploaded successfully" : "Tap to upload"}
        </ThemedText>
      </View>
      <Feather name={isUploaded ? "check-circle" : "upload"} size={20} color={isUploaded ? "#00E676" : "rgba(255,255,255,0.3)"} />
    </Pressable>
  );
}

function ServiceSelector({ selected, onToggle }: { selected: ServiceType[]; onToggle: (s: ServiceType) => void }) {
  return (
    <View style={styles.serviceGrid}>
      {SERVICE_OPTIONS.map((svc) => {
        const isSelected = selected.includes(svc.key);
        return (
          <Pressable
            key={svc.key}
            onPress={() => onToggle(svc.key)}
            style={[styles.serviceChip, isSelected ? styles.serviceChipSelected : null]}
          >
            <Feather name={svc.icon} size={16} color={isSelected ? "#00D9FF" : "rgba(255,255,255,0.5)"} />
            <ThemedText type="small" style={{ color: isSelected ? "#FFF" : "rgba(255,255,255,0.6)", fontWeight: isSelected ? "600" : "400" }}>
              {svc.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProviderSignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProviderSignUpRouteProp>();
  const { setIsAuthenticated, setAuthUser, setUserRole, setCurrentProvider } = useApp();
  const providerType = route.params.providerType;
  const isIndependent = providerType === "independent";

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [vehicleType, setVehicleType] = useState<"pickup" | "service_van" | "tow_truck">("pickup");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [towClass, setTowClass] = useState("");
  const [showMakePicker, setShowMakePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showTowClassPicker, setShowTowClassPicker] = useState(false);
  const [yearsExperience, setYearsExperience] = useState("");
  const [bio, setBio] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);

  const [companyName, setCompanyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [numVehicles, setNumVehicles] = useState("");
  const [numEmployees, setNumEmployees] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({});
  const [acceptedDocs, setAcceptedDocs] = useState<Record<string, boolean>>({ privacy: false, terms: false, liability: false });
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  const allAccepted = acceptedDocs.privacy && acceptedDocs.terms && acceptedDocs.liability;
  const scale = useSharedValue(1);
  const animatedButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isTowTruck = vehicleType === "tow_truck";
  const activeMakes = isTowTruck ? TOW_TRUCK_MAKES : VEHICLE_MAKES;
  const activeMakesModels = isTowTruck ? TOW_TRUCK_MAKES_MODELS : VEHICLE_MAKES_MODELS;
  const availableSignupModels = useMemo(() => {
    if (!vehicleMake) return [];
    return activeMakesModels[vehicleMake] || [];
  }, [vehicleMake, activeMakesModels]);

  const handleVehicleTypeChange = (type: "pickup" | "service_van" | "tow_truck") => {
    setVehicleType(type);
    setVehicleMake("");
    setVehicleModel("");
    setTowClass("");
  };

  const toggleService = useCallback((service: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }, []);

  const handleUpload = useCallback((docKey: string) => {
    setUploadedDocs((prev) => ({ ...prev, [docKey]: true }));
  }, []);

  const toggleAccept = useCallback((key: string) => {
    setAcceptedDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!fullName.trim() || !email.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
        Alert.alert("Missing Information", "Please fill in all fields.");
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert("Password Mismatch", "Passwords do not match.");
        return false;
      }
      if (password.length < 6) {
        Alert.alert("Weak Password", "Password must be at least 6 characters.");
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (isIndependent) {
        if (!vehicleMake.trim() || !vehicleModel.trim()) {
          Alert.alert("Missing Information", "Please enter your vehicle details.");
          return false;
        }
      } else {
        if (!companyName.trim() || !businessAddress.trim() || !licenseNumber.trim()) {
          Alert.alert("Missing Information", "Please fill in all required business information.");
          return false;
        }
      }
      if (selectedServices.length === 0) {
        Alert.alert("No Services", "Please select at least one service you can provide.");
        return false;
      }
      return true;
    }
    if (step === 2) {
      const requiredDocs = isIndependent ? ["photoId", "selfie"] : ["businessLicense", "ownerId", "insurance"];
      const allUploaded = requiredDocs.every((doc) => uploadedDocs[doc]);
      if (!allUploaded) {
        Alert.alert("Documents Required", "Please upload all required documents for identity verification.");
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!allAccepted) {
        Alert.alert("Agreement Required", "Please accept all legal agreements to continue.");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiUrl();

      // 1. Create auth account with provider role
      const signupRes = await fetch(new URL("/api/auth/signup", baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: fullName.trim(),
          phone: phone.trim(),
          password,
          role: "provider",
        }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        Alert.alert("Sign Up Failed", signupData.error || "Could not create account.");
        setIsLoading(false);
        return;
      }

      const userId: string = signupData.userId;
      const token: string = signupData.token;

      // 2. Save auth token
      setAuthToken(token);
      await saveAuthToken(token);

      // 3. Register provider profile
      const providerProfile = {
        id: userId,
        name: isIndependent ? fullName.trim() : companyName.trim(),
        phone: isIndependent ? phone.trim() : businessPhone.trim() || phone.trim(),
        email: email.trim().toLowerCase(),
        rating: 5.0,
        reviewCount: 0,
        vehicleType,
        vehicleMake: vehicleMake.trim() || "TBD",
        vehicleModel: vehicleModel.trim() || "TBD",
        licensePlate: "NEW-001",
        servicesOffered: selectedServices,
        isAvailable: true,
        providerType,
        verificationStatus: "pending",
        location: { latitude: 0, longitude: 0 },
      };
      await fetch(new URL("/api/providers/register", baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(providerProfile),
      }).catch(() => {});

      // 4. Update local AppContext
      setAuthUser({ id: userId, name: fullName.trim(), email: email.trim(), phone: phone.trim() });
      setIsAuthenticated(true);
      setUserRole("provider");
      setCurrentProvider(providerProfile as any);

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "ProviderTabs" }] }));
    } catch {
      Alert.alert("Sign Up Failed", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step0" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: isIndependent ? "rgba(0,168,204,0.15)" : "rgba(255,107,53,0.15)" }]}>
          <Feather name="user" size={24} color={isIndependent ? "#00A8CC" : "#FF6B35"} />
        </View>
        <ThemedText type="h3" style={styles.stepTitle}>Personal Information</ThemedText>
        <ThemedText type="small" style={styles.stepSubtitle}>
          {isIndependent ? "Tell us about yourself" : "Owner/manager information"}
        </ThemedText>
      </View>
      <View style={styles.form}>
        <InputField label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Enter your full name" icon="user" autoCapitalize="words" />
        <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail" keyboardType="email-address" autoCapitalize="none" />
        <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Enter your phone number" icon="phone" keyboardType="phone-pad" />
        <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Create a password" icon="lock" secureTextEntry autoCapitalize="none" />
        <InputField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" icon="lock" secureTextEntry autoCapitalize="none" />
      </View>
    </Animated.View>
  );

  const renderStep1Independent = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step1-ind" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: "rgba(0,168,204,0.15)" }]}>
          <Feather name="tool" size={24} color="#00A8CC" />
        </View>
        <ThemedText type="h3" style={styles.stepTitle}>Your Setup</ThemedText>
        <ThemedText type="small" style={styles.stepSubtitle}>Tell us about your vehicle and skills</ThemedText>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <ThemedText type="small" style={styles.inputLabel}>Vehicle Type</ThemedText>
          <View style={styles.vehicleTypeRow}>
            {([["pickup", "Pickup Truck", "truck"], ["service_van", "Service Van", "package"], ["tow_truck", "Tow Truck", "truck"]] as const).map(([type, label, icon]) => (
              <Pressable
                key={type}
                onPress={() => handleVehicleTypeChange(type)}
                style={[styles.vehicleTypeOption, vehicleType === type ? styles.vehicleTypeSelected : null]}
              >
                <Feather name={icon} size={18} color={vehicleType === type ? "#00D9FF" : "rgba(255,255,255,0.4)"} />
                <ThemedText type="small" style={{ color: vehicleType === type ? "#FFF" : "rgba(255,255,255,0.5)", fontSize: 12 }}>{label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {isTowTruck ? (
          <View style={styles.signupTowBanner}>
            <Feather name="info" size={13} color="#00D9FF" />
            <ThemedText type="small" style={{ color: "rgba(0,217,255,0.9)", flex: 1, marginLeft: 8, fontSize: 12 }}>
              Commercial tow truck makes & models are loaded. Select your chassis below.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={styles.inputLabel}>
            {isTowTruck ? "Tow Truck Make" : "Vehicle Make"}
          </ThemedText>
          <Pressable
            onPress={() => setShowMakePicker(true)}
            style={[styles.signupPickerBtn, vehicleMake ? styles.signupPickerBtnFilled : null]}
          >
            <Feather name="truck" size={16} color={vehicleMake ? "#00D9FF" : "rgba(255,255,255,0.4)"} />
            <ThemedText type="small" style={{ color: vehicleMake ? "#FFF" : "rgba(255,255,255,0.4)", flex: 1, marginLeft: 10, fontSize: 14 }}>
              {vehicleMake || (isTowTruck ? "Select tow truck make..." : "Select make...")}
            </ThemedText>
            <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={styles.inputLabel}>
            {isTowTruck ? "Tow Truck Model" : "Vehicle Model"}
          </ThemedText>
          <Pressable
            onPress={() => vehicleMake ? setShowModelPicker(true) : null}
            style={[styles.signupPickerBtn, vehicleModel ? styles.signupPickerBtnFilled : null, !vehicleMake ? { opacity: 0.5 } : null]}
          >
            <Feather name="truck" size={16} color={vehicleModel ? "#00D9FF" : "rgba(255,255,255,0.4)"} />
            <ThemedText type="small" style={{ color: vehicleModel ? "#FFF" : "rgba(255,255,255,0.4)", flex: 1, marginLeft: 10, fontSize: 14 }}>
              {vehicleModel || (vehicleMake ? "Select model..." : "Select a make first")}
            </ThemedText>
            <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {isTowTruck ? (
          <View style={styles.inputContainer}>
            <ThemedText type="small" style={styles.inputLabel}>Tow Truck Class</ThemedText>
            <Pressable
              onPress={() => setShowTowClassPicker(true)}
              style={[styles.signupPickerBtn, towClass ? styles.signupPickerBtnFilled : null]}
            >
              <Feather name="layers" size={16} color={towClass ? "#00D9FF" : "rgba(255,255,255,0.4)"} />
              <ThemedText type="small" style={{ color: towClass ? "#FFF" : "rgba(255,255,255,0.4)", flex: 1, marginLeft: 10, fontSize: 14 }}>
                {towClass || "Select wrecker class..."}
              </ThemedText>
              <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        ) : null}
        <InputField label="Years of Experience (optional)" value={yearsExperience} onChangeText={setYearsExperience} placeholder="How many years?" icon="clock" keyboardType="number-pad" />

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={styles.inputLabel}>Services You Can Provide</ThemedText>
          <ServiceSelector selected={selectedServices} onToggle={toggleService} />
        </View>

        <InputField label="Brief Bio (optional)" value={bio} onChangeText={setBio} placeholder="Tell drivers about yourself..." icon="edit-3" multiline />
      </View>
    </Animated.View>
  );

  const renderStep1Business = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step1-biz" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: "rgba(255,107,53,0.15)" }]}>
          <Feather name="briefcase" size={24} color="#FF6B35" />
        </View>
        <ThemedText type="h3" style={styles.stepTitle}>Business Information</ThemedText>
        <ThemedText type="small" style={styles.stepSubtitle}>Register your company details</ThemedText>
      </View>

      <View style={styles.form}>
        <InputField label="Company / Business Name" value={companyName} onChangeText={setCompanyName} placeholder="Enter your business name" icon="briefcase" autoCapitalize="words" />
        <InputField label="Business Address" value={businessAddress} onChangeText={setBusinessAddress} placeholder="Full business address" icon="map-pin" autoCapitalize="words" />
        <InputField label="Business Phone" value={businessPhone} onChangeText={setBusinessPhone} placeholder="Business phone number" icon="phone" keyboardType="phone-pad" />
        <InputField label="Business License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="License or registration number" icon="file-text" autoCapitalize="characters" />
        <InputField label="Number of Vehicles" value={numVehicles} onChangeText={setNumVehicles} placeholder="How many service vehicles?" icon="truck" keyboardType="number-pad" />
        <InputField label="Number of Employees" value={numEmployees} onChangeText={setNumEmployees} placeholder="Total team members" icon="users" keyboardType="number-pad" />

        <View style={styles.inputContainer}>
          <ThemedText type="small" style={styles.inputLabel}>Services Offered</ThemedText>
          <ServiceSelector selected={selectedServices} onToggle={toggleService} />
        </View>

        <InputField label="Company Description (optional)" value={companyDescription} onChangeText={setCompanyDescription} placeholder="Describe your business..." icon="edit-3" multiline />
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(400)} key="step2" style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepHeaderIcon, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
          <Feather name="shield" size={24} color="#8B5CF6" />
        </View>
        <ThemedText type="h3" style={styles.stepTitle}>Identity Verification</ThemedText>
        <ThemedText type="small" style={styles.stepSubtitle}>
          {isIndependent ? "Upload your ID for driver safety and trust" : "Upload business and personal identification documents"}
        </ThemedText>
      </View>

      <View style={styles.verificationInfo}>
        <Feather name="lock" size={16} color="#00D9FF" />
        <ThemedText type="small" style={styles.verificationInfoText}>
          Your documents are encrypted and stored securely. Verification typically takes 1-2 business days.
        </ThemedText>
      </View>

      <View style={styles.uploadSection}>
        {isIndependent ? (
          <>
            <UploadArea
              label="Government-Issued Photo ID"
              isUploaded={!!uploadedDocs.photoId}
              onPress={() => handleUpload("photoId")}
              icon="credit-card"
            />
            <ThemedText type="small" style={styles.uploadHint}>
              Driver's license, passport, or state ID
            </ThemedText>
            <UploadArea
              label="Selfie for Face Match"
              isUploaded={!!uploadedDocs.selfie}
              onPress={() => handleUpload("selfie")}
              icon="camera"
            />
            <ThemedText type="small" style={styles.uploadHint}>
              Clear photo of your face for identity verification
            </ThemedText>
          </>
        ) : (
          <>
            <UploadArea
              label="Business License / Registration"
              isUploaded={!!uploadedDocs.businessLicense}
              onPress={() => handleUpload("businessLicense")}
              icon="file-text"
            />
            <ThemedText type="small" style={styles.uploadHint}>
              Valid business license or registration certificate
            </ThemedText>
            <UploadArea
              label="Owner's Government-Issued Photo ID"
              isUploaded={!!uploadedDocs.ownerId}
              onPress={() => handleUpload("ownerId")}
              icon="credit-card"
            />
            <ThemedText type="small" style={styles.uploadHint}>
              Driver's license, passport, or state ID of the business owner
            </ThemedText>
            <UploadArea
              label="Proof of Insurance"
              isUploaded={!!uploadedDocs.insurance}
              onPress={() => handleUpload("insurance")}
              icon="shield"
            />
            <ThemedText type="small" style={styles.uploadHint}>
              General liability insurance certificate (min $1M recommended)
            </ThemedText>
          </>
        )}
      </View>

      <View style={styles.verificationStatus}>
        <View style={styles.verificationBadge}>
          <Feather name="clock" size={16} color="#F59E0B" />
          <ThemedText type="small" style={{ color: "#F59E0B", fontWeight: "600" }}>
            Verification will be pending after submission
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => {
    const acceptedCount = Object.values(acceptedDocs).filter(Boolean).length;
    return (
      <Animated.View entering={FadeInDown.duration(400)} key="step3" style={styles.stepContent}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepHeaderIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
            <Feather name="file-text" size={24} color="#10B981" />
          </View>
          <ThemedText type="h3" style={styles.stepTitle}>Legal Agreements</ThemedText>
          <ThemedText type="small" style={styles.stepSubtitle}>Tap each agreement to read and accept</ThemedText>
        </View>

        <View style={styles.legalProgressRow}>
          <Feather name="check-circle" size={16} color={allAccepted ? "#00E676" : "rgba(255,255,255,0.3)"} />
          <ThemedText type="small" style={[styles.legalProgressText, { color: allAccepted ? "#00E676" : "rgba(255,255,255,0.5)" }]}>
            {acceptedCount} of {LEGAL_DOCUMENTS.length} accepted
          </ThemedText>
          {!allAccepted ? (
            <Pressable onPress={() => setAcceptedDocs({ privacy: true, terms: true, liability: true })} style={styles.acceptAllBtn}>
              <ThemedText type="small" style={styles.acceptAllText}>Accept All</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.legalSection}>
          {LEGAL_DOCUMENTS.map((doc) => {
            const isExpanded = expandedDoc === doc.key;
            const isAccepted = !!acceptedDocs[doc.key];
            const iconColor = isAccepted ? "#00E676" : (doc.key === "liability" ? "#F59E0B" : "#00D9FF");

            return (
              <Pressable
                key={doc.key}
                onPress={() => toggleAccept(doc.key)}
                style={[styles.legalCard, isAccepted ? styles.legalCardAccepted : null]}
              >
                <View style={styles.legalCardHeader}>
                  <View style={[styles.legalIconWrap, isAccepted ? styles.legalIconWrapAccepted : null]}>
                    <Feather name={isAccepted ? "check" : doc.icon} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={[styles.legalCardTitle, isAccepted ? { color: "#00E676" } : null]}>
                      {doc.title}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: isAccepted ? "rgba(0,230,118,0.7)" : "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {isAccepted ? "Accepted" : "Tap to read and accept"}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => setExpandedDoc(isExpanded ? null : doc.key)}
                    hitSlop={12}
                    style={styles.expandBtn}
                  >
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                </View>

                {isExpanded ? (
                  <View style={styles.legalCardBody}>
                    <ThemedText type="small" style={styles.legalSummary}>{doc.summary}</ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const accentColor = isIndependent ? "#00A8CC" : "#FF6B35";
  const gradientColors = isIndependent ? ["#00A8CC", "#0077B6"] : ["#FF6B35", "#FF3D00"];

  const isLastStep = step === TOTAL_STEPS - 1;
  const canProceed = step === 3 ? allAccepted : true;

  return (
    <View style={[styles.container, { backgroundColor: DARK_BG }]}>
      <AnimatedBackground />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <View style={styles.backButtonBg}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ color: accentColor, fontWeight: "700", fontSize: 13 }}>
              {isIndependent ? "INDEPENDENT PROVIDER" : "BUSINESS ACCOUNT"}
            </ThemedText>
          </View>
        </View>

        <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

        {step === 0 ? renderStep0() : null}
        {step === 1 ? (isIndependent ? renderStep1Independent() : renderStep1Business()) : null}
        {step === 2 ? renderStep2() : null}
        {step === 3 ? renderStep3() : null}

        <View style={styles.footer}>
          <AnimatedPressable
            style={[styles.nextButton, animatedButtonStyle, { opacity: isLoading || !canProceed ? 0.6 : 1 }]}
            onPress={handleNext}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            disabled={isLoading || !canProceed}
          >
            <LinearGradient
              colors={canProceed ? gradientColors : ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            <ThemedText type="body" style={[styles.nextButtonText, { color: canProceed ? "#FFF" : "rgba(255,255,255,0.4)" }]}>
              {isLoading ? "Creating Account..." : isLastStep ? "Create Provider Account" : "Continue"}
            </ThemedText>
            {!isLastStep && !isLoading ? <Feather name="arrow-right" size={18} color="#FFF" /> : null}
          </AnimatedPressable>

          {step === 3 && !allAccepted ? (
            <View style={styles.acceptHint}>
              <Feather name="info" size={14} color="rgba(255,255,255,0.4)" />
              <ThemedText type="small" style={styles.acceptHintText}>Accept all agreements to create your account</ThemedText>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={showMakePicker} animationType="slide" transparent>
        <View style={styles.signupModalOverlay}>
          <View style={[styles.signupModalContent, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.signupModalHeader}>
              <ThemedText type="h3" style={{ color: "#FFF" }}>
                {isTowTruck ? "Select Tow Truck Make" : "Select Make"}
              </ThemedText>
              <Pressable onPress={() => setShowMakePicker(false)} hitSlop={12}>
                <Feather name="x" size={24} color="#FFF" />
              </Pressable>
            </View>
            <FlatList
              data={activeMakes}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setVehicleMake(item); setVehicleModel(""); setShowMakePicker(false); }}
                  style={({ pressed }) => [styles.signupPickerItem, { backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent" }]}
                >
                  <ThemedText type="body" style={{ color: "#FFF" }}>{item}</ThemedText>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.signupSeparator} />}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showModelPicker} animationType="slide" transparent>
        <View style={styles.signupModalOverlay}>
          <View style={[styles.signupModalContent, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.signupModalHeader}>
              <ThemedText type="h3" style={{ color: "#FFF" }}>{vehicleMake} Models</ThemedText>
              <Pressable onPress={() => setShowModelPicker(false)} hitSlop={12}>
                <Feather name="x" size={24} color="#FFF" />
              </Pressable>
            </View>
            <FlatList
              data={availableSignupModels}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setVehicleModel(item); setShowModelPicker(false); }}
                  style={({ pressed }) => [styles.signupPickerItem, { backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent" }]}
                >
                  <ThemedText type="body" style={{ color: "#FFF" }}>{item}</ThemedText>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.signupSeparator} />}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showTowClassPicker} animationType="slide" transparent>
        <View style={styles.signupModalOverlay}>
          <View style={[styles.signupModalContent, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.signupModalHeader}>
              <ThemedText type="h3" style={{ color: "#FFF" }}>Tow Truck Class</ThemedText>
              <Pressable onPress={() => setShowTowClassPicker(false)} hitSlop={12}>
                <Feather name="x" size={24} color="#FFF" />
              </Pressable>
            </View>
            <FlatList
              data={TOW_TRUCK_CLASSES}
              keyExtractor={(item) => item.label}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setTowClass(item.label); setShowTowClassPicker(false); }}
                  style={({ pressed }) => [styles.signupPickerItem, styles.signupClassItem, { backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "transparent" }]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ color: "#FFF", fontWeight: "600" }}>{item.label}</ThemedText>
                    <ThemedText type="small" style={{ color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{item.description}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.signupSeparator} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
  backButton: {},
  backButtonBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  stepIndicator: { marginBottom: Spacing.lg, alignItems: "center" },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.1)" },
  stepDotActive: { borderColor: "#00D9FF", backgroundColor: "rgba(0,217,255,0.15)" },
  stepDotCompleted: { borderColor: "#00E676", backgroundColor: "#00E676" },
  stepLine: { width: 40, height: 2, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 4 },
  stepLineCompleted: { backgroundColor: "#00E676" },
  stepLabel: { color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  stepContent: { marginBottom: Spacing.xl },
  stepHeader: { alignItems: "center", marginBottom: Spacing.xl },
  stepHeaderIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  stepTitle: { color: "#FFF", marginBottom: 4 },
  stepSubtitle: { color: "rgba(255,255,255,0.5)", textAlign: "center", paddingHorizontal: 20 },
  form: { gap: 16 },
  inputContainer: { gap: 6 },
  inputLabel: { fontWeight: "500", color: "rgba(255,255,255,0.6)", fontSize: 13 },
  inputWrapper: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 14 : 10, borderRadius: 14, gap: 10, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  inputWrapperFocused: { borderColor: "rgba(0,217,255,0.4)", backgroundColor: "rgba(0,217,255,0.06)" },
  input: { flex: 1, fontSize: 16, color: "#FFF" },
  vehicleTypeRow: { flexDirection: "row", gap: 8 },
  vehicleTypeOption: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  vehicleTypeSelected: { borderColor: "rgba(0,217,255,0.4)", backgroundColor: "rgba(0,217,255,0.08)" },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  serviceChipSelected: { borderColor: "rgba(0,217,255,0.4)", backgroundColor: "rgba(0,217,255,0.1)" },
  uploadSection: { gap: 8 },
  uploadArea: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderStyle: "dashed" },
  uploadAreaDone: { borderColor: "rgba(0,230,118,0.3)", borderStyle: "solid", backgroundColor: "rgba(0,230,118,0.05)" },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  uploadIconDone: { backgroundColor: "#00E676" },
  uploadHint: { color: "rgba(255,255,255,0.35)", fontSize: 12, marginLeft: 62, marginBottom: 8 },
  verificationInfo: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, backgroundColor: "rgba(0,217,255,0.06)", marginBottom: Spacing.lg },
  verificationInfoText: { flex: 1, color: "rgba(255,255,255,0.6)", lineHeight: 18 },
  verificationStatus: { marginTop: Spacing.lg },
  verificationBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, backgroundColor: "rgba(245,158,11,0.08)" },
  legalProgressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  legalProgressText: { flex: 1 },
  acceptAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(0,217,255,0.12)", borderWidth: 1, borderColor: "rgba(0,217,255,0.3)" },
  acceptAllText: { color: "#00D9FF", fontWeight: "600", fontSize: 12 },
  legalSection: { gap: 10 },
  legalCard: { borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  legalCardAccepted: { borderColor: "rgba(0,230,118,0.4)", backgroundColor: "rgba(0,230,118,0.05)" },
  legalCardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  legalIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  legalIconWrapAccepted: { backgroundColor: "rgba(0,230,118,0.12)" },
  legalCardTitle: { fontWeight: "600", color: "#FFF", fontSize: 15 },
  expandBtn: { padding: 4 },
  legalCardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  legalSummary: { lineHeight: 20, color: "rgba(255,255,255,0.5)" },
  footer: { marginTop: "auto", gap: Spacing.md, paddingTop: Spacing.lg },
  nextButton: { flexDirection: "row", paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden" },
  nextButtonText: { fontWeight: "700", fontSize: 16 },
  acceptHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  acceptHintText: { color: "rgba(255,255,255,0.4)" },
  signupTowBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
    borderColor: "rgba(0,217,255,0.25)",
    backgroundColor: "rgba(0,217,255,0.06)",
  },
  signupPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  signupPickerBtnFilled: {
    borderColor: "rgba(0,217,255,0.4)",
    backgroundColor: "rgba(0,217,255,0.06)",
  },
  signupModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  signupModalContent: {
    backgroundColor: "#0D1B2A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "70%",
  },
  signupModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: Spacing.sm,
  },
  signupPickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
  },
  signupClassItem: {
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
  },
  signupSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: Spacing.lg,
  },
});
