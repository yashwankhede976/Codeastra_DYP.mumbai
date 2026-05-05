import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import {
  fetchRisk,
  postLocation,
  startTracking,
  type AreaType,
  type SafeHerLocation,
  type SafeHerRiskSnapshot,
  type SafetyStatus,
  type TimeOfDay,
} from "@/lib/safeher-api";

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
  startMonitoring: () => Promise<void>;
  triggerSOS: () => Promise<void>;
  toggleDemoNight: (value: boolean) => void;
  toggleDemoIsolated: (value: boolean) => void;
};

const DEFAULT_LOCATION: SafeHerLocation = {
  latitude: 28.6139,
  longitude: 77.209,
  label: "Connaught Place",
  areaType: "normal",
  timeOfDay: "day",
};

const SafeHerContext = createContext<SafeHerContextValue | null>(null);

function deriveStatus(riskScore: number): SafetyStatus {
  if (riskScore >= 70) {
    return "High Risk";
  }

  if (riskScore >= 40) {
    return "Moderate";
  }

  return "Safe";
}

function createLocation(previous: SafeHerLocation, demoState: SafeHerDemoState): SafeHerLocation {
  const latitudeJitter = (Math.random() - 0.5) * 0.006;
  const longitudeJitter = (Math.random() - 0.5) * 0.006;
  const timeOfDay: TimeOfDay = demoState.demoNight ? "night" : new Date().getHours() >= 18 ? "night" : "day";
  const areaType: AreaType = demoState.demoIsolated
    ? "isolated"
    : timeOfDay === "night"
      ? "normal"
      : Math.random() > 0.6
        ? "crowded"
        : "normal";

  return {
    latitude: Number((previous.latitude + latitudeJitter).toFixed(6)),
    longitude: Number((previous.longitude + longitudeJitter).toFixed(6)),
    label: areaType === "crowded" ? "Market Road" : areaType === "isolated" ? "Service Lane" : "Connaught Place",
    areaType,
    timeOfDay,
  };
}

function normalizeSnapshot(snapshot: SafeHerRiskSnapshot): SafeHerRiskSnapshot {
  return {
    ...snapshot,
    safetyScore: Math.max(0, Math.min(100, snapshot.safetyScore)),
    riskScore: Math.max(0, Math.min(100, snapshot.riskScore)),
    status: snapshot.status || deriveStatus(snapshot.riskScore),
  };
}

export function SafeHerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [demoNight, setDemoNight] = useState(false);
  const [demoIsolated, setDemoIsolated] = useState(false);
  const [snapshot, setSnapshot] = useState<SafeHerRiskSnapshot>({
    sessionId: "idle",
    safetyScore: 94,
    riskScore: 6,
    status: "Safe",
    alertTriggered: false,
    emergencyMessage: "Tracking is idle. Start monitoring to evaluate your route in real time.",
    alertChannel: "Monitoring",
    location: DEFAULT_LOCATION,
    timestamp: new Date().toISOString(),
  });
  const intervalRef = useRef<number | null>(null);

  const clearTicker = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTicker();
  }, []);

  const applySnapshot = (nextSnapshot: SafeHerRiskSnapshot) => {
    const normalized = normalizeSnapshot(nextSnapshot);
    setSnapshot(normalized);
    setLocation(normalized.location);

    if (normalized.alertTriggered) {
      toast.error("High risk detected", {
        description: normalized.emergencyMessage,
      });
    }
  };

  const syncLocation = async (source: "auto" | "manual" | "sos") => {
    const nextLocation = createLocation(location, { demoNight, demoIsolated });
    const nextSnapshot = await postLocation({
      demoNight,
      demoIsolated,
      location: nextLocation,
      source,
      sosTriggered: source === "sos",
    });

    applySnapshot(nextSnapshot);

    if (source === "sos") {
      toast.success("SOS sent", {
        description: "Your live location and emergency status were dispatched to the backend.",
      });
    }
  };

  const startMonitoring = async () => {
    clearTicker();

    const nextSnapshot = await startTracking({
      demoNight,
      demoIsolated,
      location: createLocation(location, { demoNight, demoIsolated }),
      source: "manual",
    });

    applySnapshot(nextSnapshot);
    setIsTracking(true);

    toast.success("Tracking started", {
      description: "SafeHer AI is monitoring your route in real time.",
    });

    intervalRef.current = window.setInterval(() => {
      void syncLocation("auto");
    }, 5000);
  };

  const triggerSOS = async () => {
    if (!isTracking) {
      setIsTracking(true);
    }

    await syncLocation("sos");
  };

  const state = useMemo<SafeHerContextValue>(
    () => ({
      isTracking,
      status: snapshot.status,
      safetyScore: snapshot.safetyScore,
      riskScore: snapshot.riskScore,
      alertTriggered: snapshot.alertTriggered,
      alertMessage: snapshot.emergencyMessage,
      emergencyMessage: snapshot.emergencyMessage,
      sessionId: snapshot.sessionId,
      lastUpdated: snapshot.timestamp,
      location,
      demoNight,
      demoIsolated,
      startMonitoring,
      triggerSOS,
      toggleDemoNight: (value: boolean) => setDemoNight(value),
      toggleDemoIsolated: (value: boolean) => setDemoIsolated(value),
    }),
    [demoIsolated, demoNight, isTracking, location, snapshot.alertTriggered, snapshot.emergencyMessage, snapshot.riskScore, snapshot.sessionId, snapshot.safetyScore, snapshot.status, snapshot.timestamp],
  );

  useEffect(() => {
    void fetchRisk().then((nextSnapshot) => {
      if (nextSnapshot.sessionId !== "local-demo") {
        applySnapshot(nextSnapshot);
      }
    });
  }, []);

  return <SafeHerContext.Provider value={state}>{children}</SafeHerContext.Provider>;
}

export function useSafeHer() {
  const context = useContext(SafeHerContext);

  if (!context) {
    throw new Error("useSafeHer must be used within a SafeHerProvider");
  }

  return context;
}

export function riskToLabel(riskScore: number): SafetyStatus {
  return deriveStatus(riskScore);
}
