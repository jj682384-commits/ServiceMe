import { getApiUrl } from "@/lib/query-client";

export async function fetchDrivingMiles(
  originLat: number,
  originLng: number,
  destinationAddress: string
): Promise<number | null> {
  if (!destinationAddress) return null;
  try {
    const base = getApiUrl();
    const url = new URL("/api/places/distance", base);
    url.searchParams.set("originLat", String(originLat));
    url.searchParams.set("originLng", String(originLng));
    url.searchParams.set("destination", destinationAddress);
    const res = await fetch(url.toString());
    const data = await res.json();
    return typeof data.miles === "number" ? data.miles : null;
  } catch {
    return null;
  }
}
