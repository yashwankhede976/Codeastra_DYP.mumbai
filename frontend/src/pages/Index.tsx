import { Hero } from "@/components/safeher/Hero";
import { Dashboard } from "@/components/safeher/Dashboard";
import { LiveTracking } from "@/components/safeher/LiveTracking";
import { AlertAndSOS } from "@/components/safeher/AlertAndSOS";
import { Footer } from "@/components/safeher/Footer";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <Dashboard />
      <LiveTracking />
      <AlertAndSOS />
      <Footer />
    </main>
  );
};

export default Index;
