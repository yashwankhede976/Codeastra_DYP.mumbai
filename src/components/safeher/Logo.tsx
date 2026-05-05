import { Shield } from "lucide-react";

export const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative">
      <div className="absolute inset-0 blur-md bg-soft-highlight/40 rounded-full" />
      <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-soft-highlight to-green-accent flex items-center justify-center shadow-lg">
        <Shield className="h-5 w-5 text-bg-deep" strokeWidth={2.5} />
      </div>
    </div>
    <span className="font-display font-bold text-lg tracking-tight">
      SafeHer<span className="text-soft-highlight">.AI</span>
    </span>
  </div>
);
