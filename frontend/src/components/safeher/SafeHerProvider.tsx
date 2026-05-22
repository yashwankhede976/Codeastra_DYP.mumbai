import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  analyzeRisk,
  triggerAgent,
  activateSOS,
  type AreaType,
  type SafeHerLocation,
  type SafetyStatus,
  type TimeOfDay,
  type RiskAnalysisResponse,
  type MLFactors,
  type RiskFactorsDetail,
  type EmbeddedAgentAction,
  type NearbyPlace,
} from "@/lib/safeher-api";
import { useGeolocation, MUMBAI_FALLBACK } from "@/hooks/use-geolocation";
import { reverseGeocode, isGoogleMapsConfigured, ensureGoogleMapsLoaded } from "@/lib/google-maps-loader";

type SafeHerDemoState = {
  demoNight: boolean;
  demoIsolated: boolean;
};

type SafeHerContextValue = {
  isTracking: boolean;
  status: SafetyStatus;
  safetyScore: number;
  riskScore: number;
  alertTriggered: boolean;
  alertMessage: string;
  emergencyMessage: string;
  sessionId: string | null;
  lastUpdated: string | null;
  location: SafeHerLocation;
  demoNight: boolean;
  demoIsolated: boolean;
  factors: MLFactors | null;
  confidence: number | null;
  gpsError: string | null;
  gpsPermissionGranted: boolean;
  /** Structured per-factor score breakdown */
  riskFactorsDetail: RiskFactorsDetail | null;
  /** Agentic actions auto-executed when risk is high */
  agentActions: EmbeddedAgentAction[];
  /** Nearby safe places returned when alert triggered */
  nearbySafePlaces: NearbyPlace[];
  /** Current route deviation in km (estimated from GPS trail) */
  routeDeviationKm: number;
  startMonitoring: () => Promise<void>;
  triggerSOS: () => Promise<void>;
  toggleDemoNight: (value: boolean) => void;
  toggleDemoIsolated: (value: boolean) => void;
};

/** Mumbai CST as default */
const DEFAULT_LOCATION: SafeHerLocation = {
  latitude: MUMBAI_FALLBACK.lat,
  longitude: MUMBAI_FALLBACK.lng,
  label: "CST, Mumbai",
  areaType: "normal",
  timeOfDay: "day",
};

const SafeHerContext = createContext<SafeHerContextValue | null>(null);

/**
 * Classify area type using Google Places nearby search.
 * Falls back to demoIsolated toggle if Maps not configured.
 */
async function classifyAreaType(
  lat: number,
  lng: number,
  demoIsolated: boolean,
): Promise<AreaType> {
  if (demoIsolated) return "isolated";
  if (!isGoogleMapsConfigured()) {
    return Math.random() > 0.6 ? "crowded" : "normal";
  }

  try {
    await ensureGoogleMapsLoaded();

    return new Promise<AreaType>((resolve) => {
      const div = document.createElement("div");
      const map = new google.maps.Map(div, {
        center: { lat, lng },
        zoom: 16,
      });
      const service = new google.maps.places.PlacesService(map);

      service.nearbySearch(
        { location: { lat, lng }, radius: 250, type: "establishment" },
        (results, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            resolve("normal");
            return;
          }
          const count = results.length;
          if (count >= 10) resolve("crowded");
          else if (count <= 2) resolve("isolated");
          else resolve("normal");
        },
      );
    });
  } catch {
    return "normal";
  }
}

/**
 * Haversine distance between two lat/lng points (in km).
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function SafeHerProvider({ children }: { children: React.ReactNode }) {
  const gps = useGeolocation();

  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState<SafeHerLocation>(DEFAULT_LOCATION);
  const [demoNight, setDemoNight] = useState(false);
  const [demoIsolated, setDemoIsolated] = useState(false);
  const [factors, setFactors] = useState<MLFactors | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [riskFactorsDetail, setRiskFactorsDetail] = useState<RiskFactorsDetail | null>(null);
  const [agentActions, setAgentActions] = useState<EmbeddedAgentAction[]>([]);
  const [nearbySafePlaces, setNearbySafePlaces] = useState<NearbyPlace[]>([]);

  // Route deviation: store the "origin" GPS fix when tracking starts
  const trackingOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const [routeDeviationKm, setRouteDeviationKm] = useState(0);

  const [snapshot, setSnapshot] = useState({
    sessionId: "demo-session-id",
    safetyScore: 94,
    riskScore: 6,
    status: "Safe" as SafetyStatus,
    alertTriggered: false,
    recommendedAction: "Tracking is idle. Start monitoring to evaluate your route in real time.",
    timestamp: new Date().toISOString(),
  });

  const intervalRef = useRef<number | null>(null);

  const clearTicker = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => () => clearTicker(), []);

  // ── Keep location in sync with real GPS ─────────────────────────────
  useEffect(() => {
    if (!gps.permissionGranted || !isTracking) return;

    const timeOfDay: TimeOfDay = demoNight ? "night" : new Date().getHours() >= 18 ? "night" : "day";

    setLocation((prev) => ({
      ...prev,
      latitude: gps.lat,
      longitude: gps.lng,
      timeOfDay,
    }));

    // Route deviation = distance from tracking-start origin to current position
    if (trackingOriginRef.current) {
      const km = haversineKm(
        trackingOriginRef.current.lat,
        trackingOriginRef.current.lng,
        gps.lat,
        gps.lng,
      );
      setRouteDeviationKm(parseFloat(km.toFixed(3)));
    }

    if (isGoogleMapsConfigured()) {
      reverseGeocode(gps.lat, gps.lng)
        .then((label) => {
          setLocation((prev) => ({ ...prev, label }));
        })
        .catch(() => undefined);
    }
  }, [gps.lat, gps.lng, gps.permissionGranted, isTracking, demoNight]);

  const applySnapshot = async (analysis: RiskAnalysisResponse, sosTriggered: boolean = false) => {
    setSnapshot({
      sessionId: "demo-session-id",
      safetyScore: analysis.safety_score,
      riskScore: analysis.risk_score,
      status: analysis.risk_level,
      alertTriggered: analysis.alert_triggered,
      recommendedAction: analysis.recommended_action,
      timestamp: analysis.analyzed_at,
    });
    setFactors(analysis.factors);
    setConfidence(analysis.confidence);
    setRiskFactorsDetail(analysis.risk_factors_detail ?? null);
    setNearbySafePlaces(analysis.nearby_safe_places ?? []);

    setLocation((prev) => ({
      ...prev,
      latitude: analysis.location.latitude,
      longitude: analysis.location.longitude,
      label: analysis.location.label || prev.label,
    }));

    // Use agent_actions embedded in the risk analysis response (new v2 behaviour).
    // Only fall back to a separate /agent/trigger/ call if the backend didn't embed them.
    if (analysis.alert_triggered && !sosTriggered) {
      toast.error("High risk detected", { description: analysis.recommended_action });

      if (analysis.agent_actions && analysis.agent_actions.length > 0) {
        setAgentActions(analysis.agent_actions);
        analysis.agent_actions.forEach((action) => {
          toast.info(`Agent: ${action.action_type.replace(/_/g, " ")}`, {
            description: action.reason,
          });
        });
      } else {
        // Fallback: separate call for older backend versions
        try {
          const agentResponse = await triggerAgent({
            riskScore: analysis.risk_score,
            riskLevel: analysis.risk_level,
            latitude: analysis.location.latitude,
            longitude: analysis.location.longitude,
            sessionId: "demo-session-id",
            sosTriggered: false,
            factors: analysis.factors,
          });
          agentResponse.actions.forEach((action) => {
            toast.info(`Agent Action: ${action.action_type}`, { description: action.reason });
          });
        } catch (err) {
          console.error("Agentic engine error", err);
        }
      }
    }

    if (sosTriggered && analysis.agent_actions && analysis.agent_actions.length > 0) {
      setAgentActions(analysis.agent_actions);
    }
  };

  const syncLocation = async (source: "auto" | "manual" | "sos") => {
    const lat = gps.permissionGranted ? gps.lat : location.latitude;
    const lng = gps.permissionGranted ? gps.lng : location.longitude;
    const timeOfDay: TimeOfDay = demoNight ? "night" : new Date().getHours() >= 18 ? "night" : "day";
    const areaType = await classifyAreaType(lat, lng, demoIsolated);

    const nextLocation: SafeHerLocation = {
      latitude: lat,
      longitude: lng,
      label: location.label,
      areaType,
      timeOfDay,
    };

    try {
      const analysis = await analyzeRisk({
        demoNight,
        demoIsolated,
        location: nextLocation,
        source,
        sosTriggered: source === "sos",
        sessionId: "demo-session-id",
        speedKmh: gps.speed != null ? gps.speed * 3.6 : Math.random() * 20,
        routeDeviationKm,
        unsafeZoneProximity: "none",
      });
      await applySnapshot(analysis, source === "sos");
    } catch {
      toast.error("Backend unreachable", { description: "Failed to connect to ML risk engine." });
    }
  };

  const startMonitoring = async () => {
    clearTicker();

    if (!gps.permissionGranted && !gps.loading) {
      toast.warning("GPS permission denied", {
        description: "Using Mumbai as fallback location.",
      });
    }

    // Capture starting GPS position for route deviation computation
    trackingOriginRef.current = { lat: gps.lat, lng: gps.lng };
    setRouteDeviationKm(0);
    setAgentActions([]);
    setNearbySafePlaces([]);

    await syncLocation("manual");
    setIsTracking(true);

    toast.success("Tracking started", {
      description: "SafeHer AI is monitoring your route in real time.",
    });

    intervalRef.current = window.setInterval(() => {
      void syncLocation("auto");
    }, 5000);
  };

  const triggerSOS = async () => {
    if (!isTracking) setIsTracking(true);

    toast.success("SOS Initiated", { description: "Triggering emergency workflows…" });

    try {
      await activateSOS({
        latitude: location.latitude,
        longitude: location.longitude,
        sessionId: "demo-session-id",
        riskScore: snapshot.riskScore,
        message: "User initiated SOS from dashboard.",
      });
      await syncLocation("sos");
    } catch {
      toast.error("SOS Error", { description: "Failed to reach emergency backend." });
    }
  };

  const state = useMemo<SafeHerContextValue>(
    () => ({
      isTracking,
      status: snapshot.status,
      safetyScore: snapshot.safetyScore,
      riskScore: snapshot.riskScore,
      alertTriggered: snapshot.alertTriggered,
      alertMessage: snapshot.recommendedAction,
      emergencyMessage: snapshot.recommendedAction,
      sessionId: snapshot.sessionId,
      lastUpdated: snapshot.timestamp,
      location,
      demoNight,
      demoIsolated,
      factors,
      confidence,
      gpsError: gps.error,
      gpsPermissionGranted: gps.permissionGranted,
      riskFactorsDetail,
      agentActions,
      nearbySafePlaces,
      routeDeviationKm,
      startMonitoring,
      triggerSOS,
      toggleDemoNight: (value: boolean) => setDemoNight(value),
      toggleDemoIsolated: (value: boolean) => setDemoIsolated(value),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      demoIsolated, demoNight, isTracking, location,
      snapshot.alertTriggered, snapshot.recommendedAction, snapshot.riskScore,
      snapshot.sessionId, snapshot.safetyScore, snapshot.status, snapshot.timestamp,
      factors, confidence, gps.error, gps.permissionGranted,
      riskFactorsDetail, agentActions, nearbySafePlaces, routeDeviationKm,
    ],
  );

  return <SafeHerContext.Provider value={state}>{children}</SafeHerContext.Provider>;
}

export function useSafeHer() {
  const context = useContext(SafeHerContext);
  if (!context) throw new Error("useSafeHer must be used within a SafeHerProvider");
  return context;
}

export function riskToLabel(riskScore: number): SafetyStatus {
  if (riskScore >= 71) return "High Risk";
  if (riskScore >= 31) return "Moderate";
  return "Safe";
}
