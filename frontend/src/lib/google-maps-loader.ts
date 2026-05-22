import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

let initPromise: Promise<void> | null = null;

/**
 * Returns true only when the env variable is a real Maps API key.
 */
export function isGoogleMapsConfigured(): boolean {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return Boolean(key && key !== "YOUR_GOOGLE_MAPS_API_KEY_HERE" && key.startsWith("AIzaSy"));
}

/**
 * Singleton init — sets options and imports the core Maps libraries.
 * Safe to call multiple times; only runs once.
 */
export function ensureGoogleMapsLoaded(): Promise<void> {
  if (initPromise) return initPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

  // Configure the loader with the new functional API
  setOptions({
    apiKey,
    version: "weekly",
  });

  // Import all needed libraries in parallel
  initPromise = Promise.all([
    importLibrary("maps"),
    importLibrary("places"),
    importLibrary("geocoding"),
    importLibrary("marker"),
  ]).then(() => undefined);

  return initPromise;
}

/**
 * Reverse-geocode lat/lng → human-readable neighbourhood / area name.
 * Requires the SDK to be loaded first via ensureGoogleMapsLoaded().
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  await ensureGoogleMapsLoaded();
  const geocoder = new google.maps.Geocoder();
  try {
    const result = await geocoder.geocode({ location: { lat, lng } });
    if (!result.results.length) return "Unknown Area";

    for (const r of result.results) {
      for (const comp of r.address_components) {
        if (
          comp.types.includes("neighborhood") ||
          comp.types.includes("sublocality") ||
          comp.types.includes("locality")
        ) {
          return comp.long_name;
        }
      }
    }
    return result.results[0].formatted_address.split(",")[0];
  } catch {
    return "Mumbai";
  }
}
