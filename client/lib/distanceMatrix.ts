const GMAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export async function fetchDrivingMiles(
  originLat: number,
  originLng: number,
  destinationAddress: string
): Promise<number | null> {
  if (!GMAPS_KEY || !destinationAddress) return null;
  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${originLat},${originLng}` +
      `&destinations=${encodeURIComponent(destinationAddress)}` +
      `&key=${GMAPS_KEY}` +
      `&units=imperial`;
    const res = await fetch(url);
    const data = await res.json();
    const el = data?.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return null;
    const meters: number = el.distance?.value ?? 0;
    return Math.round((meters / 1609.34) * 10) / 10;
  } catch {
    return null;
  }
}
