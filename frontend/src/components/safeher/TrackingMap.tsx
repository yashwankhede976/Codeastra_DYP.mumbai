import { useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { AlertTriangle, LocateFixed, MapPinned, Radar, Shield, ShieldAlert, Navigation2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { useSafeHer } from "./SafeHerProvider";

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export function TrackingMap() {
  const { location, safetyScore, status, riskScore, alertTriggered, alertMessage, emergencyMessage, isTracking, triggerSOS } = useSafeHer();
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

  const nearbyPins = useMemo(
    () => [
      [location.latitude + 0.0021, location.longitude - 0.0022] as [number, number],
      [location.latitude - 0.0016, location.longitude + 0.0018] as [number, number],
      [location.latitude + 0.0012, location.longitude + 0.0026] as [number, number],
    ],
    [location.latitude, location.longitude],
  );

  const accent = alertTriggered ? "#ef4444" : "#a4e3be";

  return (
    <section id="tracking" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">Live Tracking</div>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-5xl">A real map for every route.</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground/70">
          OpenStreetMap is active while tracking is on.
        </div>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-[0_25px_90px_-40px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft-highlight/15 text-soft-highlight">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-light">{location.label}</div>
                <div className="text-xs text-foreground/50">{isTracking ? "Tracking live" : "Tracking paused"} · risk score {riskScore}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
              <span className={alertTriggered ? "text-red-300" : "text-soft-highlight"}>{status}</span>
            </div>
          </div>

          <div className="relative h-[560px] overflow-hidden">
            <MapContainer center={center} zoom={16} className="h-full w-full" zoomControl={false}>
              <Recenter center={center} />
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <Circle center={center} radius={alertTriggered ? 550 : 300} pathOptions={{ color: accent, fillColor: accent, fillOpacity: 0.1, weight: 2 }} />
              <Circle center={center} radius={80} pathOptions={{ color: "#ffffff", fillOpacity: 0 }} />
              <Polyline positions={trail} pathOptions={{ color: accent, weight: 4, opacity: 0.85 }} />

              {nearbyPins.map((pin, index) => (
                <Circle
                  key={`${pin[0]}-${pin[1]}-${index}`}
                  center={pin}
                  radius={18 + index * 5}
                  pathOptions={{ color: "#ffffff", fillColor: "#ffffff", fillOpacity: 0.16, weight: 1 }}
                />
              ))}

              <Circle
                center={center}
                radius={24}
                pathOptions={{ color: accent, fillColor: accent, fillOpacity: 0.95, weight: 2 }}
              />
            </MapContainer>

            <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-white/10 bg-bg-deep/75 px-4 py-3 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.25em] text-foreground/45">Current location</div>
              <div className="mt-1 text-sm text-neutral-light">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-3">
              <StatPill icon={<Shield className="h-4 w-4" />} label="Safety score" value={`${safetyScore}/100`} />
              <StatPill icon={<Radar className="h-4 w-4" />} label="Status" value={status} />
              <StatPill icon={<Navigation2 className="h-4 w-4" />} label="Route" value={trail.length > 1 ? `${trail.length} points` : "Starting"} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-soft-highlight/15 text-soft-highlight">
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
          </aside>

          <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">Map notes</div>
            <div className="mt-4 space-y-3 text-sm text-foreground/65">
              <p>This map uses real OpenStreetMap tiles and recent tracking coordinates from the backend risk engine.</p>
              <p>Each location update extends the visible trail so you can see the route path, not just the latest point.</p>
              <p>When risk climbs, the safe radius grows and the SOS button is available immediately.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

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