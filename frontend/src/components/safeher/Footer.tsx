import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="relative mx-auto max-w-7xl px-6 py-16">
    <div className="glass rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at center, hsl(var(--soft-highlight) / 0.2), transparent 60%)' }} />
      <div className="relative">
        <h3 className="font-display text-3xl md:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
          Safety isn't a feature. <span className="text-gradient">It's a right.</span>
        </h3>
        <p className="mt-4 text-foreground/60 max-w-md mx-auto text-sm">
          Join thousands of women who walk with confidence, powered by SafeHer AI.
        </p>
        <button className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-7 py-3.5 text-bg-deep font-semibold shadow-[0_0_40px_-5px_hsl(var(--soft-highlight)/0.5)] hover:shadow-[0_0_60px_-5px_hsl(var(--soft-highlight)/0.9)] transition">
          Download SafeHer AI
        </button>
      </div>
    </div>
    <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-foreground/40">
      <Logo />
      <div>© 2026 SafeHer AI · Built with care</div>
      <div className="flex gap-5">
        <a href="#" className="hover:text-foreground transition">Privacy</a>
        <a href="#" className="hover:text-foreground transition">Terms</a>
        <a href="#" className="hover:text-foreground transition">Contact</a>
      </div>
    </div>
  </footer>
);
