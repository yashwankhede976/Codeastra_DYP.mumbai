import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Dashboard as SafetyDashboard } from "@/components/safeher/Dashboard";
import { LiveTracking } from "@/components/safeher/LiveTracking";
import { AlertAndSOS } from "@/components/safeher/AlertAndSOS";
import { Footer } from "@/components/safeher/Footer";
import { Logo } from "@/components/safeher/Logo";
import { useAuth } from "@/components/safeher/AuthProvider";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, ready, logout } = useAuth();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate, ready]);

  if (!ready || !isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
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

      <SafetyDashboard />
      <LiveTracking />
      <AlertAndSOS />
      <Footer />
    </main>
  );
}