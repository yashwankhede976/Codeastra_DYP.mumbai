export const SafetyScore = ({ value = 94 }: { value?: number }) => {
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;

  return (
    <div className="relative h-44 w-44">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--soft-highlight))" />
            <stop offset="100%" stopColor="hsl(var(--green-accent))" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={radius} stroke="hsl(var(--surface))" strokeWidth="10" fill="none" opacity="0.4" />
        <circle
          cx="80" cy="80" r={radius}
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: 'drop-shadow(0 0 8px hsl(var(--soft-highlight) / 0.4))', transition: 'stroke-dashoffset 1s var(--ease-smooth)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase tracking-widest text-foreground/50">Safety</div>
        <div className="font-display text-5xl font-bold text-neutral-light">{value}</div>
        <div className="text-xs text-soft-highlight">Excellent</div>
      </div>
    </div>
  );
};
