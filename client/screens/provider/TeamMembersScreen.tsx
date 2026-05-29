import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const ROLES = ["Manager", "Technician", "Driver", "Dispatcher", "Customer Service"];

const ROLE_COLORS: Record<string, string> = {
  Manager: "#A855F7",
  Technician: "#3B82F6",
  Driver: "#10B981",
  Dispatcher: "#F59E0B",
  "Customer Service": "#EF4444",
};

type TeamMember = { id: string; name: string; role: string; phone: string };

export default function TeamMembersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { currentProvider, setCurrentProvider } = useApp();

  const [members, setMembers] = useState<TeamMember[]>(
    currentProvider?.teamMembers ?? []
  );
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Technician");
  const [newPhone, setNewPhone] = useState("");

  const saveToServer = async (updated: TeamMember[]) => {
    if (!currentProvider?.id) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/providers/${currentProvider.id}/business-data`, {
        teamMembers: updated,
      });
      setCurrentProvider({ ...currentProvider, teamMembers: updated });
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      Alert.alert("Required", "Please enter a name.");
      return;
    }
    const member: TeamMember = {
      id: Date.now().toString(),
      name: newName.trim(),
      role: newRole,
      phone: newPhone.trim(),
    };
    const updated = [...members, member];
    setMembers(updated);
    setShowModal(false);
    setNewName("");
    setNewPhone("");
    setNewRole("Technician");
    await saveToServer(updated);
  };

  const handleRemove = (id: string) => {
    Alert.alert("Remove Member", "Remove this team member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const updated = members.filter((m) => m.id !== id);
          setMembers(updated);
          await saveToServer(updated);
        },
      },
    ]);
  };

  const sectionBg = theme.backgroundSecondary;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: sectionBg }]}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statVal}>{members.length}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Total</ThemedText>
          </View>
          {ROLES.slice(0, 3).map((r) => (
            <View key={r} style={styles.statItem}>
              <ThemedText style={styles.statVal}>
                {members.filter((m) => m.role === r).length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{r}s</ThemedText>
            </View>
          ))}
        </View>

        {/* Member list */}
        {members.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: sectionBg }]}>
            <Feather name="users" size={40} color={theme.textSecondary} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md }}>No team members yet</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              Add your staff to manage who works on jobs
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {members.map((m) => (
              <View key={m.id} style={[styles.memberCard, { backgroundColor: sectionBg }]}>
                <View style={[styles.memberAvatar, { backgroundColor: (ROLE_COLORS[m.role] ?? "#888") + "20" }]}>
                  <ThemedText style={{ fontSize: 18, fontWeight: "800", color: ROLE_COLORS[m.role] ?? "#888" }}>
                    {m.name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4" style={{ marginBottom: 3 }}>{m.name}</ThemedText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                    <View style={[styles.rolePill, { backgroundColor: (ROLE_COLORS[m.role] ?? "#888") + "20" }]}>
                      <ThemedText type="small" style={{ color: ROLE_COLORS[m.role] ?? "#888", fontWeight: "700" }}>
                        {m.role}
                      </ThemedText>
                    </View>
                    {m.phone ? (
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>{m.phone}</ThemedText>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => handleRemove(m.id)}
                  style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="trash-2" size={18} color={theme.danger ?? "#EF4444"} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add button */}
        <Pressable
          onPress={() => setShowModal(true)}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1, marginTop: Spacing.xl },
          ]}
        >
          <Feather name="user-plus" size={20} color="#FFF" />
          <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16, marginLeft: Spacing.sm }}>
            Add Team Member
          </ThemedText>
        </Pressable>
      </ScrollView>

      {/* Add member modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat>
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">New Team Member</ThemedText>
                <Pressable onPress={() => setShowModal(false)}>
                  <Feather name="x" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>NAME *</ThemedText>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Full name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              />

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>ROLE *</ThemedText>
              <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setNewRole(r)}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: newRole === r ? (ROLE_COLORS[r] ?? theme.primary) : theme.backgroundDefault,
                        borderColor: newRole === r ? (ROLE_COLORS[r] ?? theme.primary) : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: newRole === r ? "#FFF" : theme.text, fontWeight: "600" }}
                    >
                      {r}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>PHONE (optional)</ThemedText>
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Phone number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text, borderColor: theme.border }]}
              />

              <Pressable
                onPress={handleAdd}
                disabled={saving}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.primary, opacity: pressed || saving ? 0.7 : 1, marginTop: Spacing.lg }]}
              >
                <ThemedText style={{ color: "#FFF", fontWeight: "700", fontSize: 16 }}>
                  {saving ? "Adding..." : "Add Member"}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: "row", borderRadius: BorderRadius.md, padding: Spacing.lg, gap: Spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "900", lineHeight: 26 },
  emptyState: { alignItems: "center", padding: Spacing["2xl"], borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  memberCard: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.md },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  rolePill: { paddingVertical: 2, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full },
  removeBtn: { padding: Spacing.sm },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: Spacing["2xl"] },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl },
  fieldLabel: { fontWeight: "700", letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, fontSize: 16, marginBottom: Spacing.xs },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  roleChip: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, borderWidth: 1 },
});
