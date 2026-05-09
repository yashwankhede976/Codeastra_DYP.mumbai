export type TimeOfDay = "day" | "night";
export type AreaType = "normal" | "isolated" | "crowded";
export type SafetyStatus = "Safe" | "Moderate" | "High Risk" | "High";

export interface SafeHerLocation {
  latitude: number;
  longitude: number;
  label: string;
  areaType: AreaType;
  timeOfDay: TimeOfDay;
}

export interface MLFactors {
  summary?: string;
  sos_triggered?: string;
  time_of_day?: string;
  area_type?: string;
  speed?: string;
}

export interface RiskAnalysisResponse {
  analysis_id: number;
  risk_score: number;
  safety_score: number;
  risk_level: SafetyStatus;
  confidence: number;
  factors: MLFactors;
  alert_triggered: boolean;
  probabilities: { Low: number; Medium: number; High: number };
  location: { latitude: number; longitude: number; label: string };
  analyzed_at: string;
  recommended_action: string;
}

export interface AgentActionResponse {
  session_id: string;
  risk_score: number;
  risk_level: string;
  actions_count: number;
  autonomous: boolean;
  timestamp: string;
  actions: Array<{
    id: number;
    action_type: string;
    priority: number;
    reason: string;
    payload: Record<string, unknown> | unknown[] | string | number | boolean | null;
    status: string;
    executed_at: string;
  }>;
}

export interface SOSResponse {
  alert_id: number;
  alert_type: string;
  status: string;
  message: string;
  contacts_notified: Array<Record<string, unknown>>;
  location: { latitude: number; longitude: number };
  created_at: string;
}

export interface SafeHerTrackingRequest {
  demoNight: boolean;
  demoIsolated: boolean;
  location: SafeHerLocation;
  source?: "auto" | "manual" | "sos";
  sosTriggered?: boolean;
  hourOfDay?: number;
  speedKmh?: number;
  sessionId?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_verified?: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  message: string;
  user: AuthUser;
  tokens: AuthTokens;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  email: string;
  password_confirm: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

const API_ROOT = "/api";
// Default location is Mumbai CST (18.9398, 72.8355) — real GPS overrides this at runtime

type ApiErrorPayload = {
  detail?: string;
  error?: string;
  message?: string;
};

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  const payload: unknown = await response.json().catch(() => null);
  const errorPayload = typeof payload === "object" && payload !== null ? (payload as ApiErrorPayload) : null;

  if (!response.ok) {
    const message = errorPayload?.detail || errorPayload?.error || errorPayload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function analyzeRisk(request: SafeHerTrackingRequest) {
  return requestJson<RiskAnalysisResponse>("/risk/analyze/", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function triggerAgent(payload: {
  riskScore: number;
  riskLevel: string;
  latitude: number;
  longitude: number;
  sessionId?: string;
  sosTriggered?: boolean;
  factors?: MLFactors;
}) {
  return requestJson<AgentActionResponse>("/agent/trigger/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function activateSOS(payload: {
  latitude: number;
  longitude: number;
  sessionId?: string;
  riskScore?: number;
  message?: string;
}) {
  return requestJson<SOSResponse>("/sos/activate/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: LoginRequest) {
  return requestJson<AuthResponse>("/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerUser(payload: RegisterRequest) {
  return requestJson<AuthResponse>("/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}