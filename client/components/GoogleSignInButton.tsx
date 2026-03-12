import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useGoogleAuth, GoogleUser } from "@/hooks/useGoogleAuth";

interface Props {
  onSuccess: (user: GoogleUser) => void;
  onError?: (error: string) => void;
  showDivider?: boolean;
  dividerLabel?: string;
}

function GoogleSignInButtonInner({ onSuccess, onError, showDivider = true, dividerLabel = "or" }: Props) {
  const { signInWithGoogle, isConfigured } = useGoogleAuth({ onSuccess, onError });
  if (!isConfigured) return null;

  return (
    <>
      {showDivider ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <ThemedText type="small" style={styles.dividerText}>{dividerLabel}</ThemedText>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.googleButton, { opacity: pressed ? 0.85 : 1 }]}
        onPress={signInWithGoogle}
      >
        <View style={styles.googleIconContainer}>
          <ThemedText style={styles.googleIconText}>G</ThemedText>
        </View>
        <ThemedText type="body" style={styles.googleButtonText}>Continue with Google</ThemedText>
      </Pressable>
    </>
  );
}

export function GoogleSignInButton(props: Props) {
  if (Platform.OS !== "web") return null;
  return <GoogleSignInButtonInner {...props} />;
}

const styles = StyleSheet.create({
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },
  dividerText: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },
  googleButtonText: { color: "#1A1A1A", fontWeight: "600", fontSize: 16 },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
