import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Platform, Vibration } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type EmergencyPhase = "activating" | "active" | "dispatching" | "dispatched";

export default function EmergencyModeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { emergencyContacts, userLocation, setUserLocation } = useApp();
  const navigation = useNavigation();

  const [phase, setPhase] = useState<EmergencyPhase>("activating");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [arrivalPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1000 }),
        withTiming(0.6, { duration: 1000 })
      ),
      -1,
      false
    );
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const acquireLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {}
    };
    if (!userLocation) {
      acquireLocation();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Vibration.vibrate([0, 200, 100, 200]);
    }

    const phaseTimer1 = setTimeout(() => setPhase("active"), 1500);
    const phaseTimer2 = setTimeout(() => setPhase("dispatching"), 4000);
    const phaseTimer3 = setTimeout(() => setPhase("dispatched"), 7000);

    return () => {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
    };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 0.15,
  }));

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (phase) {
      case "activating":
        return "Activating Emergency Mode...";
      case "active":
        return "Emergency Mode Active";
      case "dispatching":
        return "Dispatching Priority Help...";
      case "dispatched":
        return "Priority Help Dispatched";
    }
  };

  const getStatusSubtext = () => {
    switch (phase) {
      case "activating":
        return "Securing your location and alerting contacts";
      case "active":
        return "Your location is being shared with emergency contacts";
      case "dispatching":
        return "Finding the nearest available provider";
      case "dispatched":
        return "A provider is being routed to you with priority";
    }
  };

  const locationDisplay = userLocation
    ? `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
    : "Acquiring location...";

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: "#1A0000" }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
        <ThemedText type="small" style={styles.timerText}>
          {formatTime(elapsedSeconds)}
        </ThemedText>
      </View>

      <View style={styles.sosContainer}>
        <Animated.View
          style={[styles.outerRing, { borderColor: theme.error }, ringAnimatedStyle]}
        />
        <Animated.View
          style={[styles.pulseCircle, { backgroundColor: theme.error }, pulseAnimatedStyle]}
        />
        <View style={[styles.sosCircle, { backgroundColor: theme.error }]}>
          <Feather name="shield" size={48} color="#FFFFFF" />
          <ThemedText type="h3" style={styles.sosText}>
            SOS
          </ThemedText>
        </View>
      </View>

      <View style={styles.statusSection}>
        <ThemedText type="h4" style={styles.statusTitle}>
          {getStatusText()}
        </ThemedText>
        <ThemedText type="body" style={styles.statusSubtext}>
          {getStatusSubtext()}
        </ThemedText>
      </View>

      <View style={styles.infoCards}>
        <View style={[styles.infoCard, { backgroundColor: "rgba(255,82,82,0.15)", borderColor: "rgba(255,82,82,0.3)" }]}>
          <View style={styles.infoCardHeader}>
            <Feather name="map-pin" size={18} color={theme.error} />
            <ThemedText type="body" style={[styles.infoCardTitle, { color: theme.error }]}>
              Location Shared
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.infoCardValue}>
            {locationDisplay}
          </ThemedText>
        </View>

        <View style={[styles.infoCard, { backgroundColor: "rgba(255,179,0,0.15)", borderColor: "rgba(255,179,0,0.3)" }]}>
          <View style={styles.infoCardHeader}>
            <Feather name="users" size={18} color={theme.warning} />
            <ThemedText type="body" style={[styles.infoCardTitle, { color: theme.warning }]}>
              Trusted Contacts
            </ThemedText>
          </View>
          {emergencyContacts.length > 0 ? (
            emergencyContacts.map((contact, index) => (
              <View key={index} style={styles.contactRow}>
                <ThemedText type="small" style={styles.contactName}>
                  {contact.name}
                </ThemedText>
                <ThemedText type="small" style={styles.contactStatus}>
                  {phase === "activating" ? "Notifying..." : "Notified"}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText type="small" style={styles.noContactsText}>
              No emergency contacts set. Add them in your profile settings.
            </ThemedText>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: "rgba(0,217,255,0.15)", borderColor: "rgba(0,217,255,0.3)" }]}>
          <View style={styles.infoCardHeader}>
            <Feather name="zap" size={18} color={theme.secondary} />
            <ThemedText type="body" style={[styles.infoCardTitle, { color: theme.secondary }]}>
              Priority Dispatch
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.infoCardValue}>
            {phase === "dispatched"
              ? "Provider assigned - arriving soon"
              : phase === "dispatching"
                ? "Searching for nearest provider..."
                : "Will dispatch once activated"}
          </ThemedText>
        </View>

        {phase === "dispatched" ? (
          <View style={[styles.infoCard, { backgroundColor: "rgba(0,230,118,0.15)", borderColor: "rgba(0,230,118,0.3)" }]}>
            <View style={styles.infoCardHeader}>
              <Feather name="lock" size={18} color={theme.success} />
              <ThemedText type="body" style={[styles.infoCardTitle, { color: theme.success }]}>
                Arrival PIN
              </ThemedText>
            </View>
            <ThemedText type="h2" style={styles.pinText}>
              {arrivalPin}
            </ThemedText>
            <ThemedText type="small" style={styles.pinSubtext}>
              Share this PIN only with your provider upon arrival
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={handleCancel}
          style={[styles.cancelSosButton, { borderColor: "rgba(255,255,255,0.3)" }]}
        >
          <ThemedText type="body" style={styles.cancelSosText}>
            Cancel Emergency
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
  },
  sosContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginTop: Spacing.lg,
  },
  outerRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  pulseCircle: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  sosCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: {
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: Spacing.xs,
  },
  statusSection: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  statusTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  statusSubtext: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  infoCards: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoCardTitle: {
    fontWeight: "600",
  },
  infoCardValue: {
    color: "rgba(255,255,255,0.7)",
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  contactName: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  contactStatus: {
    color: "rgba(255,179,0,0.8)",
    fontWeight: "500",
  },
  noContactsText: {
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
  },
  pinText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 8,
    marginVertical: Spacing.sm,
  },
  pinSubtext: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  cancelSosButton: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  cancelSosText: {
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
});
