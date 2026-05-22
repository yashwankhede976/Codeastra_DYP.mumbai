import { useEffect, useRef, useState } from "react";

/** Mumbai CST fallback when GPS permission is denied */
export const MUMBAI_FALLBACK = { lat: 18.9398, lng: 72.8355 } as const;

export interface GeolocationState {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
  supported: boolean;
  permissionGranted: boolean;
  loading: boolean;
}

/**
 * Continuously watches the device's real GPS position via
 * navigator.geolocation.watchPosition. Falls back to Mumbai CST
 * if the browser denies permission or GPS is unavailable.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: MUMBAI_FALLBACK.lat,
    lng: MUMBAI_FALLBACK.lng,
    accuracy: null,
    heading: null,
    speed: null,
    error: null,
    supported: "geolocation" in navigator,
    permissionGranted: false,
    loading: true,
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
        loading: false,
      }));
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          error: null,
          supported: true,
          permissionGranted: true,
          loading: false,
        });
      },
      (err) => {
        let message = "Location access denied. Using Mumbai as fallback.";
        if (err.code === err.TIMEOUT) message = "Location request timed out. Using Mumbai as fallback.";
        if (err.code === err.POSITION_UNAVAILABLE) message = "Location unavailable. Using Mumbai as fallback.";
        setState((prev) => ({ ...prev, error: message, loading: false }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return state;
}
