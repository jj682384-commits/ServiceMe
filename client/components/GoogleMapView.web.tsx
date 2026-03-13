import React from "react";
import { View, Image, StyleSheet } from "react-native";

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  icon?: React.ReactNode;
}

interface GoogleMapViewProps {
  latitude: number;
  longitude: number;
  markers?: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  style?: any;
  showsUserLocation?: boolean;
  showRoute?: boolean;
  routeCoordinates?: { latitude: number; longitude: number }[];
  routeColor?: string;
  fallback?: React.ReactNode;
  mapStyle?: "standard" | "dark";
}

const MARKER_COLORS: Record<string, string> = {
  user: "blue",
  provider: "red",
  driver: "green",
};

export function GoogleMapView({
  latitude,
  longitude,
  markers = [],
  style,
  fallback,
  mapStyle = "standard",
}: GoogleMapViewProps) {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return fallback ? <>{fallback}</> : null;
  }

  const markerParams = markers
    .map((m, i) => {
      const color = MARKER_COLORS[m.id] ?? (i === 0 ? "blue" : "red");
      return `markers=color:${color}|label:${i === 0 ? "U" : "P"}|${m.latitude},${m.longitude}`;
    })
    .join("&");

  const darkStyle = mapStyle === "dark"
    ? "&style=element:geometry|color:0x1a1a2e&style=element:labels.text.fill|color:0xa0a0b0&style=feature:road|element:geometry|color:0x2d2d4e&style=feature:water|element:geometry|color:0x0d1b2a"
    : "";

  const src = [
    "https://maps.googleapis.com/maps/api/staticmap",
    `?center=${latitude},${longitude}`,
    `&zoom=14`,
    `&size=640x400`,
    `&scale=2`,
    markerParams ? `&${markerParams}` : "",
    darkStyle,
    `&key=${apiKey}`,
  ].join("");

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: src }}
        style={styles.map}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
