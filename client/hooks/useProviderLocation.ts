import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { getApiUrl, apiRequest } from "@/lib/query-client";

async function patchLocation(providerId: string, latitude: number, longitude: number) {
  try {
    await apiRequest("PATCH", `/api/providers/${providerId}/location`, { latitude, longitude });
  } catch {
  }
}

export async function registerProviderOnServer(provider: {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  servicesOffered: string[];
  isAvailable: boolean;
  providerType: string;
  verificationStatus: string;
  badges?: { type: string; label: string }[];
  location?: { latitude: number; longitude: number };
}) {
  try {
    await apiRequest("POST", "/api/providers/register", {
      ...provider,
      ...(provider.location ? { location: provider.location } : {}),
    });
  } catch {
  }
}

export async function updateProviderAvailability(providerId: string, isAvailable: boolean) {
  try {
    await apiRequest("PATCH", `/api/providers/${providerId}/availability`, { isAvailable });
  } catch {
  }
}

export function useProviderLocation(providerId: string | null, isAvailable: boolean) {
  const lastPos = useRef<{ latitude: number; longitude: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!providerId || !isAvailable || Platform.OS === "web") return;

    let cancelled = false;

    const start = async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted || cancelled) return;

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (cancelled) return;

      lastPos.current = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      patchLocation(providerId, current.coords.latitude, current.coords.longitude);

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 30 },
        (loc) => {
          lastPos.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      );

      intervalRef.current = setInterval(() => {
        if (lastPos.current) {
          patchLocation(providerId, lastPos.current.latitude, lastPos.current.longitude);
        }
      }, 15000);
    };

    start();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [providerId, isAvailable]);
}
