import { getApiUrl } from "@/lib/query-client";

export interface ChargerStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMi: number;
  distance: string;
  chargerCount: number;
  available: number;
  speed: string;
  network: string;
  pricePerKwh: string;
}

export async function fetchNearbyChargers(
  lat: number,
  lon: number
): Promise<ChargerStation[]> {
  const url = new URL("/api/ev/chargers", getApiUrl());
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Charger fetch failed: ${res.status}`);
  return res.json() as Promise<ChargerStation[]>;
}
