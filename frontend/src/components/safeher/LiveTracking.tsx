import { Shield, Navigation2, AlertTriangle, LocateFixed, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { SectionHeader } from "./Dashboard";
import { useSafeHer } from "./SafeHerProvider";
import { GoogleTrackingMap } from "./GoogleTrackingMap";

export const LiveTracking = () => {
  const {
    safetyScore,
    status,
    alertTriggered,
    alertMessage,
    emergencyMessage,
    isTracking,
    triggerSOS,
    gpsError,
    gpsPermissionGranted,
    location,
  } = useSafeHer();

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeader eyebrow="Live Tracking" title="A guardian on every step" />

      <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        {/* ── Google Map ── */}
        <div>
          {/* Map header bar */}
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft-highlight/15 text-soft-highlight">
                <LocateFixed className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-light">{location.label}</div>
                <div className="text-xs text-foreground/50">
                  {isTracking ? "Tracking live" : "Tracking paused"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {gpsPermissionGranted ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-soft-highlight" />
                  <span className="text-soft-highlight">GPS Active</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-foreground/40" />
                  <span className="text-foreground/40">Mumbai Fallback</span>
                </>
              )}
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: alertTriggered ? "#ef4444" : "#a4e3be" }}
              />
              <span className={alertTriggered ? "text-red-300" : "text-soft-highlight"}>{status}</span>
            </div>
          </div>

          <GoogleTrackingMap />
        </div>

        {/* ── Side panel ── */}
        <div className="space-y-5">
          {/* GPS status notice */}
          {gpsError && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <div className="font-semibold">📍 GPS Notice</div>
              <div className="mt-1 text-xs leading-relaxed text-yellow-200/70">{gpsError}</div>
            </div>
          )}

          {/* Monitoring card */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-soft-highlight/15 flex items-center justify-center text-soft-highlight">
                <LocateFixed className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-neutral-light">
                  {isTracking ? "Live monitoring active" : "Tracking ready"}
                </div>
                <div className="mt-1 text-sm leading-relaxed text-foreground/60">
                  {alertTriggered ? alertMessage : emergencyMessage}
                </div>
              </div>
            </div>

            <button
              onClick={() => void triggerSOS()}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] px-5 py-3 font-semibold text-neutral-light shadow-[0_0_50px_hsl(8_80%_60%/0.35)] transition hover:shadow-[0_0_70px_hsl(8_80%_60%/0.55)]"
            >
              <ShieldAlert className="h-4 w-4" />
              Trigger SOS
            </button>
          </div>

          {/* Area stats */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 space-y-3">
            <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">Map Features</div>
            <FeatureRow icon="🗺️" label="Map Engine" value="Google Maps" />
            <FeatureRow icon="📍" label="Location" value={gpsPermissionGranted ? "Real GPS" : "Mumbai Fallback"} />
            <FeatureRow icon="🏙️" label="Area Type" value={location.areaType} />
            <FeatureRow icon="🕐" label="Time" value={location.timeOfDay} />
            <FeatureRow icon="🛡️" label="Safety Score" value={`${safetyScore}/100`} />
          </div>

          {/* Map notes */}
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-foreground/65">
            <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80 mb-3">Route notes</div>
            <p>Google Maps powers the live view with real tiles and your actual GPS position.</p>
            <p className="mt-3">Click <strong>🏥 Nearby</strong> on the map to see hospitals and police stations within 1.5 km.</p>
            <p className="mt-3">When risk climbs, the radius circle turns red and a SOS marker is pinned on the map.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

function FeatureRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-foreground/60">
        <span>{icon}</span>
        {label}
      </span>
      <span className="font-medium text-neutral-light capitalize">{value}</span>
    </div>
  );
}

export const SOSButton = ({ size = "md", onClick }: { size?: "md" | "lg"; onClick?: () => void }) => (
  <button onClick={onClick} className={`relative group ${size === "lg" ? "h-32 w-32" : "h-20 w-20"} shrink-0`}>
    <span className="absolute inset-0 rounded-full bg-sos/40 blur-2xl group-hover:bg-sos/60 transition" />
    <span className="absolute inset-0 rounded-full animate-pulse-glow" />
    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] font-display font-bold text-neutral-light shadow-[var(--shadow-sos)] transition-transform active:scale-95">
      <span className={size === "lg" ? "text-2xl" : "text-base"}>SOS</span>
    </span>
  </button>
);
