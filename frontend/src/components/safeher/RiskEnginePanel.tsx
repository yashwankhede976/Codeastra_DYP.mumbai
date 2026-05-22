import { useMemo } from "react";
import {
  ShieldAlert, ShieldCheck, Shield, Navigation, MapPin,
  Mic, Share2, Phone, AlertTriangle, Activity, Route,
  ChevronRight,
} from "lucide-react";
import { SectionHeader } from "./Dashboard";
import { useSafeHer } from "./SafeHerProvider";
import type { EmbeddedAgentAction, NearbyPlace, AgentActionType } from "@/lib/safeher-api";

// ─── Risk Score Gauge ────────────────────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));

  // SVG arc gauge — 220° sweep
  const RADIUS = 72;
  const STROKE = 10;
  const CX = 90;
  const CY = 90;
  const circumference = Math.PI * RADIUS; // half circle = πr
  const dashOffset = circumference * (1 - clamped / 100);

  const color =
    clamped >= 71
      ? "hsl(8 80% 60%)"
      : clamped >= 31
      ? "hsl(38 90% 58%)"
      : "hsl(140 13% 73%)";

  const label =
    clamped >= 71 ? "High Risk" : clamped >= 31 ? "Moderate" : "Safe";
  const labelColor =
    clamped >= 71
      ? "hsl(8 85% 80%)"
      : clamped >= 31
      ? "hsl(38 90% 75%)"
      : "hsl(140 13% 80%)";

  return (
    <div className="flex flex-col items-center justify-center gap-2 select-none">
      <svg width="180" height="110" viewBox="0 0 180 110">
        {/* Track */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke="hsl(150 19% 18% / 0.8)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.5s",
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        {/* Centre text */}
        <text x="90" y="78" textAnchor="middle" fontSize="28" fontWeight="700" fill={labelColor} fontFamily="'Space Grotesk', sans-serif">
          {clamped}
        </text>
        <text x="90" y="96" textAnchor="middle" fontSize="11" fill="hsl(140 13% 50%)" fontFamily="'Inter', sans-serif">
          / 100
        </text>
      </svg>
      <span
        className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}40`,
          color: labelColor,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Factor Bar ───────────────────────────────────────────────────────────────

interface FactorBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  icon: React.ReactNode;
}

function FactorBar({ label, value, max, color = "hsl(140 13% 73%)", icon }: FactorBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isDangerous = pct > 65;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-foreground/70">
          <span style={{ color }}>{icon}</span>
          {label}
        </span>
        <span className="font-semibold tabular-nums" style={{ color: isDangerous ? color : "hsl(140 13% 65%)" }}>
          {value} <span className="text-foreground/40 font-normal">/ {max}</span>
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "hsl(150 19% 16% / 0.8)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isDangerous
              ? `linear-gradient(90deg, ${color}99, ${color})`
              : `linear-gradient(90deg, hsl(140 13% 50%), ${color})`,
            boxShadow: isDangerous ? `0 0 8px ${color}60` : "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── Action Icon map ──────────────────────────────────────────────────────────

const ACTION_META: Record<AgentActionType, { icon: React.ReactNode; color: string; label: string }> = {
  SEND_SOS:             { icon: <ShieldAlert className="h-4 w-4" />, color: "hsl(8 80% 60%)",    label: "SOS Sent" },
  ALERT_AUTHORITIES:    { icon: <Phone className="h-4 w-4" />,       color: "hsl(8 70% 65%)",    label: "Authorities Alerted" },
  NOTIFY_CONTACTS:      { icon: <Phone className="h-4 w-4" />,       color: "hsl(38 90% 58%)",   label: "Contacts Notified" },
  START_RECORDING:      { icon: <Mic className="h-4 w-4" />,         color: "hsl(270 60% 65%)",  label: "Recording Started" },
  SHARE_LOCATION:       { icon: <Share2 className="h-4 w-4" />,      color: "hsl(200 80% 60%)",  label: "Location Shared" },
  RECOMMEND_SAFE_PLACE: { icon: <MapPin className="h-4 w-4" />,      color: "hsl(140 13% 73%)",  label: "Safe Place Suggested" },
  RECOMMEND_SAFE_ROUTE: { icon: <Route className="h-4 w-4" />,       color: "hsl(140 45% 55%)",  label: "Safe Route Suggested" },
  INCREASE_MONITORING:  { icon: <Activity className="h-4 w-4" />,    color: "hsl(200 60% 65%)",  label: "Monitoring Increased" },
};

function AgentActionCard({ action }: { action: EmbeddedAgentAction }) {
  const meta = ACTION_META[action.action_type] ?? {
    icon: <Shield className="h-4 w-4" />,
    color: "hsl(140 13% 73%)",
    label: action.action_type.replace(/_/g, " "),
  };

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4 transition-all"
      style={{
        background: `${meta.color}0d`,
        border: `1px solid ${meta.color}22`,
      }}
    >
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${meta.color}20`, color: meta.color }}
      >
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </div>
        <div className="text-xs text-foreground/55 mt-0.5 leading-relaxed line-clamp-2">
          {action.reason}
        </div>
      </div>
      <span className="text-[10px] font-medium rounded-full px-2 py-0.5 flex-shrink-0" style={{ background: `${meta.color}18`, color: meta.color }}>
        P{action.priority}
      </span>
    </div>
  );
}

// ─── Nearby Place Card ────────────────────────────────────────────────────────

function NearbyPlaceCard({ place }: { place: NearbyPlace }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:bg-white/5 group"
      style={{ border: "1px solid hsl(140 13% 73% / 0.1)" }}
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-soft-highlight/15 text-soft-highlight">
        <MapPin className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-light leading-tight truncate">
          {place.label}
        </div>
        {place.distance_m != null && (
          <div className="text-xs text-foreground/50 mt-0.5">
            {place.distance_m < 1000
              ? `${place.distance_m} m away`
              : `${(place.distance_m / 1000).toFixed(1)} km away`}
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-soft-highlight transition" />
    </a>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function RiskEnginePanel() {
  const {
    riskScore,
    safetyScore,
    alertTriggered,
    isTracking,
    riskFactorsDetail,
    agentActions,
    nearbySafePlaces,
    routeDeviationKm,
    confidence,
  } = useSafeHer();

  const probHigh   = riskScore >= 71 ? 1.0 : 0;
  const probMedium = riskScore >= 31 && riskScore < 71 ? 1.0 : 0;
  const probLow    = riskScore < 31 ? 1.0 : 0;

  const detail = riskFactorsDetail;

  const riskColor =
    riskScore >= 71
      ? "hsl(8 80% 60%)"
      : riskScore >= 31
      ? "hsl(38 90% 58%)"
      : "hsl(140 13% 73%)";

  return (
    <section
      id="risk-engine"
      className="relative mx-auto max-w-7xl px-6 py-24"
      aria-label="AI Risk Engine Panel"
    >
      <SectionHeader eyebrow="AI Risk Engine" title="Formula-driven. Autonomously acting." />

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Col 1: Risk Gauge + Formula ── */}
        <div className="glass rounded-[2rem] p-7 flex flex-col gap-6 relative overflow-hidden">
          <div
            className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl transition-all duration-700"
            style={{ background: `${riskColor}18` }}
          />
          <div className="relative">
            <div className="text-xs uppercase tracking-widest text-foreground/50 mb-4">
              Live Risk Score
            </div>

            <RiskGauge score={riskScore} />

            {confidence != null && (
              <div className="text-center text-xs text-foreground/50 mt-2">
                AI confidence: <span className="text-foreground/80 font-medium">{(confidence * 100).toFixed(0)}%</span>
              </div>
            )}

            {/* Probability bars */}
            <div className="mt-5 space-y-2">
              {[
                { label: "High Risk (≥71)", pct: riskScore >= 71 ? Math.min(100, riskScore) : Math.max(0, riskScore - 30) * 1.4, color: "hsl(8 80% 60%)" },
                { label: "Moderate (31–70)", pct: riskScore >= 31 && riskScore < 71 ? riskScore : riskScore < 31 ? 0 : 30, color: "hsl(38 90% 58%)" },
                { label: "Safe (0–30)", pct: riskScore < 31 ? safetyScore : Math.max(0, 30 - riskScore), color: "hsl(140 13% 73%)" },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-foreground/60 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Route deviation */}
            {routeDeviationKm > 0 && (
              <div
                className="mt-4 rounded-2xl p-3 flex items-center gap-2"
                style={{
                  background: routeDeviationKm >= 0.5 ? "hsl(38 90% 50% / 0.1)" : "hsl(150 19% 18% / 0.5)",
                  border: `1px solid ${routeDeviationKm >= 0.5 ? "hsl(38 90% 50% / 0.3)" : "hsl(140 13% 73% / 0.1)"}`,
                }}
              >
                <Navigation className="h-3.5 w-3.5 flex-shrink-0" style={{ color: routeDeviationKm >= 0.5 ? "hsl(38 90% 65%)" : "hsl(140 13% 65%)" }} />
                <span className="text-xs" style={{ color: routeDeviationKm >= 0.5 ? "hsl(38 80% 70%)" : "hsl(140 13% 60%)" }}>
                  Route deviation: <strong>{routeDeviationKm} km</strong>
                  {routeDeviationKm >= 0.5 && " ⚠"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Col 2: Factor Breakdown ── */}
        <div className="glass rounded-[2rem] p-7 flex flex-col gap-5 relative overflow-hidden">
          <div className="text-xs uppercase tracking-widest text-foreground/50">
            Risk Factor Breakdown
          </div>

          {!isTracking ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-8 gap-3">
              <ShieldCheck className="h-10 w-10 text-foreground/20" />
              <p className="text-sm text-foreground/40">Start tracking to see live factor analysis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <FactorBar
                label="Night-time"
                value={detail?.night_factor ?? (new Date().getHours() >= 20 || new Date().getHours() <= 5 ? 30 : 5)}
                max={detail?.max_possible.night ?? 30}
                color="hsl(250 70% 70%)"
                icon={<span className="text-[11px]">🌙</span>}
              />
              <FactorBar
                label="Isolated Area"
                value={detail?.area_factor ?? 20}
                max={detail?.max_possible.area ?? 40}
                color="hsl(38 90% 58%)"
                icon={<span className="text-[11px]">📍</span>}
              />
              <FactorBar
                label="Movement Speed"
                value={detail?.movement_factor ?? 0}
                max={detail?.max_possible.movement ?? 15}
                color="hsl(200 80% 60%)"
                icon={<span className="text-[11px]">🏃</span>}
              />
              <FactorBar
                label="Route Deviation"
                value={detail?.deviation_factor ?? 0}
                max={detail?.max_possible.deviation ?? 20}
                color="hsl(38 70% 65%)"
                icon={<span className="text-[11px]">🗺️</span>}
              />
              <FactorBar
                label="Unsafe Zone"
                value={detail?.unsafe_zone_factor ?? 0}
                max={detail?.max_possible.unsafe ?? 20}
                color="hsl(8 80% 60%)"
                icon={<span className="text-[11px]">⚠️</span>}
              />
              {(detail?.sos_override ?? 0) > 0 && (
                <FactorBar
                  label="SOS Override"
                  value={detail?.sos_override ?? 60}
                  max={60}
                  color="hsl(8 80% 60%)"
                  icon={<span className="text-[11px]">🚨</span>}
                />
              )}

              {/* Formula chip */}
              <div
                className="mt-2 rounded-2xl px-4 py-3 text-[11px] leading-relaxed text-foreground/55"
                style={{ background: "hsl(150 19% 12% / 0.7)" }}
              >
                <span className="text-foreground/80 font-mono">risk = </span>
                night + area + speed + deviation + unsafe_zone
              </div>

              {/* Risk level thresholds */}
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                {[
                  { label: "Low", range: "0–30", color: "hsl(140 13% 73%)" },
                  { label: "Medium", range: "31–70", color: "hsl(38 90% 58%)" },
                  { label: "High", range: "71–100", color: "hsl(8 80% 60%)" },
                ].map(({ label, range, color }) => (
                  <div
                    key={label}
                    className="rounded-xl py-2"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${color}28`,
                      color,
                    }}
                  >
                    <div className="font-bold">{label}</div>
                    <div className="opacity-70">{range}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Col 3: Agent Actions + Safe Places ── */}
        <div className="flex flex-col gap-5">

          {/* Agent Actions */}
          <div className="glass rounded-[2rem] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-foreground/50">
                Agentic Actions
              </div>
              {agentActions.length > 0 && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "hsl(8 80% 60% / 0.15)", color: "hsl(8 85% 80%)", border: "1px solid hsl(8 80% 60% / 0.3)" }}
                >
                  {agentActions.length} executed
                </span>
              )}
            </div>

            {agentActions.length === 0 ? (
              <div className="text-sm text-foreground/40 py-4 text-center">
                {isTracking
                  ? alertTriggered
                    ? "Processing…"
                    : "No actions yet. Risk is within safe bounds."
                  : "Actions appear when risk is HIGH (≥71)."}
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {agentActions.map((action) => (
                  <AgentActionCard key={action.id} action={action} />
                ))}
              </div>
            )}

            {/* Always-on action legend */}
            {agentActions.length === 0 && (
              <div className="mt-1 space-y-1.5">
                {[
                  { label: "risk ≥ 85", desc: "SOS + Authorities + Record + Share", color: "hsl(8 80% 60%)" },
                  { label: "risk ≥ 71", desc: "Notify Contacts + Share Location", color: "hsl(38 90% 58%)" },
                  { label: "risk ≥ 31", desc: "Share Location + Monitor", color: "hsl(200 70% 60%)" },
                ].map(({ label, desc, color }) => (
                  <div key={label} className="flex items-start gap-2 text-xs">
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 font-mono font-semibold text-[10px]"
                      style={{ background: `${color}18`, color }}
                    >
                      {label}
                    </span>
                    <span className="text-foreground/50">{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nearby Safe Places */}
          {nearbySafePlaces.length > 0 && (
            <div className="glass rounded-[2rem] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-soft-highlight" />
                <div className="text-xs uppercase tracking-widest text-foreground/50">
                  Nearby Safe Places
                </div>
              </div>
              <div className="space-y-1">
                {nearbySafePlaces.slice(0, 4).map((place, i) => (
                  <NearbyPlaceCard key={i} place={place} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
