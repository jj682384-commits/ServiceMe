import React from "react";

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

export function GoogleMapView({ fallback }: GoogleMapViewProps) {
  return fallback ? <>{fallback}</> : null;
}
