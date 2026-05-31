import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlacesAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
  style?: object;
  inputStyle?: object;
  autoFocus?: boolean;
}

export default function PlacesAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = "Search for an address...",
  style,
  inputStyle,
  autoFocus = false,
}: PlacesAutocompleteProps) {
  const { theme } = useTheme();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionToken = useRef(Math.random().toString(36).slice(2));

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    if (!GOOGLE_PLACES_KEY) {
      return;
    }
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_PLACES_KEY}&sessiontoken=${sessionToken.current}&types=geocode`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  const handleSelect = (prediction: Prediction) => {
    sessionToken.current = Math.random().toString(36).slice(2);
    onSelect(prediction.description);
    onChangeText(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    onChangeText("");
    onSelect("");
    setPredictions([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: showDropdown ? theme.primary : theme.border,
          },
          inputStyle,
        ]}
      >
        <Feather name="map-pin" size={18} color={theme.primary} style={styles.pinIcon} />
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          autoFocus={autoFocus}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          onBlur={() => {
            setTimeout(() => setShowDropdown(false), 180);
          }}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: Spacing.sm }} />
        ) : value.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8} style={{ marginRight: Spacing.sm }}>
            <Feather name="x-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {showDropdown && predictions.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
              ...Platform.select({
                ios: {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                },
                android: { elevation: 8 },
                default: {},
              }),
            },
          ]}
        >
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="always"
            scrollEnabled={predictions.length > 4}
            renderItem={({ item, index }) => {
              const main = item.structured_formatting?.main_text || item.description;
              const secondary = item.structured_formatting?.secondary_text || "";
              return (
                <>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  ) : null}
                  <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                      styles.suggestionRow,
                      pressed ? { backgroundColor: theme.primary + "12" } : null,
                    ]}
                  >
                    <View style={[styles.suggestionIcon, { backgroundColor: theme.primary + "15" }]}>
                      <Feather name="map-pin" size={14} color={theme.primary} />
                    </View>
                    <View style={styles.suggestionText}>
                      <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "600", fontSize: 14 }}>
                        {main}
                      </ThemedText>
                      {secondary ? (
                        <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
                          {secondary}
                        </ThemedText>
                      ) : null}
                    </View>
                    <Feather name="arrow-up-left" size={14} color={theme.textSecondary} />
                  </Pressable>
                </>
              );
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingLeft: Spacing.md,
    minHeight: 52,
  },
  pinIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.md,
  },
  dropdown: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 1000,
    maxHeight: 240,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.md + 30 + Spacing.sm,
  },
});
