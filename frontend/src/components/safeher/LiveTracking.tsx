import { Shield, Navigation2, AlertTriangle, LocateFixed, ShieldAlert } from "lucide-react";
import { Circle, MapContainer, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "./Dashboard";
import { useSafeHer } from "./SafeHerProvider";
import "leaflet/dist/leaflet.css";

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export const LiveTracking = () => {
  const { safetyScore, status, riskScore, alertTriggered, alertMessage, emergencyMessage, location, triggerSOS, isTracking } = useSafeHer();
  const center = useMemo<[number, number]>(() => [location.latitude, location.longitude], [location.latitude, location.longitude]);
  const [trail, setTrail] = useState<[number, number][]>([center]);

  useEffect(() => {
    setTrail((currentTrail) => {
      const lastPoint = currentTrail[currentTrail.length - 1];

      if (lastPoint?.[0] === center[0] && lastPoint?.[1] === center[1]) {
        return currentTrail;
      }

      return [...currentTrail, center].slice(-12);
    });
  }, [center]);

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <SectionHeader eyebrow="Live Tracking" title="A guardian on every step" />

      <div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative h-[560px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_25px_90px_-40px_rgba(0,0,0,0.85)]">
          <MapContainer center={center} zoom={16} className="h-full w-full" zoomControl={false}>
            <Recenter center={center} />
            <ZoomControl position="bottomright" />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Circle center={center} radius={alertTriggered ? 550 : 300} pathOptions={{ color: alertTriggered ? "#ef4444" : "#a4e3be", fillOpacity: 0.12, weight: 2 }} />
            <Polyline positions={trail} pathOptions={{ color: alertTriggered ? "#ef4444" : "#a4e3be", weight: 4, opacity: 0.85 }} />
            <Circle center={center} radius={24} pathOptions={{ color: "#ffffff", fillColor: "#a4e3be", fillOpacity: 0.95, weight: 2 }} />
          </MapContainer>

          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-bg-deep/75 px-4 py-3 backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/45">Current location</div>
            <div className="mt-1 text-sm text-neutral-light">{location.label} · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-3">
            <StatPill icon={<Shield className="h-4 w-4" />} label="Safety score" value={`${safetyScore}/100`} />
            <StatPill icon={<AlertTriangle className="h-4 w-4" />} label="Risk status" value={status} />
            <StatPill icon={<Navigation2 className="h-4 w-4" />} label="Tracking" value={isTracking ? "Live" : "Idle"} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-soft-highlight/15 flex items-center justify-center text-soft-highlight">
                <LocateFixed className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-neutral-light">{isTracking ? "Live monitoring active" : "Tracking ready"}</div>
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

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-foreground/65">
            <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">Route notes</div>
            <p className="mt-4">The map uses live OpenStreetMap tiles and the current backend location to draw a real route trail instead of a static illustration.</p>
            <p className="mt-3">When the backend raises risk, the safe radius tightens, the alert copy updates, and the SOS workflow stays one click away.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-deep/75 p-4 text-left backdrop-blur">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-foreground/45">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-neutral-light">{value}</div>
    </div>
  );
}

export const SOSButton = ({ size = 'md', onClick }: { size?: 'md' | 'lg'; onClick?: () => void }) => (
  <button onClick={onClick} className={`relative group ${size === 'lg' ? 'h-32 w-32' : 'h-20 w-20'} shrink-0`}>
    <span className="absolute inset-0 rounded-full bg-sos/40 blur-2xl group-hover:bg-sos/60 transition" />
    <span className="absolute inset-0 rounded-full animate-pulse-glow" />
    <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] font-display font-bold text-neutral-light shadow-[var(--shadow-sos)] transition-transform active:scale-95">
      <span className={size === 'lg' ? 'text-2xl' : 'text-base'}>SOS</span>
    </span>
  </button>
);
