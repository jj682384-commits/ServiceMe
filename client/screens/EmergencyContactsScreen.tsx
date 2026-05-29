import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Alert, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { emergencyContacts, addEmergencyContact, removeEmergencyContact } = useApp();

  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert("Missing Info", "Please enter a name and phone number.");
      return;
    }
    addEmergencyContact({
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelationship.trim() || "Contact",
    });
    setNewContactName("");
    setNewContactPhone("");
    setNewContactRelationship("");
    setShowForm(false);
    Keyboard.dismiss();
  };

  const handleRemoveContact = (index: number) => {
    Alert.alert(
      "Remove Contact",
      `Remove ${emergencyContacts[index].name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeEmergencyContact(index) },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.error + "12", borderColor: theme.error + "30" }]}>
          <Feather name="shield" size={16} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm, lineHeight: 19 }}>
            These contacts receive an SMS with your GPS location when SOS is activated.
          </ThemedText>
        </View>

        {/* Add button — always at top so it's always visible */}
        {!showForm ? (
          <Pressable
            onPress={() => setShowForm(true)}
            style={({ pressed }) => [
              styles.addBtn,
              { borderColor: theme.error + "50", backgroundColor: theme.error + "10", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={theme.error} />
            <ThemedText type="body" style={{ color: theme.error, fontWeight: "700", marginLeft: Spacing.sm }}>
              Add Emergency Contact
            </ThemedText>
          </Pressable>
        ) : null}

        {/* Inline form */}
        {showForm ? (
          <View style={[styles.addForm, { backgroundColor: theme.cardAnimatedBg, borderColor: theme.border }]}>
            <ThemedText type="body" style={{ fontWeight: "700", marginBottom: Spacing.md }}>New Contact</ThemedText>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name *</ThemedText>
            <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="user" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={newContactName}
                onChangeText={setNewContactName}
                placeholder="e.g., Jane Doe"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
                autoFocus
              />
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number *</ThemedText>
            <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="phone" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={newContactPhone}
                onChangeText={setNewContactPhone}
                placeholder="+1 555-000-0000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>

            <ThemedText type="small" style={[styles.fieldLabel, { color: theme.textSecondary }]}>Relationship</ThemedText>
            <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Feather name="heart" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={newContactRelationship}
                onChangeText={setNewContactRelationship}
                placeholder="e.g., Spouse, Parent, Friend"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleAddContact}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable
                onPress={() => { setShowForm(false); Keyboard.dismiss(); }}
                style={({ pressed }) => [styles.cancelBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleAddContact}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 }]}
              >
                <Feather name="check" size={16} color="#FFF" />
                <ThemedText type="small" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>Save Contact</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Contact list */}
        {emergencyContacts.length > 0 ? (
          <View style={styles.contactList}>
            <ThemedText type="small" style={[styles.listHeader, { color: theme.textSecondary }]}>
              {emergencyContacts.length} CONTACT{emergencyContacts.length !== 1 ? "S" : ""} SAVED
            </ThemedText>
            {emergencyContacts.map((contact, index) => (
              <View
                key={index}
                style={[styles.contactCard, { backgroundColor: theme.cardAnimatedBg, borderColor: theme.border }]}
              >
                <View style={[styles.contactAvatar, { backgroundColor: theme.error + "20" }]}>
                  <Feather name="user" size={20} color={theme.error} />
                </View>
                <View style={styles.contactInfo}>
                  <ThemedText type="body" style={{ fontWeight: "700" }}>{contact.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>{contact.phone}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{contact.relationship}</ThemedText>
                </View>
                <Pressable
                  onPress={() => handleRemoveContact(index)}
                  style={({ pressed }) => [styles.removeButton, { backgroundColor: theme.error + "15", opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name="trash-2" size={16} color={theme.error} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          !showForm ? (
            <View style={[styles.emptyState, { borderColor: theme.border }]}>
              <Feather name="user-x" size={32} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm, fontWeight: "600" }}>
                No emergency contacts yet
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4, textAlign: "center", lineHeight: 18 }}>
                Add at least one contact so SOS can alert them if you need help.
              </ThemedText>
            </View>
          ) : null
        )}
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: Spacing.lg,
  },
  addForm: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  formActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  contactList: {
    marginTop: Spacing.xs,
  },
  listHeader: {
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
