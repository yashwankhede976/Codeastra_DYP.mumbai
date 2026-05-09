import { useEffect, Component, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, AlertTriangle } from "lucide-react";
import { Dashboard as SafetyDashboard } from "@/components/safeher/Dashboard";
import { LiveTracking } from "@/components/safeher/LiveTracking";
import { AlertAndSOS } from "@/components/safeher/AlertAndSOS";
import { Footer } from "@/components/safeher/Footer";
import { Logo } from "@/components/safeher/Logo";
import { useAuth } from "@/components/safeher/AuthProvider";

// ── Error Boundary prevents blank screen on component crashes ─────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div className="text-xl font-semibold text-red-300">Something crashed</div>
          <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-4 text-left font-mono text-xs text-foreground/60">
            {err.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-full border border-white/10 px-5 py-2 text-sm transition hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate, ready]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-soft-highlight border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-bg-deep/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="transition hover:opacity-90">
            <Logo />
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs uppercase tracking-[0.25em] text-foreground/45">Signed in as</div>
              <div className="text-sm font-medium text-neutral-light">{user?.username}</div>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-foreground/75 transition hover:bg-white/5 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Landing
            </Link>

            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-foreground/80 transition hover:bg-white/10 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <ErrorBoundary>
        <SafetyDashboard />
      </ErrorBoundary>
      <ErrorBoundary>
        <LiveTracking />
      </ErrorBoundary>
      <ErrorBoundary>
        <AlertAndSOS />
      </ErrorBoundary>
      <Footer />
    </main>
  );
}
