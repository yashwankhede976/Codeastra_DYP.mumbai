import { MapPin, Activity, Battery, Navigation, Cpu, Locate, WifiOff } from "lucide-react";
import { SafetyScore } from "./SafetyScore";
import { useSafeHer } from "./SafeHerProvider";

export const Dashboard = () => {
  const {
    isTracking,
    status,
    safetyScore,
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
  } = useSafeHer();

  return (
    <section id="dashboard" className="relative mx-auto max-w-7xl px-6 py-24">
    <SectionHeader eyebrow="Dashboard" title="Your safety, at a glance" />

    <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Welcome + score */}
      <div className="glass rounded-[2rem] p-7 lg:col-span-2 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-accent/20 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-xs text-foreground/50 uppercase tracking-widest">Good evening</div>
            <h3 className="font-display text-3xl md:text-4xl font-semibold mt-1">Hello, Aanya</h3>
            <p className="mt-3 text-foreground/60 max-w-sm text-sm">
              {isTracking
                ? "AI monitoring is active across your route home."
                : "Start tracking to begin real-time monitoring across your route home."}
            </p>
            <div className="mt-6 flex gap-2">
              <Chip icon={<Activity className="h-3 w-3" />} label={isTracking ? "Tracking active" : "Tracking idle"} dot={isTracking} />
              <Chip icon={<Battery className="h-3 w-3" />} label={`${Math.max(0, 100 - safetyScore)}% risk`} />
              <Chip icon={<Activity className="h-3 w-3" />} label={status} />
              {confidence && <Chip icon={<Cpu className="h-3 w-3" />} label={`AI Conf: ${(confidence * 100).toFixed(0)}%`} />}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => void startMonitoring()}
                className="rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-5 py-2.5 text-sm font-semibold text-bg-deep shadow-[0_0_40px_-5px_hsl(var(--soft-highlight)/0.4)] transition hover:shadow-[0_0_60px_-5px_hsl(var(--soft-highlight)/0.75)]"
              >
                {isTracking ? "Restart tracking" : "Start tracking"}
              </button>
              <button
                onClick={() => toggleDemoNight(!demoNight)}
                className="rounded-full glass px-4 py-2 text-xs font-medium transition hover:bg-surface/40"
              >
                {demoNight ? "Night mode on" : "Night mode off"}
              </button>
              <button
                onClick={() => toggleDemoIsolated(!demoIsolated)}
                className="rounded-full glass px-4 py-2 text-xs font-medium transition hover:bg-surface/40"
              >
                {demoIsolated ? "Isolated area on" : "Isolated area off"}
              </button>
            </div>
          </div>
          <SafetyScore value={safetyScore} />
        </div>
      </div>

      {/* Location card */}
      <div className="glass rounded-[2rem] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-foreground/50">Location</span>
          {gpsPermissionGranted ? (
            <span className="flex items-center gap-1.5 text-xs text-soft-highlight">
              <Locate className="h-3 w-3" />
              <span className="h-1.5 w-1.5 rounded-full bg-soft-highlight animate-pulse" />
              GPS Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-foreground/40">
              <WifiOff className="h-3 w-3" />
              Mumbai Fallback
            </span>
          )}
        </div>
        <div className="mt-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-surface/60 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-soft-highlight" />
          </div>
          <div>
            <div className="font-medium text-neutral-light">{location.label}</div>
            <div className="text-xs text-foreground/50 mt-0.5">
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </div>
            <div className="text-xs text-foreground/40 mt-0.5 capitalize">
              {location.areaType} area · {location.timeOfDay}
            </div>
          </div>
        </div>
        {gpsError && (
          <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300/80">
            {gpsError}
          </div>
        )}
        <div className="mt-4 h-20 rounded-2xl bg-gradient-to-br from-surface/60 to-bg-deep/80 border border-soft-highlight/10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--soft-highlight)) 0, transparent 40%), radial-gradient(circle at 70% 60%, hsl(var(--green-accent)) 0, transparent 40%)' }} />
          <Navigation className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-soft-highlight" />
        </div>
      </div>

      {/* ML Factors */}
      <div className="glass rounded-[2rem] p-6 lg:col-span-3">
        <div className="text-xs uppercase tracking-widest text-foreground/50">Active AI Insights</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {factors ? (
              Object.entries(factors).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-bg-deep/50 border border-soft-highlight/10 p-4">
                   <div className="text-xs uppercase text-soft-highlight/80 mb-1">{key.replace("_", " ")}</div>
                   <div className="text-sm text-neutral-light">{value}</div>
                </div>
              ))
            ) : (
                <div className="text-sm text-foreground/50 col-span-3">Start tracking to generate real-time AI safety insights.</div>
            )}
        </div>
      </div>

    </div>
    <div className="mt-4 text-xs text-foreground/40">
      {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Waiting for tracking data"}
    </div>
  </section>
  );
};

const Chip = ({ icon, label, dot }: { icon: React.ReactNode; label: string; dot?: boolean }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-deep/50 border border-soft-highlight/10 px-3 py-1.5 text-xs text-foreground/80">
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-soft-highlight animate-pulse" />}
    {icon}
    {label}
  </span>
);

const MetricCard = ({ icon, label, value, sub, trend }: { icon: React.ReactNode; label: string; value: string; sub: string; trend?: boolean }) => (
  <div className="glass rounded-[2rem] p-6">
    <div className="flex items-center justify-between">
      <div className="h-10 w-10 rounded-2xl bg-surface/60 flex items-center justify-center text-soft-highlight">{icon}</div>
      {trend && <span className="text-xs text-soft-highlight">↓ trending</span>}
    </div>
    <div className="mt-5 font-display text-3xl font-semibold text-neutral-light">{value}</div>
    <div className="text-xs text-foreground/50 mt-1">{label}</div>
    <div className="text-xs text-foreground/40 mt-3">{sub}</div>
  </div>
);

export const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="flex items-end justify-between flex-wrap gap-4">
    <div>
      <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">{eyebrow}</div>
      <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight max-w-2xl">{title}</h2>
    </div>
  </div>
);
