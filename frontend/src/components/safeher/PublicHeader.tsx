import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Logo } from "./Logo";

export function PublicHeader() {
  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link to="/" className="transition hover:opacity-90">
        <Logo />
      </Link>

      <nav className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
        <a href="#features" className="transition hover:text-foreground">
          Features
        </a>
        <a href="#tracking" className="transition hover:text-foreground">
          Tracking
        </a>
        <a href="#security" className="transition hover:text-foreground">
          Security
        </a>
      </nav>

      <div className="flex items-center gap-2">
        <Link to="/login" className="rounded-full px-4 py-2 text-sm font-medium text-foreground/75 transition hover:text-foreground">
          Sign in
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-soft-highlight to-green-accent px-5 py-2.5 text-sm font-semibold text-bg-deep shadow-[0_0_30px_-8px_hsl(var(--soft-highlight)/0.55)] transition hover:shadow-[0_0_40px_-6px_hsl(var(--soft-highlight)/0.75)]"
        >
          Create account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}