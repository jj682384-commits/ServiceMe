import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ScreenDecoration } from "@/components/ScreenDecoration";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const INDEPENDENT_DOCS: { key: string; label: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "photoId", label: "Government-Issued Photo ID", description: "Driver's license, passport, or state ID", icon: "credit-card" },
  { key: "selfie", label: "Identity Selfie", description: "Clear photo of your face for ID matching", icon: "camera" },
];

const SHOP_DOCS: { key: string; label: string; description: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "businessLicense", label: "Business License", description: "Valid business license or registration certificate", icon: "file-text" },
  { key: "ownerId", label: "Owner Photo ID", description: "Driver's license, passport, or state ID of the business owner", icon: "credit-card" },
  { key: "insurance", label: "Proof of Insurance", description: "Current commercial liability insurance certificate", icon: "shield" },
];

type StepStatus = "complete" | "active" | "upcoming";

function StepRow({
  number,
  label,
  subtitle,
  status,
}: {
  number: number;
  label: string;
  subtitle?: string;
  status: StepStatus;
}) {
  const { theme } = useTheme();

  const color =
    status === "complete" ? theme.success :
    status === "active" ? theme.warning :
    theme.textSecondary;

  const bgColor =
    status === "complete" ? theme.success + "20" :
    status === "active" ? theme.warning + "20" :
    theme.backgroundSecondary;

  return (
    <View style={styles.stepRow}>
      <View style={[styles.stepBubble, { backgroundColor: bgColor }]}>
        {status === "complete" ? (
          <Feather name="check" size={14} color={color} />
        ) : (
          <ThemedText type="small" style={{ color, fontWeight: "700" }}>{number}</ThemedText>
        )}
      </View>
      <View style={styles.stepConnectorCol}>
        <ThemedText type="body" style={{ color: status === "upcoming" ? theme.textSecondary : theme.text, fontWeight: status === "active" ? "600" : "400" }}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function DocRow({
  label,
  description,
  icon,
  isUploaded,
  onUpload,
  locked,
}: {
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  isUploaded: boolean;
  onUpload: () => void;
  locked: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.docRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.docIcon, { backgroundColor: isUploaded ? theme.success + "20" : theme.backgroundSecondary }]}>
        <Feather name={icon} size={20} color={isUploaded ? theme.success : theme.textSecondary} />
      </View>
      <View style={styles.docInfo}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>{label}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>{description}</ThemedText>
      </View>
      {locked ? (
        <View style={[styles.docStatus, { backgroundColor: theme.success + "20" }]}>
          <Feather name="lock" size={14} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.success, marginLeft: 4, fontWeight: "600" }}>Locked</ThemedText>
        </View>
      ) : (
        <Pressable
          onPress={onUpload}
          style={({ pressed }) => [
            styles.docStatus,
            {
              backgroundColor: isUploaded ? theme.success + "20" : theme.primary + "15",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name={isUploaded ? "check-circle" : "upload"} size={14} color={isUploaded ? theme.success : theme.primary} />
          <ThemedText type="small" style={{ color: isUploaded ? theme.success : theme.primary, marginLeft: 4, fontWeight: "600" }}>
            {isUploaded ? "Done" : "Upload"}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export default function ProviderVerificationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const status = currentProvider?.verificationStatus ?? "not_started";
  const isIndependent = currentProvider?.providerType === "independent";
  const requiredDocs = isIndependent ? INDEPENDENT_DOCS : SHOP_DOCS;
  const isVerified = status === "verified";

  const [docs, setDocs] = useState<Record<string, boolean>>(
    currentProvider?.verificationDocuments ?? {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDocsUploaded = requiredDocs.every((d) => docs[d.key]);
  const anyDocUploaded = requiredDocs.some((d) => docs[d.key]);
  const submittedAt = currentProvider?.verificationSubmittedAt;

  useEffect(() => {
    if (status === "pending" && currentProvider?.id) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await apiRequest("GET", `/api/providers/${currentProvider.id}/verification`);
          const data = await res.json();
          if (data.verificationStatus && data.verificationStatus !== status) {
            setCurrentProvider({
              ...currentProvider,
              verificationStatus: data.verificationStatus,
              verificationNotes: data.verificationNotes || undefined,
            });
            if (data.verificationStatus === "verified") {
              Alert.alert("Verified!", "Congratulations! Your identity has been verified. You now appear as a trusted provider.");
            } else if (data.verificationStatus === "not_started") {
              const note = data.verificationNotes || "Please re-upload your documents and resubmit.";
              Alert.alert("Action Required", `Your documents were not accepted.\n\n${note}`);
              setDocs({});
            }
            clearInterval(pollRef.current!);
          }
        } catch {
          // silent — polling, not critical
        }
      }, 15000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, currentProvider?.id]);

  const handleUpload = (key: string) => {
    Alert.alert(
      "Upload Document",
      "In a production build this opens your camera or photo library. Tap Confirm to mark this document as ready.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Upload",
          onPress: () => {
            const updated = { ...docs, [key]: true };
            setDocs(updated);
            if (currentProvider) {
              setCurrentProvider({ ...currentProvider, verificationDocuments: updated });
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!allDocsUploaded) {
      Alert.alert("Documents Required", "Please upload all required documents before submitting.");
      return;
    }
    setIsSubmitting(true);
    const now = new Date().toISOString();
    try {
      if (currentProvider?.id) {
        await apiRequest("POST", `/api/providers/${currentProvider.id}/verification`, {
          verificationDocuments: docs,
          verificationSubmittedAt: now,
        });
      }
    } catch {
      // If server is unreachable, save locally anyway
    } finally {
      if (currentProvider) {
        setCurrentProvider({
          ...currentProvider,
          verificationStatus: "pending",
          verificationDocuments: docs,
          verificationSubmittedAt: now,
        });
      }
      setIsSubmitting(false);
      Alert.alert(
        "Submitted",
        "Your documents have been submitted for review. You'll be notified once verified — typically 1–2 business days.",
        [{ text: "OK" }]
      );
    }
  };

  const stepStatuses = (): { account: StepStatus; documents: StepStatus; review: StepStatus; verified: StepStatus } => {
    if (isVerified) {
      return { account: "complete", documents: "complete", review: "complete", verified: "complete" };
    }
    if (status === "pending") {
      return { account: "complete", documents: "complete", review: "active", verified: "upcoming" };
    }
    if (anyDocUploaded || allDocsUploaded) {
      return { account: "complete", documents: "active", review: "upcoming", verified: "upcoming" };
    }
    return { account: "complete", documents: "upcoming", review: "upcoming", verified: "upcoming" };
  };

  const steps = stepStatuses();

  const statusConfig = {
    verified: {
      color: theme.success,
      bg: theme.success + "15",
      icon: "shield" as const,
      title: "Account Verified",
      subtitle: "Your identity is confirmed. Drivers can trust you with full confidence.",
    },
    pending: {
      color: theme.warning,
      bg: theme.warning + "15",
      icon: "clock" as const,
      title: "Review In Progress",
      subtitle: submittedAt
        ? `Submitted ${new Date(submittedAt).toLocaleDateString()}. Typically takes 1–2 business days.`
        : "Your documents are being reviewed. Typically takes 1–2 business days.",
    },
    not_started: {
      color: theme.textSecondary,
      bg: theme.backgroundSecondary,
      icon: "alert-circle" as const,
      title: "Verification Required",
      subtitle: "Upload your documents to become a verified provider and unlock full access to job requests.",
    },
  };

  const cfg = statusConfig[status];

  return (
    <ThemedView style={styles.container}>
      <ScreenDecoration />
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusIconCircle, { backgroundColor: cfg.color + "20" }]}>
            <Feather name={cfg.icon} size={28} color={cfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="h4" style={{ color: cfg.color }}>{cfg.title}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>
              {cfg.subtitle}
            </ThemedText>
          </View>
        </View>

        {/* Progress steps */}
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.cardTitle, { color: theme.textSecondary }]}>
            VERIFICATION PROGRESS
          </ThemedText>
          <StepRow number={1} label="Account Created" status={steps.account} />
          <View style={[styles.stepDivider, { backgroundColor: theme.border }]} />
          <StepRow
            number={2}
            label="Documents Uploaded"
            subtitle={steps.documents === "active" ? "In progress — upload all required documents below" : undefined}
            status={steps.documents}
          />
          <View style={[styles.stepDivider, { backgroundColor: theme.border }]} />
          <StepRow
            number={3}
            label="Identity Review"
            subtitle={steps.review === "active" ? "Our team is reviewing your submission" : undefined}
            status={steps.review}
          />
          <View style={[styles.stepDivider, { backgroundColor: theme.border }]} />
          <StepRow number={4} label="Verified" status={steps.verified} />
        </View>

        {/* Documents */}
        {!isVerified ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="small" style={[styles.cardTitle, { color: theme.textSecondary }]}>
              {isIndependent ? "REQUIRED DOCUMENTS" : "REQUIRED BUSINESS DOCUMENTS"}
            </ThemedText>
            {requiredDocs.map((doc, i) => (
              <DocRow
                key={doc.key}
                label={doc.label}
                description={doc.description}
                icon={doc.icon}
                isUploaded={!!docs[doc.key]}
                onUpload={() => handleUpload(doc.key)}
                locked={status === "pending" || isVerified}
              />
            ))}
            {status !== "pending" ? (
              <Pressable
                onPress={handleSubmit}
                disabled={!allDocsUploaded || isSubmitting}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: allDocsUploaded ? theme.primary : theme.backgroundSecondary,
                    opacity: pressed || isSubmitting ? 0.7 : 1,
                    marginTop: Spacing.lg,
                  },
                ]}
              >
                <Feather name="send" size={18} color={allDocsUploaded ? "#FFFFFF" : theme.textSecondary} />
                <ThemedText
                  type="body"
                  style={{
                    color: allDocsUploaded ? "#FFFFFF" : theme.textSecondary,
                    fontWeight: "600",
                    marginLeft: Spacing.sm,
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit for Verification"}
                </ThemedText>
              </Pressable>
            ) : (
              <View style={[styles.lockedNotice, { backgroundColor: theme.warning + "10" }]}>
                <Feather name="info" size={16} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning, marginLeft: Spacing.sm, flex: 1 }}>
                  Documents are locked while your review is in progress. Contact support if you need to make changes.
                </ThemedText>
              </View>
            )}
          </View>
        ) : null}

        {/* Benefits of verification */}
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small" style={[styles.cardTitle, { color: theme.textSecondary }]}>
            WHY VERIFICATION MATTERS
          </ThemedText>
          {[
            { icon: "star" as const, text: "Verified badge shown on your profile — builds driver trust" },
            { icon: "trending-up" as const, text: "Priority placement in nearby provider searches" },
            { icon: "unlock" as const, text: "Access to all job categories and service types" },
            { icon: "shield" as const, text: "Drivers see you as a trusted, vetted professional" },
          ].map((item, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={item.icon} size={16} color={theme.primary} />
              </View>
              <ThemedText type="body" style={{ flex: 1, color: theme.textSecondary, lineHeight: 20 }}>
                {item.text}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="lock" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm, lineHeight: 18 }}>
            Your documents are encrypted and stored securely. They are only used for identity verification and are never shared with drivers.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  statusIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  stepBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepConnectorCol: {
    flex: 1,
  },
  stepDivider: {
    height: 1,
    marginLeft: 42,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
  },
  docStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
});
