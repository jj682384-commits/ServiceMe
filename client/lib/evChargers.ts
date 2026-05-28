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

function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Simple in-memory cache keyed by zip code (clears on app restart)
const _cache = new Map<string, { ts: number; stations: ChargerStation[] }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchNearbyChargers(
  lat: number,
  lon: number
): Promise<ChargerStation[]> {
  // Step 1: reverse-geocode to zip via Nominatim (free, no key)
  const geoRes = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    { headers: { "User-Agent": "ResqRide/1.0" } }
  );
  if (!geoRes.ok) throw new Error(`Nominatim ${geoRes.status}`);
  const geoJson = (await geoRes.json()) as { address?: { postcode?: string } };
  const zipCode = geoJson.address?.postcode?.split("-")[0];
  if (!zipCode) throw new Error("No zip code returned");

  // Step 2: check cache
  const cached = _cache.get(zipCode);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    // Re-sort by current position (may vary within same zip)
    return cached.stations
      .map((s) => {
        const d = haversineMi(lat, lon, s.latitude, s.longitude);
        return { ...s, distanceMi: d, distance: d < 0.1 ? "< 0.1 mi" : `${d.toFixed(1)} mi` };
      })
      .sort((a, b) => a.distanceMi - b.distanceMi);
  }

  // Step 3: query NREL AFDC (US Dept of Energy – free, DEMO_KEY)
  const nrelUrl = new URL("https://developer.nrel.gov/api/alt-fuel-stations/v1.json");
  nrelUrl.searchParams.set("api_key", "DEMO_KEY");
  nrelUrl.searchParams.set("fuel_type", "ELEC");
  nrelUrl.searchParams.set("zip", zipCode);
  nrelUrl.searchParams.set("radius", "20.0");
  nrelUrl.searchParams.set("limit", "50");
  nrelUrl.searchParams.set("status", "E");

  const nrelRes = await fetch(nrelUrl.toString(), {
    headers: { "User-Agent": "ResqRide/1.0" },
  });
  if (!nrelRes.ok) throw new Error(`NREL ${nrelRes.status}`);

  const nrelJson = (await nrelRes.json()) as {
    error?: { code: string };
    fuel_stations?: Array<{
      id: number;
      station_name: string;
      street_address: string;
      city: string;
      state: string;
      latitude: number;
      longitude: number;
      ev_level2_evse_num: number | null;
      ev_dc_fast_num: number | null;
      ev_network: string | null;
    }>;
  };

  if (nrelJson.error) throw new Error(`NREL: ${nrelJson.error.code}`);

  const stations: ChargerStation[] = (nrelJson.fuel_stations ?? [])
    .map((s) => {
      const distMi = haversineMi(lat, lon, s.latitude, s.longitude);
      const l2 = s.ev_level2_evse_num ?? 0;
      const dcFast = s.ev_dc_fast_num ?? 0;
      const total = Math.max(l2 + dcFast, 1);
      return {
        id: String(s.id),
        name: s.station_name || "Charging Station",
        address: [s.street_address, s.city, s.state].filter(Boolean).join(", "),
        latitude: s.latitude,
        longitude: s.longitude,
        distanceMi: distMi,
        distance: distMi < 0.1 ? "< 0.1 mi" : `${distMi.toFixed(1)} mi`,
        chargerCount: total,
        available: total,
        speed: dcFast > 0 ? "DC Fast" : "Level 2",
        network: s.ev_network || "Unknown",
        pricePerKwh: "Varies",
      };
    })
    .filter((s) => s.distanceMi <= 20)
    .sort((a, b) => a.distanceMi - b.distanceMi);

  _cache.set(zipCode, { ts: Date.now(), stations });
  return stations;
}
