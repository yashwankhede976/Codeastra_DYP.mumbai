import { useEffect, useRef, useState, useCallback } from "react";
import { Shield, Radar, Navigation2, Locate, ShieldAlert } from "lucide-react";
import { ensureGoogleMapsLoaded, isGoogleMapsConfigured } from "@/lib/google-maps-loader";
import { useSafeHer } from "./SafeHerProvider";

// ─── Dark map style matching SafeHer's theme ──────────────────────────────
// Plain objects — no google.* values used here, so safe to define at module scope
const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0d0d1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a7a9a" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#141428" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#555570" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0a1a0a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e1e38" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#252540" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#4a4a6a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#282848" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#363660" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#8080a0" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#141428" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#6a6a8a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#04081a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#2a3a5a" }] },
];

const SATELLITE_STYLE: never[] = [];

// ─── Helpers — only called after ensureGoogleMapsLoaded() resolves ──────────
function makeUserIcon(color: string) {
  return {
    // google.maps.SymbolPath.CIRCLE === 0
    path: 0 as unknown as google.maps.SymbolPath,
    scale: 11,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}

function makeSafeIcon(color: string) {
  return {
    path: 0 as unknown as google.maps.SymbolPath,
    scale: 7,
    fillColor: color,
    fillOpacity: 0.85,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

// ─── StatPill ─────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-deep/80 p-3 text-left backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-foreground/45">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-neutral-light">{value}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export function GoogleTrackingMap() {
  const {
    location,
    safetyScore,
    status,
    riskScore,
    alertTriggered,
    isTracking,
    triggerSOS,
  } = useSafeHer();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const trailRef = useRef<google.maps.Polyline | null>(null);
  const innerCircleRef = useRef<google.maps.Circle | null>(null);
  const outerCircleRef = useRef<google.maps.Circle | null>(null);
  const sosMarkerRef = useRef<google.maps.Marker | null>(null);
  const nearbyMarkersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const trailPointsRef = useRef<{ lat: number; lng: number }[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);

  const center = { lat: location.latitude, lng: location.longitude };
  const accent = alertTriggered ? "#ef4444" : "#a4e3be";

  // ── Init map once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setMapError("Add your Google Maps API key to frontend/.env as VITE_GOOGLE_MAPS_API_KEY");
      return;
    }

    ensureGoogleMapsLoaded()
      .then(() => {
        if (!containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: 16,
          styles: DARK_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        });

        mapRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();

        // User marker
        userMarkerRef.current = new google.maps.Marker({
          position: center,
          map,
          title: "Your location",
          icon: makeUserIcon(accent),
          zIndex: 200,
          animation: google.maps.Animation.DROP,
        });

        // Click → show coords
        userMarkerRef.current.addListener("click", () => {
          infoWindowRef.current?.setContent(
            `<div style="color:#111;font-size:13px;padding:4px 2px;">
              <strong>📍 You are here</strong><br/>
              ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}<br/>
              <span style="color:#555">Safety: ${safetyScore}/100 · ${status}</span>
             </div>`,
          );
          infoWindowRef.current?.open(map, userMarkerRef.current!);
        });

        // Inner safe circle
        innerCircleRef.current = new google.maps.Circle({
          center,
          radius: 300,
          map,
          fillColor: accent,
          fillOpacity: 0.09,
          strokeColor: accent,
          strokeOpacity: 0.6,
          strokeWeight: 2,
        });

        // Outer risk circle
        outerCircleRef.current = new google.maps.Circle({
          center,
          radius: 700,
          map,
          fillColor: accent,
          fillOpacity: 0.03,
          strokeColor: accent,
          strokeOpacity: 0.2,
          strokeWeight: 1,
        });

        // Trail polyline
        trailPointsRef.current = [center];
        trailRef.current = new google.maps.Polyline({
          path: [center],
          map,
          strokeColor: accent,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          geodesic: true,
        });

        setMapReady(true);
      })
      .catch((err: unknown) => {
        setMapError("Google Maps failed to load: " + String(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers/circles when location or alert changes ─────────────
  useEffect(() => {
    if (!mapReady) return;

    const newPos = new google.maps.LatLng(center.lat, center.lng);
    const color = alertTriggered ? "#ef4444" : "#a4e3be";

    // Move user marker
    userMarkerRef.current?.setPosition(newPos);
    userMarkerRef.current?.setIcon(makeUserIcon(color));

    // Update circles
    innerCircleRef.current?.setCenter(newPos);
    innerCircleRef.current?.setRadius(alertTriggered ? 550 : 300);
    innerCircleRef.current?.setOptions({ fillColor: color, strokeColor: color });

    outerCircleRef.current?.setCenter(newPos);
    outerCircleRef.current?.setOptions({ fillColor: color, strokeColor: color });

    // Extend trail (keep last 20 points)
    const prev = trailPointsRef.current;
    const last = prev[prev.length - 1];
    if (!last || last.lat !== center.lat || last.lng !== center.lng) {
      trailPointsRef.current = [...prev, center].slice(-20);
      trailRef.current?.setPath(trailPointsRef.current);
      trailRef.current?.setOptions({ strokeColor: color });
    }

    // Pan map smoothly
    mapRef.current?.panTo(newPos);
  }, [center.lat, center.lng, alertTriggered, mapReady]);


  // ── Load nearby safe places via backend (hospitals, police + fallback zones) ─
  const loadNearbyPlaces = useCallback(async () => {
    if (!mapReady || !mapRef.current) return;

    // Clear old nearby markers
    nearbyMarkersRef.current.forEach((m) => m.setMap(null));
    nearbyMarkersRef.current = [];
    setNearbyCount(0);

    const placeTypeConfig: Record<string, { color: string; emoji: string }> = {
      hospital:   { color: "#f87171", emoji: "🏥" },
      police:     { color: "#60a5fa", emoji: "🚔" },
      safe_zone:  { color: "#a4e3be", emoji: "📍" },
    };

    try {
      const resp = await fetch(
        `/api/routes/nearby-safe-places/?lat=${center.lat}&lng=${center.lng}&radius=2000`,
      );
      if (!resp.ok) throw new Error("backend error");
      const data: {
        places: { name: string; latitude: number; longitude: number; place_type: string; address: string }[];
        source: string;
      } = await resp.json();

      const places = data.places ?? [];
      let total = 0;

      places.forEach((place) => {
        const cfg = placeTypeConfig[place.place_type] ?? { color: "#a4e3be", emoji: "📍" };
        const pos = { lat: place.latitude, lng: place.longitude };

        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current!,
          title: place.name,
          icon: makeSafeIcon(cfg.color),
          zIndex: 50,
        });

        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(
            `<div style="color:#111;font-size:13px;padding:4px 2px;">
              <strong>${cfg.emoji} ${place.name}</strong><br/>
              <span style="color:#555">${place.address || (data.source === "fallback_config" ? "Mumbai Safe Zone" : "")}</span>
             </div>`,
          );
          infoWindowRef.current?.open(mapRef.current!, marker);
        });

        nearbyMarkersRef.current.push(marker);
        total++;
      });

      setNearbyCount(total);

      // Pan map to show all markers
      if (total > 0 && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: center.lat, lng: center.lng });
        nearbyMarkersRef.current.forEach((m) => {
          const p = m.getPosition();
          if (p) bounds.extend(p);
        });
        mapRef.current.fitBounds(bounds, 60);
      }
    } catch {
      // Last resort: show configured Mumbai safe zones as markers
      const fallback = [
        { name: "CST Police Station",       lat: 18.9400, lng: 72.8350, emoji: "🚔", color: "#60a5fa" },
        { name: "KEM Hospital",             lat: 18.9920, lng: 72.8400, emoji: "🏥", color: "#f87171" },
        { name: "Lilavati Hospital",        lat: 19.0510, lng: 72.8283, emoji: "🏥", color: "#f87171" },
        { name: "Mumbai Central Station",   lat: 18.9691, lng: 72.8191, emoji: "📍", color: "#a4e3be" },
        { name: "Colaba Police Station",    lat: 18.9225, lng: 72.8323, emoji: "🚔", color: "#60a5fa" },
        { name: "Cooper Hospital",          lat: 19.1076, lng: 72.8388, emoji: "🏥", color: "#f87171" },
        { name: "Dadar Railway Station",    lat: 19.0178, lng: 72.8437, emoji: "📍", color: "#a4e3be" },
      ];
      fallback.forEach(({ name, lat, lng, emoji, color }) => {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map: mapRef.current!,
          title: name,
          icon: makeSafeIcon(color),
          zIndex: 50,
        });
        marker.addListener("click", () => {
          infoWindowRef.current?.setContent(
            `<div style="color:#111;font-size:13px;padding:4px 2px;"><strong>${emoji} ${name}</strong><br/><span style="color:#555">Mumbai</span></div>`,
          );
          infoWindowRef.current?.open(mapRef.current!, marker);
        });
        nearbyMarkersRef.current.push(marker);
      });
      setNearbyCount(fallback.length);
    }
  }, [mapReady, center.lat, center.lng]);


  // ── Toggle satellite / dark ───────────────────────────────────────────
  const toggleMapType = () => {
    if (!mapRef.current) return;
    if (!isSatellite) {
      mapRef.current.setMapTypeId("satellite");
      mapRef.current.setOptions({ styles: SATELLITE_STYLE });
    } else {
      mapRef.current.setMapTypeId("roadmap");
      mapRef.current.setOptions({ styles: DARK_STYLE });
    }
    setIsSatellite(!isSatellite);
  };

  // ── Place SOS marker when alert fires ────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    if (alertTriggered) {
      if (sosMarkerRef.current) {
        sosMarkerRef.current.setPosition(center);
      } else {
        sosMarkerRef.current = new google.maps.Marker({
          position: center,
          map: mapRef.current!,
          title: "SOS Location",
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 7,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 150,
          animation: google.maps.Animation.BOUNCE,
        });
        sosMarkerRef.current.addListener("click", () => {
          infoWindowRef.current?.setContent(
            `<div style="color:#111;font-size:13px;padding:4px 2px;">
              <strong>⚠️ High Risk Alert</strong><br/>
              Risk Score: ${riskScore}<br/>
              <span style="color:#c00">SOS location recorded</span>
             </div>`,
          );
          infoWindowRef.current?.open(mapRef.current!, sosMarkerRef.current!);
        });
      }
    } else {
      sosMarkerRef.current?.setMap(null);
      sosMarkerRef.current = null;
    }
  }, [alertTriggered, mapReady]);

  // ─── Error UI ─────────────────────────────────────────────────────────
  if (mapError) {
    return (
      <div className="flex h-[560px] flex-col items-center justify-center gap-4 rounded-[2rem] border border-red-500/30 bg-red-500/5 p-8 text-center">
        <div className="text-4xl">🗺️</div>
        <div className="font-semibold text-red-300">Google Maps Not Configured</div>
        <div className="max-w-sm text-sm text-foreground/60">{mapError}</div>
        <code className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-soft-highlight">
          VITE_GOOGLE_MAPS_API_KEY=your_key_here
        </code>
      </div>
    );
  }

  // ─── Map UI ───────────────────────────────────────────────────────────
  return (
    <div className="relative h-[560px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_25px_90px_-40px_rgba(0,0,0,0.85)]">
      {/* Map container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-deep/90 backdrop-blur">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-soft-highlight border-t-transparent" />
          <span className="text-sm text-foreground/60">Loading Google Maps…</span>
        </div>
      )}

      {/* Top-left: location label */}
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-bg-deep/80 px-4 py-3 backdrop-blur">
        <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/45">Current location</div>
        <div className="mt-1 text-sm font-medium text-neutral-light">{location.label}</div>
        <div className="text-xs text-foreground/50">
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </div>
      </div>

      {/* Top-right controls */}
      <div className="absolute right-4 top-4 flex flex-col gap-2">
        <button
          onClick={toggleMapType}
          className="rounded-xl border border-white/10 bg-bg-deep/80 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur transition hover:bg-white/10"
          title="Toggle satellite view"
        >
          {isSatellite ? "🗺 Map" : "🛰 Satellite"}
        </button>
        <button
          onClick={loadNearbyPlaces}
          className="rounded-xl border border-white/10 bg-bg-deep/80 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur transition hover:bg-white/10"
          title="Show nearby hospitals & police"
        >
          {nearbyCount > 0 ? `📍 ${nearbyCount} nearby` : "🏥 Nearby"}
        </button>
      </div>

      {/* Alert banner */}
      {alertTriggered && (
        <div className="pointer-events-none absolute left-4 right-4 top-20 rounded-2xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-center backdrop-blur">
          <span className="text-sm font-semibold text-red-300">⚠️ High Risk Detected — SOS Available</span>
        </div>
      )}

      {/* Bottom stat pills */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-16 grid gap-2 grid-cols-3">
        <StatPill icon={<Shield className="h-3.5 w-3.5" />} label="Safety" value={`${safetyScore}/100`} />
        <StatPill icon={<Radar className="h-3.5 w-3.5" />} label="Status" value={status} />
        <StatPill
          icon={<Navigation2 className="h-3.5 w-3.5" />}
          label="Trail"
          value={trailPointsRef.current.length > 1 ? `${trailPointsRef.current.length} pts` : "Starting"}
        />
      </div>

      {/* SOS quick button overlay */}
      <button
        onClick={() => void triggerSOS()}
        className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] shadow-[0_0_40px_hsl(8_80%_60%/0.45)] transition hover:scale-105 active:scale-95"
        title="Trigger SOS"
      >
        <ShieldAlert className="h-5 w-5 text-white" />
      </button>

      {/* GPS tracking indicator */}
      {isTracking && (
        <div className="absolute bottom-20 right-4 rounded-xl border border-soft-highlight/20 bg-bg-deep/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-1.5">
            <Locate className="h-3.5 w-3.5 text-soft-highlight" />
            <span className="text-xs text-soft-highlight">GPS Live</span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-soft-highlight" />
          </div>
        </div>
      )}
    </div>
  );
}
