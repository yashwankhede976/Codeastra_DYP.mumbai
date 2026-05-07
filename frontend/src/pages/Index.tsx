import { ArrowRight, ShieldCheck, MapPinned, BellRing } from "lucide-react";
import { Link } from "react-router-dom";
import { Hero } from "@/components/safeher/Hero";
import { Footer } from "@/components/safeher/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Account first security"
            description="Create a verified SafeHer account before tracking starts, so routes and alerts stay tied to one profile."
          />
          <FeatureCard
            icon={<MapPinned className="h-5 w-5" />}
            title="Real map tracking"
            description="A live OpenStreetMap view plots the current route, location trail, and risk radius from backend data."
          />
          <FeatureCard
            icon={<BellRing className="h-5 w-5" />}
            title="Fast emergency response"
            description="If the risk engine spikes, the SOS path is one click away and emergency messaging updates immediately."
          />
        </div>
      </section>

      <section id="security" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-soft-highlight/80">What is live in the app</div>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight md:text-5xl">
                A focused safety platform instead of a static brochure site.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/65 md:text-base">
                The frontend now has separate landing, login, register, and dashboard routes. Once signed in, you get the tracking dashboard with a live map, risk score, and SOS control.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-6 py-3 font-semibold text-bg-deep transition hover:opacity-95"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-6 py-3 font-medium text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass rounded-[2rem] p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-highlight/15 text-soft-highlight">{icon}</div>
      <h3 className="mt-5 font-display text-2xl font-semibold text-neutral-light">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-foreground/60">{description}</p>
    </div>
  );
}

export default Index;
