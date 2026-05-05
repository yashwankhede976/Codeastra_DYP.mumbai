import { MapPin, Activity, Users, Battery, Navigation, TrendingUp } from "lucide-react";
import { SafetyScore } from "./SafetyScore";

export const Dashboard = () => (
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
              You're in a safe zone. AI monitoring is active across your route home.
            </p>
            <div className="mt-6 flex gap-2">
              <Chip icon={<Activity className="h-3 w-3" />} label="Tracking active" dot />
              <Chip icon={<Battery className="h-3 w-3" />} label="84%" />
            </div>
          </div>
          <SafetyScore value={94} />
        </div>
      </div>

      {/* Location card */}
      <div className="glass rounded-[2rem] p-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-foreground/50">Location</span>
          <span className="flex items-center gap-1.5 text-xs text-soft-highlight">
            <span className="h-1.5 w-1.5 rounded-full bg-soft-highlight animate-pulse" />
            Live
          </span>
        </div>
        <div className="mt-4 flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-surface/60 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-soft-highlight" />
          </div>
          <div>
            <div className="font-medium text-neutral-light">Connaught Place</div>
            <div className="text-xs text-foreground/50 mt-0.5">New Delhi · Safe zone</div>
          </div>
        </div>
        <div className="mt-5 h-24 rounded-2xl bg-gradient-to-br from-surface/60 to-bg-deep/80 border border-soft-highlight/10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--soft-highlight)) 0, transparent 40%), radial-gradient(circle at 70% 60%, hsl(var(--green-accent)) 0, transparent 40%)' }} />
          <Navigation className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-soft-highlight" />
        </div>
      </div>

      {/* Trusted contacts */}
      <MetricCard
        icon={<Users className="h-5 w-5" />}
        label="Trusted Contacts"
        value="4"
        sub="Notified instantly on alert"
      />
      {/* Risk trend */}
      <MetricCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Weekly Risk"
        value="-12%"
        sub="Lower than last week"
        trend
      />
      {/* Tracking duration */}
      <div className="glass rounded-[2rem] p-6">
        <div className="text-xs uppercase tracking-widest text-foreground/50">Active session</div>
        <div className="mt-3 font-display text-3xl font-semibold">42 min</div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-bg-deep/60 overflow-hidden">
          <div className="h-full w-2/3 bg-gradient-to-r from-green-accent to-soft-highlight rounded-full" />
        </div>
        <div className="mt-2 text-xs text-foreground/50">Route to Home · 2.1 km left</div>
      </div>
    </div>
  </section>
);

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
