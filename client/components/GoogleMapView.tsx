import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

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

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a0a0b0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d4e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#16213e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a6e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e1e3e" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2e1a" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2a2a4e" }] },
];

export function GoogleMapView({
  latitude,
  longitude,
  markers = [],
  onMarkerPress,
  style,
  showsUserLocation = false,
  showRoute = false,
  routeCoordinates = [],
  routeColor = "#00D9FF",
  fallback,
  mapStyle = "standard",
}: GoogleMapViewProps) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      customMapStyle={mapStyle === "dark" ? DARK_MAP_STYLE : []}
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
          title={marker.title}
          description={marker.description}
          pinColor={marker.color}
          onPress={() => onMarkerPress?.(marker)}
        />
      ))}
      {showRoute && routeCoordinates.length > 1 ? (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={routeColor}
          strokeWidth={4}
          lineDashPattern={[10, 5]}
        />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
