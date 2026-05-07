import { Shield, Navigation2, AlertTriangle } from "lucide-react";
import { SectionHeader } from "./Dashboard";
import { useSafeHer } from "./SafeHerProvider";

export const LiveTracking = () => {
  const {
    safetyScore,
    status,
    riskScore,
    alertTriggered,
    alertMessage,
    emergencyMessage,
    location,
    triggerSOS,
    isTracking,
  } = useSafeHer();

  const pinPosition = {
    left: `${Math.min(86, Math.max(14, 50 + (location.longitude - 77.209) * 1200))}%`,
    top: `${Math.min(82, Math.max(18, 50 - (location.latitude - 28.6139) * 1200))}%`,
  };

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
    <SectionHeader eyebrow="Live Tracking" title="A guardian on every step" />

    <div className="mt-12 relative h-[560px] rounded-[2rem] overflow-hidden glass">
      {/* Map background */}
      <div className="absolute inset-0 bg-bg-deep">
        <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(var(--surface))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Roads */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 560" preserveAspectRatio="none">
          <path d="M0 280 Q 200 200 400 290 T 800 260" stroke="hsl(var(--surface))" strokeWidth="22" fill="none" opacity="0.5" />
          <path d="M0 280 Q 200 200 400 290 T 800 260" stroke="hsl(var(--soft-highlight))" strokeWidth="2" strokeDasharray="6 8" fill="none" />
          <path d="M400 0 L 380 560" stroke="hsl(var(--surface))" strokeWidth="14" fill="none" opacity="0.4" />
          <path d="M120 60 Q 250 300 600 500" stroke="hsl(var(--surface))" strokeWidth="14" fill="none" opacity="0.4" />
        </svg>
        {/* Glow zones */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-green-accent/20 blur-3xl" />
        <div className="absolute bottom-10 right-20 h-40 w-40 rounded-full bg-sos/15 blur-3xl" />
      </div>

      {/* User pin */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pinPosition}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-soft-highlight animate-pulse-ring" />
          <div className="absolute inset-0 rounded-full bg-soft-highlight animate-pulse-ring" style={{ animationDelay: '1s' }} />
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-soft-highlight to-green-accent flex items-center justify-center shadow-[0_0_30px_hsl(var(--soft-highlight)/0.6)]">
            <Navigation2 className="h-5 w-5 text-bg-deep" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Floating safety badge */}
      <div className="absolute top-6 left-6 glass-strong rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-soft-highlight to-green-accent flex items-center justify-center">
          <Shield className="h-5 w-5 text-bg-deep" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-foreground/50">Safety Score</div>
          <div className="font-display text-2xl font-bold leading-none mt-0.5">94<span className="text-sm text-foreground/40">/100</span></div>
        </div>
      </div>

      {/* Risk indicator */}
      <div className="absolute top-6 right-6 glass-strong rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-soft-highlight animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-foreground/60">Risk:</span>
          <span className="text-sm font-semibold text-soft-highlight">{status}</span>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-6 left-6 right-6 glass-strong rounded-3xl p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs text-foreground/50">Heading to</div>
          <div className="font-medium text-neutral-light mt-0.5">{location.label} · {isTracking ? "Live monitoring" : "Tracking idle"}</div>
        </div>

        <SOSButton onClick={() => void triggerSOS()} />

        <div className="text-right">
          <div className="text-xs text-foreground/50">Watching over you</div>
          <div className="font-medium text-neutral-light mt-0.5">{alertTriggered ? "Alert sent" : "4 trusted contacts"}</div>
        </div>
      </div>

      {/* AI hint */}
      <div className="absolute bottom-32 right-6 max-w-xs glass-strong rounded-2xl p-4 hidden md:block">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-xl bg-soft-highlight/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-soft-highlight" />
          </div>
          <div>
            <div className="text-xs font-semibold text-neutral-light">AI Suggestion</div>
            <div className="text-xs text-foreground/60 mt-1">{alertTriggered ? alertMessage : emergencyMessage}</div>
          </div>
        </div>
      </div>

      <div className="absolute top-24 left-6 glass-strong rounded-2xl px-4 py-3 hidden md:block">
        <div className="text-[10px] uppercase tracking-widest text-foreground/50">Safety score</div>
        <div className="mt-1 font-display text-3xl font-bold text-neutral-light">{safetyScore}</div>
        <div className="text-xs text-foreground/50">Risk {riskScore}</div>
      </div>
    </div>
  </section>
  );
};

export const SOSButton = ({ size = 'md', onClick }: { size?: 'md' | 'lg'; onClick?: () => void }) => (
  <button onClick={onClick} className={`relative group ${size === 'lg' ? 'h-32 w-32' : 'h-20 w-20'} shrink-0`}>
    <span className="absolute inset-0 rounded-full bg-sos/40 blur-2xl group-hover:bg-sos/60 transition" />
    <span className="absolute inset-0 rounded-full animate-pulse-glow" />
    <span className="relative h-full w-full rounded-full bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] flex items-center justify-center font-display font-bold text-neutral-light shadow-[var(--shadow-sos)] active:scale-95 transition-transform">
      <span className={size === 'lg' ? 'text-2xl' : 'text-base'}>SOS</span>
    </span>
  </button>
);
