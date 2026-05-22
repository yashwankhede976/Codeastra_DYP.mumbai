import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export const Hero = () => (
  <section className="relative min-h-screen overflow-hidden">
    {/* Ambient blobs */}
    <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-green-accent/20 blur-[120px]" />
    <div className="pointer-events-none absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-soft-highlight/10 blur-[140px]" />

    {/* Nav */}
    <header className="relative z-10 mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
      <Logo />
      <nav className="hidden md:flex items-center gap-8 text-sm text-foreground/70">
        <a href="#features" className="hover:text-foreground transition">Features</a>
        <a href="#tracking" className="hover:text-foreground transition">Tracking</a>
        <a href="#security" className="hover:text-foreground transition">Security</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link to="/login" className="glass rounded-full px-5 py-2 text-sm font-medium hover:bg-surface/50 transition">
          Sign in
        </Link>
        <Link to="/register" className="rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-5 py-2 text-sm font-semibold text-bg-deep transition hover:opacity-95">
          Register
        </Link>
      </div>
    </header>

    {/* Hero content */}
    <div className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
      <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-soft-highlight mb-8 animate-fade-up">
        <Sparkles className="h-3.5 w-3.5" />
        AI-powered personal safety, redefined
      </div>

      <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight animate-fade-up" style={{ animationDelay: '0.1s' }}>
        Walk free.
        <br />
        <span className="text-gradient">Stay protected.</span>
      </h1>

      <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-foreground/60 leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
        SafeHer AI watches over your route in real-time, detecting risk before it happens — quietly, intelligently, always.
      </p>

      <div className="mt-12 flex items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
        <Link to="/register" className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-7 py-3.5 text-bg-deep font-semibold shadow-[0_0_40px_-5px_hsl(var(--soft-highlight)/0.5)] hover:shadow-[0_0_60px_-5px_hsl(var(--soft-highlight)/0.8)] transition-all duration-300">
          Get Protected
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Link>
        <a href="#features" className="glass rounded-full px-7 py-3.5 text-sm font-medium hover:bg-surface/40 transition">
          See how it works
        </a>
      </div>

      {/* Floating preview card */}
      <div className="relative mt-20 mx-auto max-w-3xl animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-transparent to-transparent z-10 pointer-events-none rounded-[2rem]" />
        <div className="glass-strong rounded-[2rem] p-6 md:p-8 animate-float">
          <div className="grid grid-cols-3 gap-4 text-left">
            <StatPill label="Safety Score" value="94" suffix="/100" tone="good" />
            <StatPill label="Risk Level" value="Low" tone="good" />
            <StatPill label="Tracking" value="Live" tone="active" />
          </div>
        </div>
      </div>
    </div>
  </section>
);

const StatPill = ({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: 'good' | 'active' }) => (
  <div className="rounded-2xl bg-bg-deep/40 border border-soft-highlight/10 p-4">
    <div className="text-[11px] uppercase tracking-wider text-foreground/50">{label}</div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className="font-display text-2xl md:text-3xl font-semibold text-neutral-light">{value}</span>
      {suffix && <span className="text-xs text-foreground/40">{suffix}</span>}
      {tone === 'active' && <span className="ml-auto h-2 w-2 rounded-full bg-soft-highlight animate-pulse" />}
    </div>
  </div>
);
