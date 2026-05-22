import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { useVoiceSOS, SOS_KEYWORDS, type SOSKeyword } from "@/hooks/use-voice-sos";
import { useSafeHer } from "./SafeHerProvider";

// ─── Waveform bars ────────────────────────────────────────────────────────────
function AudioBars({ active }: { active: boolean }) {
  const bars = [0.4, 0.7, 1.0, 0.6, 0.85, 0.5, 0.9, 0.65];
  return (
    <div className="flex items-end gap-[3px] h-5">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-soft-highlight transition-all"
          style={{
            height: active ? `${h * 100}%` : "25%",
            animation: active ? `voiceBar 0.8s ease-in-out ${i * 0.08}s infinite alternate` : "none",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

// ─── Detected overlay ─────────────────────────────────────────────────────────
function KeywordDetectedFlash({ keyword }: { keyword: SOSKeyword | null }) {
  if (!keyword) return null;
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      <div className="animate-fade-up flex flex-col items-center gap-3 rounded-[2rem] px-8 py-7 text-center"
        style={{
          background: "hsl(8 80% 60% / 0.18)",
          border: "1.5px solid hsl(8 80% 60% / 0.5)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 80px hsl(8 80% 60% / 0.5), 0 0 30px hsl(8 80% 60% / 0.3)",
        }}>
        <ShieldAlert className="h-10 w-10 text-[hsl(8_85%_72%)] animate-pulse" />
        <div className="font-display text-2xl font-bold text-[hsl(8_85%_85%)] tracking-tight">
          SOS Activated!
        </div>
        <div className="text-sm text-[hsl(8_60%_80%)]">
          Keyword detected:{" "}
          <span className="font-semibold uppercase tracking-widest">"{keyword}"</span>
        </div>
        <div className="text-xs text-[hsl(8_50%_70%)]">
          Alerting emergency contacts &amp; sharing location…
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VoiceSOSIndicator() {
  const { triggerSOS } = useSafeHer();
  const [expanded, setExpanded] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  const handleKeyword = async (keyword: SOSKeyword) => {
    setShowFlash(true);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setShowFlash(false), 3500);
    await triggerSOS();
  };

  const { state, lastKeyword, errorMessage, start, stop, toggle } = useVoiceSOS({
    onKeywordDetected: handleKeyword,
  });

  // Auto-resume listening after keyword detection
  useEffect(() => {
    if (state === "detected") {
      const t = window.setTimeout(() => start(), 4000);
      return () => window.clearTimeout(t);
    }
  }, [state, start]);

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
  }, []);

  const isListening = state === "listening";
  const isUnsupported = state === "unsupported";
  const isError = state === "error";
  const isDetected = state === "detected";

  const statusColor = isDetected
    ? "hsl(8 80% 60%)"
    : isListening
    ? "hsl(140 13% 73%)"
    : isError
    ? "hsl(38 90% 65%)"
    : "hsl(150 19% 40%)";

  const statusLabel = isDetected
    ? "SOS Triggered!"
    : isListening
    ? "Listening…"
    : isError
    ? "Mic Error"
    : state === "requesting"
    ? "Requesting mic…"
    : isUnsupported
    ? "Not supported"
    : "Voice Off";

  return (
    <>
      {/* Detected flash overlay */}
      {showFlash && <KeywordDetectedFlash keyword={lastKeyword} />}

      {/* Floating pill */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Expanded panel */}
        {expanded && (
          <div
            className="animate-fade-up rounded-[1.75rem] p-5 w-72"
            style={{
              background: "hsl(150 19% 12% / 0.92)",
              border: "1px solid hsl(140 13% 73% / 0.14)",
              backdropFilter: "blur(28px) saturate(150%)",
              boxShadow: "0 20px 60px -10px hsl(156 30% 4% / 0.7)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" style={{ color: statusColor }} />
                <span className="text-sm font-semibold text-[hsl(80_14%_87%)]">
                  Voice SOS Detection
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="h-6 w-6 rounded-full flex items-center justify-center transition"
                style={{ background: "hsl(150 19% 22% / 0.6)" }}
              >
                <X className="h-3 w-3 text-[hsl(140_13%_60%)]" />
              </button>
            </div>

            {/* Status */}
            <div
              className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
              style={{ background: "hsl(150 19% 18% / 0.7)" }}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{
                  background: statusColor,
                  boxShadow: isListening ? `0 0 8px ${statusColor}` : "none",
                  animation: isListening || isDetected ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              />
              <div>
                <div className="text-xs font-semibold" style={{ color: statusColor }}>
                  {statusLabel}
                </div>
                {isListening && (
                  <div className="text-xs text-[hsl(140_13%_55%)] mt-0.5">
                    Monitoring ambient audio…
                  </div>
                )}
              </div>
              {isListening && (
                <div className="ml-auto">
                  <AudioBars active={isListening} />
                </div>
              )}
            </div>

            {/* Error message */}
            {(isError || isUnsupported) && (
              <div
                className="rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2"
                style={{ background: "hsl(38 90% 50% / 0.1)", border: "1px solid hsl(38 90% 50% / 0.2)" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[hsl(38_90%_65%)]" />
                <p className="text-xs text-[hsl(38_80%_70%)] leading-relaxed">
                  {isUnsupported
                    ? "Your browser doesn't support Voice SOS. Use Chrome or Edge."
                    : errorMessage ?? "Microphone error occurred."}
                </p>
              </div>
            )}

            {/* Keywords */}
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[hsl(140_13%_50%)] mb-2">
                Trigger keywords
              </div>
              <div className="flex flex-wrap gap-2">
                {SOS_KEYWORDS.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      background: lastKeyword === kw && isDetected
                        ? "hsl(8 80% 60% / 0.2)"
                        : "hsl(150 19% 22% / 0.7)",
                      border: `1px solid ${lastKeyword === kw && isDetected ? "hsl(8 80% 60% / 0.5)" : "hsl(140 13% 73% / 0.12)"}`,
                      color: lastKeyword === kw && isDetected ? "hsl(8 85% 80%)" : "hsl(140 13% 70%)",
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={toggle}
              disabled={isUnsupported}
              className="w-full rounded-2xl py-2.5 text-sm font-semibold transition-all"
              style={{
                background: isListening
                  ? "hsl(8 80% 60% / 0.15)"
                  : isUnsupported
                  ? "hsl(150 19% 18% / 0.5)"
                  : "linear-gradient(135deg, hsl(140 13% 73% / 0.25), hsl(148 14% 46% / 0.25))",
                border: `1px solid ${isListening ? "hsl(8 80% 60% / 0.3)" : "hsl(140 13% 73% / 0.2)"}`,
                color: isListening ? "hsl(8 85% 80%)" : "hsl(140 13% 73%)",
                cursor: isUnsupported ? "not-allowed" : "pointer",
                opacity: isUnsupported ? 0.5 : 1,
              }}
            >
              {isListening ? "Stop Listening" : "Start Listening"}
            </button>

            <p className="mt-3 text-[10px] leading-relaxed text-center text-[hsl(140_13%_40%)]">
              Speak <strong className="text-[hsl(140_13%_55%)]">"HELP"</strong>,{" "}
              <strong className="text-[hsl(140_13%_55%)]">"SAVE ME"</strong>, or{" "}
              <strong className="text-[hsl(140_13%_55%)]">"EMERGENCY"</strong> to instantly trigger SOS.
            </p>
          </div>
        )}

        {/* Floating FAB */}
        <button
          id="voice-sos-fab"
          onClick={() => setExpanded((e) => !e)}
          title={isListening ? "Voice SOS Active — Click to expand" : "Enable Voice SOS"}
          className="relative h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: isDetected
              ? "linear-gradient(135deg, hsl(8 80% 55%), hsl(8 70% 40%))"
              : isListening
              ? "linear-gradient(135deg, hsl(148 14% 35%), hsl(150 19% 27%))"
              : "hsl(150 19% 18% / 0.9)",
            border: `1.5px solid ${isDetected ? "hsl(8 80% 60% / 0.6)" : isListening ? "hsl(140 13% 73% / 0.3)" : "hsl(140 13% 73% / 0.15)"}`,
            boxShadow: isDetected
              ? "0 0 40px hsl(8 80% 60% / 0.6), 0 0 20px hsl(8 80% 60% / 0.4)"
              : isListening
              ? "0 0 30px hsl(140 13% 73% / 0.25), 0 8px 25px hsl(156 22% 4% / 0.5)"
              : "0 8px 25px hsl(156 22% 4% / 0.4)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Pulse ring when listening */}
          {isListening && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "hsl(140 13% 73% / 0.2)" }}
            />
          )}
          {isDetected && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "hsl(8 80% 60% / 0.3)" }}
            />
          )}

          {isListening ? (
            <Mic className="h-5 w-5 relative z-10" style={{ color: "hsl(140 13% 80%)" }} />
          ) : isError || isUnsupported ? (
            <MicOff className="h-5 w-5 relative z-10 text-[hsl(38_80%_65%)]" />
          ) : isDetected ? (
            <ShieldAlert className="h-5 w-5 relative z-10 text-white" />
          ) : (
            <Mic className="h-5 w-5 relative z-10 text-[hsl(140_13%_50%)]" />
          )}
        </button>

        {/* Status badge below FAB */}
        <div
          className="text-[10px] font-medium rounded-full px-2 py-0.5 text-center"
          style={{
            background: "hsl(150 19% 12% / 0.85)",
            border: "1px solid hsl(140 13% 73% / 0.1)",
            color: statusColor,
            backdropFilter: "blur(8px)",
          }}
        >
          {isListening ? "🎙 Active" : isDetected ? "🚨 SOS!" : "🎙 Voice Off"}
        </div>
      </div>

      <style>{`
        @keyframes voiceBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
