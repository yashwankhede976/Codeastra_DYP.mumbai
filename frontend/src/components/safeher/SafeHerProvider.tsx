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
  factors: MLFactors | null;
  confidence: number | null;
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

export function SafeHerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [demoNight, setDemoNight] = useState(false);
  const [demoIsolated, setDemoIsolated] = useState(false);
  const [factors, setFactors] = useState<MLFactors | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  
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

  useEffect(() => {
    return () => clearTicker();
  }, []);

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
    
    // Update location based on what backend returns
    setLocation(prev => ({
      ...prev,
      latitude: analysis.location.latitude,
      longitude: analysis.location.longitude,
      label: analysis.location.label || prev.label,
    }));

    if (analysis.alert_triggered && !sosTriggered) {
      toast.error("High risk detected", {
        description: analysis.recommended_action,
      });
      
      // Autonomous Agentic Trigger
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
           toast.info(`Agent Action: ${action.action_type}`, {
             description: action.reason,
           });
        });
      } catch (err) {
        console.error("Agentic engine error", err);
      }
    }
  };

  const syncLocation = async (source: "auto" | "manual" | "sos") => {
    const nextLocation = createLocation(location, { demoNight, demoIsolated });
    
    try {
      const analysis = await analyzeRisk({
        demoNight,
        demoIsolated,
        location: nextLocation,
        source,
        sosTriggered: source === "sos",
        sessionId: "demo-session-id",
        speedKmh: Math.random() * 40, // demo speed
      });
      
      await applySnapshot(analysis, source === "sos");
    } catch (err) {
      toast.error("Backend unreachable", { description: "Failed to connect to ML risk engine." });
    }
  };

  const startMonitoring = async () => {
    clearTicker();
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
    if (!isTracking) {
      setIsTracking(true);
    }
    
    toast.success("SOS Initiated", {
      description: "Triggering emergency workflows...",
    });

    try {
      await activateSOS({
        latitude: location.latitude,
        longitude: location.longitude,
        sessionId: "demo-session-id",
        riskScore: snapshot.riskScore,
        message: "User initiated SOS from dashboard.",
      });
      await syncLocation("sos");
    } catch (err) {
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
      startMonitoring,
      triggerSOS,
      toggleDemoNight: (value: boolean) => setDemoNight(value),
      toggleDemoIsolated: (value: boolean) => setDemoIsolated(value),
    }),
    [demoIsolated, demoNight, isTracking, location, snapshot.alertTriggered, snapshot.recommendedAction, snapshot.riskScore, snapshot.sessionId, snapshot.safetyScore, snapshot.status, snapshot.timestamp, factors, confidence],
  );

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
  if (riskScore >= 70) return "High Risk";
  if (riskScore >= 40) return "Moderate";
  return "Safe";
}
