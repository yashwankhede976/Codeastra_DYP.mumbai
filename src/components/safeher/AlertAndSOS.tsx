import { AlertTriangle, Phone, MessageCircle, MapPin, Check } from "lucide-react";
import { SectionHeader, } from "./Dashboard";
import { SOSButton } from "./LiveTracking";

export const AlertAndSOS = () => (
  <section id="features" className="relative mx-auto max-w-7xl px-6 py-24">
    <SectionHeader eyebrow="AI + Action" title="Detects threats. Acts in seconds." />

    <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Animated alert card */}
      <div className="glass rounded-[2rem] p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sos/10 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-sos/15 border border-sos/30 px-3 py-1 text-xs font-medium text-[hsl(8_85%_75%)]">
              <span className="h-1.5 w-1.5 rounded-full bg-sos animate-pulse" />
              Risk Detected
            </span>
            <span className="text-xs text-foreground/50">2s ago</span>
          </div>

          <div className="mt-6 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-sos/20 flex items-center justify-center shrink-0 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-[hsl(8_85%_75%)]" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold">Unusual route deviation</h3>
              <p className="mt-2 text-sm text-foreground/60">
                You've moved 400m off your usual path into a low-visibility zone. AI confidence: 87%.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-bg-deep/50 border border-soft-highlight/10 p-4">
            <div className="text-xs uppercase tracking-widest text-soft-highlight/80 mb-2">Suggested action</div>
            <div className="text-sm text-neutral-light">Return to main road via Park Street, 60m back.</div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-2xl glass hover:bg-surface/40 px-4 py-3 text-sm font-medium transition flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> I'm safe
            </button>
            <button className="rounded-2xl bg-gradient-to-br from-sos to-[hsl(8_70%_45%)] px-4 py-3 text-sm font-semibold text-neutral-light shadow-[0_0_30px_-5px_hsl(var(--sos)/0.6)] hover:shadow-[0_0_40px_-5px_hsl(var(--sos)/0.9)] transition">
              Trigger SOS
            </button>
          </div>
        </div>
      </div>

      {/* SOS interaction */}
      <div className="glass rounded-[2rem] p-7 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-sos/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-sos animate-pulse" />
            One-tap emergency
          </span>
          <h3 className="mt-4 font-display text-2xl font-semibold">Hold to send SOS</h3>
          <p className="mt-2 text-sm text-foreground/60 max-w-xs mx-auto">
            Instantly alerts contacts, shares live location, and connects emergency services.
          </p>

          <div className="my-10 flex justify-center">
            <SOSButton size="lg" />
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            <SOSAction icon={<Phone className="h-4 w-4" />} label="Call" />
            <SOSAction icon={<MessageCircle className="h-4 w-4" />} label="Text" />
            <SOSAction icon={<MapPin className="h-4 w-4" />} label="Share" />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 text-xs text-soft-highlight">
            <span className="h-1.5 w-1.5 rounded-full bg-soft-highlight animate-pulse" />
            Ready · 4 contacts standing by
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SOSAction = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="rounded-2xl glass hover:bg-surface/40 px-3 py-3 text-xs font-medium flex flex-col items-center gap-1.5 transition">
    <span className="text-soft-highlight">{icon}</span>
    {label}
  </button>
);
