export type TimeOfDay = "day" | "night";
export type AreaType = "normal" | "isolated" | "crowded";
export type SafetyStatus = "Safe" | "Moderate" | "High Risk";

export interface SafeHerLocation {
  latitude: number;
  longitude: number;
  label: string;
  areaType: AreaType;
  timeOfDay: TimeOfDay;
}

export interface SafeHerRiskSnapshot {
  sessionId: string;
  safetyScore: number;
  riskScore: number;
  status: SafetyStatus;
  alertTriggered: boolean;
  emergencyMessage: string;
  alertChannel: string;
  location: SafeHerLocation;
  timestamp: string;
}

export interface SafeHerTrackingRequest {
  demoNight: boolean;
  demoIsolated: boolean;
  location: SafeHerLocation;
  source?: "auto" | "manual" | "sos";
  sosTriggered?: boolean;
}

const API_ROOT = "/api";

function fallbackRisk(request: SafeHerTrackingRequest): SafeHerRiskSnapshot {
  const timeRisk = request.demoNight || request.location.timeOfDay === "night" ? 35 : 15;
  const areaRisk = request.demoIsolated
    ? 45
    : request.location.areaType === "crowded"
      ? 12
      : request.location.areaType === "isolated"
        ? 38
        : 20;
  const manualRisk = request.sosTriggered ? 90 : request.source === "manual" ? 6 : 0;
  const riskScore = Math.min(100, Math.max(0, timeRisk + areaRisk + manualRisk));
  const safetyScore = Math.max(0, 100 - riskScore);
  const status: SafetyStatus = riskScore >= 70 ? "High Risk" : riskScore >= 40 ? "Moderate" : "Safe";
  const alertTriggered = riskScore > 70;

  return {
    sessionId: "local-demo",
    safetyScore,
    riskScore,
    status,
    alertTriggered,
    emergencyMessage: alertTriggered
      ? "Emergency alert generated. Trusted contacts and emergency services should be notified immediately."
      : "Tracking is active and conditions remain within the expected safety range.",
    alertChannel: request.sosTriggered ? "SOS" : alertTriggered ? "Autonomous" : "Monitoring",
    location: request.location,
    timestamp: new Date().toISOString(),
  };
}

async function requestJson<T>(path: string, init: RequestInit, fallback: () => T): Promise<T> {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      ...init,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback();
  }
}

export function startTracking(request: SafeHerTrackingRequest) {
  return requestJson<SafeHerRiskSnapshot>(
    "/start-tracking",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    () => fallbackRisk(request),
  );
}

export function postLocation(request: SafeHerTrackingRequest) {
  return requestJson<SafeHerRiskSnapshot>(
    "/location",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    () => fallbackRisk(request),
  );
}

export function fetchRisk() {
  return requestJson<SafeHerRiskSnapshot>(
    "/risk",
    {
      method: "GET",
    },
    () =>
      fallbackRisk({
        demoNight: false,
        demoIsolated: false,
        source: "auto",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          label: "Connaught Place",
          areaType: "normal",
          timeOfDay: "day",
        },
      }),
  );
}