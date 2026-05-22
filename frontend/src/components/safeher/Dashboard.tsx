import { useMemo } from "react";
import {
  MapPin, Activity, Navigation, Cpu, Locate, WifiOff,
  ShieldCheck, ShieldAlert, Shield, Clock, Zap, Route,
  Play, Moon, AlertOctagon,
} from "lucide-react";
import { useSafeHer } from "./SafeHerProvider";

// ─── Greeting helper ──────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Animated Safety Score Gauge ─────────────────────────────────────────────

export const SafetyScore = ({ value = 94 }: { value?: number }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 68;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (clamped / 100) * circ;

  const { color, glowColor, label } = useMemo(() => {
    if (clamped >= 80) return { color: "hsl(140 50% 58%)", glowColor: "hsl(140 50% 58% / 0.45)", label: "Excellent" };
    if (clamped >= 60) return { color: "hsl(160 40% 55%)", glowColor: "hsl(160 40% 55% / 0.35)", label: "Good" };
    if (clamped >= 40) return { color: "hsl(38 90% 58%)",  glowColor: "hsl(38 90% 58% / 0.4)",   label: "Moderate" };
    return              { color: "hsl(8 80% 60%)",          glowColor: "hsl(8 80% 60% / 0.5)",     label: "At Risk" };
  }, [clamped]);

  return (
    <div className="relative h-44 w-44 shrink-0 select-none">
      {/* Outer glow ring */}
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-30 transition-all duration-700"
        style={{ background: glowColor }}
      />
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="scoreGrad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx="80" cy="80" r={radius} stroke="hsl(150 19% 18% / 0.9)" strokeWidth="9" fill="none" />
        {/* Progress arc */}
        <circle
          cx="80" cy="80" r={radius}
          stroke="url(#scoreGrad2)"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            filter: `drop-shadow(0 0 10px ${color})`,
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75].map((pct) => {
          const angle = (pct / 100) * 360 - 90;
          const rad   = (angle * Math.PI) / 180;
          const x1 = 80 + 63 * Math.cos(rad);
          const y1 = 80 + 63 * Math.sin(rad);
          const x2 = 80 + 71 * Math.cos(rad);
          const y2 = 80 + 71 * Math.sin(rad);
          return <line key={pct} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(140 13% 40%)" strokeWidth="1.5" />;
        })}
      </svg>
      {/* Centre text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <div className="text-[9px] uppercase tracking-[0.2em] text-foreground/45">Safety</div>
        <div
          className="font-display text-5xl font-bold leading-none transition-all duration-700"
          style={{ color }}
        >
          {clamped}
        </div>
        <div
          className="text-[11px] font-semibold mt-0.5 transition-all duration-700"
          style={{ color }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip = ({
  icon,
  label,
  dot,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  dot?: boolean;
  accent?: string;
}) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
    style={{
      background: accent ? `${accent}12` : "hsl(150 19% 14% / 0.7)",
      border: `1px solid ${accent ? `${accent}30` : "hsl(140 13% 73% / 0.1)"}`,
      color: accent ?? "hsl(140 13% 70%)",
    }}
  >
    {dot && (
      <span
        className="h-1.5 w-1.5 rounded-full animate-pulse"
        style={{ background: accent ?? "hsl(140 13% 73%)" }}
      />
    )}
    {icon}
    {label}
  </span>
);

// ─── Factor insight card ──────────────────────────────────────────────────────

const InsightCard = ({ label, value }: { label: string; value: string }) => {
  const icon =
    label === "time_of_day"   ? "🌙" :
    label === "area_type"     ? "📍" :
    label === "speed"         ? "🏃" :
    label === "route_deviation" ? "🗺️" :
    label === "unsafe_zone"   ? "⚠️" :
    label === "sos_triggered" ? "🚨" : "✅";

  const isAlert =
    label === "sos_triggered" || label === "unsafe_zone" || label === "route_deviation";

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300"
      style={{
        background: isAlert ? "hsl(8 80% 60% / 0.07)" : "hsl(150 19% 12% / 0.65)",
        border: `1px solid ${isAlert ? "hsl(8 80% 60% / 0.2)" : "hsl(140 13% 73% / 0.08)"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <div
          className="text-[10px] uppercase tracking-widest font-medium"
          style={{ color: isAlert ? "hsl(8 85% 75%)" : "hsl(140 13% 60%)" }}
        >
          {label.replace(/_/g, " ")}
        </div>
      </div>
      <div
        className="text-sm leading-snug"
        style={{ color: isAlert ? "hsl(8 80% 85%)" : "hsl(140 13% 80%)" }}
      >
        {value}
      </div>
    </div>
  );
};

// ─── Quick stat pill ──────────────────────────────────────────────────────────

const StatPill = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="text-lg font-display font-bold" style={{ color }}>{value}</div>
    <div className="text-[10px] text-foreground/45 uppercase tracking-wider">{label}</div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard = () => {
  const {
    isTracking,
    status,
    safetyScore,
    riskScore,
    demoNight,
    demoIsolated,
    startMonitoring,
    toggleDemoNight,
    toggleDemoIsolated,
    lastUpdated,
    confidence,
    factors,
    location,
    gpsError,
    gpsPermissionGranted,
    alertTriggered,
    routeDeviationKm,
  } = useSafeHer();

  const statusColor =
    alertTriggered ? "hsl(8 80% 60%)" :
    riskScore >= 31 ? "hsl(38 90% 58%)" :
    "hsl(140 13% 73%)";

  const StatusIcon = alertTriggered ? ShieldAlert : riskScore >= 31 ? Shield : ShieldCheck;

  const factorEntries = factors ? Object.entries(factors) : [];
  const hasFactors = factorEntries.length > 0 && !factorEntries.every(([, v]) => !v);

  return (
    <section id="dashboard" className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeader eyebrow="Dashboard" title="Your safety, at a glance" />

      <div className="mt-12 space-y-5">

        {/* ── Row 1: Hero card + Location + Quick stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

          {/* ── Hero card ── */}
          <div className="glass rounded-[2rem] p-7 relative overflow-hidden">
            {/* Ambient background */}
            <div
              className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-40 transition-all duration-700"
              style={{ background: alertTriggered ? "hsl(8 80% 60% / 0.25)" : "hsl(140 13% 73% / 0.15)" }}
            />
            {alertTriggered && (
              <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full blur-3xl opacity-25"
                style={{ background: "hsl(8 80% 60% / 0.3)" }} />
            )}

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Left: Greeting + chips + buttons */}
              <div className="flex-1 min-w-0">
                {/* Greeting row */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs text-foreground/45 uppercase tracking-widest">{greeting()}</div>
                  {alertTriggered && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "hsl(8 80% 60% / 0.15)", border: "1px solid hsl(8 80% 60% / 0.4)", color: "hsl(8 85% 80%)" }}
                    >
                      <span className="h-1 w-1 rounded-full bg-[hsl(8_80%_60%)] animate-pulse" />
                      High Alert
                    </span>
                  )}
                </div>

                <h3 className="font-display text-3xl md:text-4xl font-bold mt-0.5 tracking-tight">
                  Hello, Aanya
                </h3>

                <p className="mt-2.5 text-foreground/55 max-w-sm text-sm leading-relaxed">
                  {alertTriggered
                    ? "⚠ High risk detected on your current route. Emergency contacts notified."
                    : isTracking
                    ? "AI monitoring is active across your route home."
                    : "Start tracking to begin real-time AI safety monitoring."}
                </p>

                {/* Status chips */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Chip
                    icon={<Activity className="h-3 w-3" />}
                    label={isTracking ? "Tracking active" : "Tracking idle"}
                    dot={isTracking}
                    accent={isTracking ? "hsl(140 13% 73%)" : undefined}
                  />
                  <Chip
                    icon={<StatusIcon className="h-3 w-3" />}
                    label={status}
                    accent={statusColor}
                  />
                  {confidence != null && (
                    <Chip
                      icon={<Cpu className="h-3 w-3" />}
                      label={`AI ${(confidence * 100).toFixed(0)}% conf`}
                      accent="hsl(200 70% 60%)"
                    />
                  )}
                  {routeDeviationKm > 0 && (
                    <Chip
                      icon={<Route className="h-3 w-3" />}
                      label={`+${routeDeviationKm} km deviation`}
                      accent={routeDeviationKm >= 0.5 ? "hsl(38 90% 58%)" : undefined}
                    />
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap gap-2.5 items-center">
                  <button
                    id="start-tracking-btn"
                    onClick={() => void startMonitoring()}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-bg-deep shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, hsl(140 13% 73%), hsl(148 14% 46%))",
                      boxShadow: "0 0 30px hsl(140 13% 73% / 0.35)",
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {isTracking ? "Restart tracking" : "Start tracking"}
                  </button>

                  <button
                    id="demo-night-btn"
                    onClick={() => toggleDemoNight(!demoNight)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all hover:bg-surface/50"
                    style={{
                      background: demoNight ? "hsl(250 60% 55% / 0.15)" : "hsl(150 19% 16% / 0.6)",
                      border: `1px solid ${demoNight ? "hsl(250 60% 55% / 0.35)" : "hsl(140 13% 73% / 0.12)"}`,
                      color: demoNight ? "hsl(250 70% 80%)" : "hsl(140 13% 65%)",
                    }}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Night {demoNight ? "ON" : "OFF"}
                  </button>

                  <button
                    id="demo-isolated-btn"
                    onClick={() => toggleDemoIsolated(!demoIsolated)}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all"
                    style={{
                      background: demoIsolated ? "hsl(38 90% 50% / 0.12)" : "hsl(150 19% 16% / 0.6)",
                      border: `1px solid ${demoIsolated ? "hsl(38 90% 50% / 0.35)" : "hsl(140 13% 73% / 0.12)"}`,
                      color: demoIsolated ? "hsl(38 90% 70%)" : "hsl(140 13% 65%)",
                    }}
                  >
                    <AlertOctagon className="h-3.5 w-3.5" />
                    Isolated {demoIsolated ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Right: Safety gauge + quick stats */}
              <div className="flex flex-col items-center gap-5">
                <SafetyScore value={safetyScore} />

                {/* Mini stats row below gauge */}
                <div
                  className="flex items-center gap-5 rounded-2xl px-5 py-3"
                  style={{ background: "hsl(150 19% 12% / 0.7)", border: "1px solid hsl(140 13% 73% / 0.08)" }}
                >
                  <StatPill
                    label="Risk"
                    value={`${riskScore}`}
                    color={alertTriggered ? "hsl(8 80% 65%)" : riskScore >= 31 ? "hsl(38 90% 60%)" : "hsl(140 13% 73%)"}
                  />
                  <div className="w-px h-8 bg-white/10" />
                  <StatPill label="Safety" value={`${safetyScore}`} color="hsl(140 13% 73%)" />
                  <div className="w-px h-8 bg-white/10" />
                  <StatPill
                    label="Level"
                    value={status === "Safe" ? "Low" : status === "Moderate" ? "Med" : "High"}
                    color={statusColor}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Location card ── */}
          <div className="glass rounded-[2rem] p-6 relative overflow-hidden flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-foreground/45">Location</span>
              {gpsPermissionGranted ? (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(140 13% 73%)" }}>
                  <Locate className="h-3 w-3" />
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "hsl(140 13% 73%)" }} />
                  GPS Live
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-foreground/40">
                  <WifiOff className="h-3 w-3" />
                  Fallback
                </span>
              )}
            </div>

            {/* Location info */}
            <div className="flex items-start gap-3">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "hsl(140 13% 73% / 0.12)" }}
              >
                <MapPin className="h-5 w-5" style={{ color: "hsl(140 13% 73%)" }} />
              </div>
              <div>
                <div className="font-semibold text-neutral-light leading-tight">{location.label}</div>
                <div className="text-xs text-foreground/45 mt-0.5 font-mono">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="text-[10px] rounded-full px-2 py-0.5 capitalize font-medium"
                    style={{
                      background:
                        location.areaType === "isolated" ? "hsl(38 90% 50% / 0.12)" :
                        location.areaType === "crowded"  ? "hsl(200 70% 50% / 0.12)" :
                        "hsl(140 13% 73% / 0.1)",
                      color:
                        location.areaType === "isolated" ? "hsl(38 90% 70%)" :
                        location.areaType === "crowded"  ? "hsl(200 70% 70%)" :
                        "hsl(140 13% 65%)",
                      border: "1px solid hsl(140 13% 73% / 0.1)",
                    }}
                  >
                    {location.areaType} area
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-foreground/45">
                    <Clock className="h-2.5 w-2.5" />
                    {location.timeOfDay}
                  </span>
                </div>
              </div>
            </div>

            {gpsError && (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/8 px-3 py-2 text-xs text-yellow-300/70">
                {gpsError}
              </div>
            )}

            {/* Mini map placeholder */}
            <div
              className="mt-auto h-24 rounded-2xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(150 19% 10% / 0.9), hsl(156 22% 8% / 0.95))", border: "1px solid hsl(140 13% 73% / 0.08)" }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 35% 50%, hsl(140 13% 73%), transparent 45%), radial-gradient(circle at 70% 45%, hsl(148 14% 46%), transparent 45%)",
                }}
              />
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(140 13% 73%)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              {/* Pulse dot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "hsl(140 13% 73%)" }} />
                  <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: "hsl(140 13% 73%)" }} />
                </span>
              </div>
              <Navigation className="absolute bottom-3 right-3 h-4 w-4 text-soft-highlight/40" />
            </div>

            {/* Last updated */}
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/35">
              <Zap className="h-2.5 w-2.5" />
              {lastUpdated
                ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                : "Waiting for data…"}
            </div>
          </div>
        </div>

        {/* ── Row 2: AI Insights ── */}
        <div className="glass rounded-[2rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="h-7 w-7 rounded-xl flex items-center justify-center"
                style={{ background: "hsl(140 13% 73% / 0.12)" }}
              >
                <Cpu className="h-3.5 w-3.5" style={{ color: "hsl(140 13% 73%)" }} />
              </div>
              <div className="text-xs uppercase tracking-widest text-foreground/50">Active AI Insights</div>
            </div>
            {hasFactors && (
              <span
                className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                style={{ background: "hsl(140 13% 73% / 0.1)", color: "hsl(140 13% 70%)", border: "1px solid hsl(140 13% 73% / 0.15)" }}
              >
                {factorEntries.length} signal{factorEntries.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {hasFactors ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {factorEntries.map(([key, value]) =>
                value ? <InsightCard key={key} label={key} value={value as string} /> : null
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center"
                style={{ background: "hsl(150 19% 14% / 0.7)" }}
              >
                <ShieldCheck className="h-6 w-6 text-foreground/25" />
              </div>
              <p className="text-sm text-foreground/40 max-w-xs">
                {isTracking
                  ? "Monitoring your environment — insights will appear as conditions change."
                  : "Start tracking to generate real-time AI safety insights."}
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

// ─── Section Header (shared) ──────────────────────────────────────────────────

export const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="flex items-end justify-between flex-wrap gap-4">
    <div>
      <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">{title}</h2>
    </div>
  </div>
);
