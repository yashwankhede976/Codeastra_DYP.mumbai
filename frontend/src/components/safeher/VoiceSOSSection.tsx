import { useState } from "react";
import { Mic, MicOff, Volume2, ShieldAlert, Info, CheckCircle2 } from "lucide-react";
import { SectionHeader } from "./Dashboard";
import { useVoiceSOS, SOS_KEYWORDS } from "@/hooks/use-voice-sos";
import { useSafeHer } from "./SafeHerProvider";

// ─── Waveform visualizer ──────────────────────────────────────────────────────
function WaveformDisplay({ active, detected }: { active: boolean; detected: boolean }) {
  const heights = [30, 55, 80, 65, 100, 70, 45, 85, 55, 40, 75, 90, 60, 35, 70];
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[4px] rounded-full transition-all duration-200"
          style={{
            height: active ? `${h}%` : "20%",
            background: detected
              ? `hsl(8 80% ${60 + (h / 100) * 20}%)`
              : `hsl(140 13% ${50 + (h / 100) * 30}%)`,
            animation: active ? `voiceWave 0.9s ease-in-out ${i * 0.06}s infinite alternate` : "none",
            opacity: active ? 1 : 0.3,
            boxShadow: active && detected ? "0 0 6px hsl(8 80% 60% / 0.7)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Keyword pill ─────────────────────────────────────────────────────────────
function KeywordPill({
  keyword,
  active,
  matched,
}: {
  keyword: string;
  active: boolean;
  matched: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-5 py-3 transition-all duration-300"
      style={{
        background: matched
          ? "hsl(8 80% 60% / 0.15)"
          : active
          ? "hsl(140 13% 73% / 0.08)"
          : "hsl(150 19% 18% / 0.5)",
        border: `1px solid ${matched ? "hsl(8 80% 60% / 0.4)" : active ? "hsl(140 13% 73% / 0.2)" : "hsl(140 13% 73% / 0.08)"}`,
        boxShadow: matched ? "0 0 20px hsl(8 80% 60% / 0.3)" : "none",
      }}
    >
      {matched ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: "hsl(8 85% 75%)" }} />
      ) : (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{
            background: active ? "hsl(140 13% 73%)" : "hsl(140 13% 40%)",
            animation: active ? "pulse 2s ease-in-out infinite" : "none",
          }}
        />
      )}
      <span
        className="font-semibold uppercase tracking-widest text-sm"
        style={{
          color: matched ? "hsl(8 85% 80%)" : active ? "hsl(140 13% 80%)" : "hsl(140 13% 50%)",
        }}
      >
        "{keyword}"
      </span>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function VoiceSOSSection() {
  const { triggerSOS } = useSafeHer();
  const [matchedKeyword, setMatchedKeyword] = useState<string | null>(null);

  const { state, errorMessage, toggle } = useVoiceSOS({
    onKeywordDetected: async (kw) => {
      setMatchedKeyword(kw);
      await triggerSOS();
      // Reset matched after 4 s
      setTimeout(() => setMatchedKeyword(null), 4000);
    },
  });

  const isListening = state === "listening";
  const isDetected = state === "detected";
  const isError = state === "error";
  const isUnsupported = state === "unsupported";
  const isActive = isListening || isDetected;

  return (
    <section
      id="voice-sos"
      className="relative mx-auto max-w-7xl px-6 py-24"
      aria-label="Voice SOS Detection"
    >
      <SectionHeader eyebrow="Voice Detection" title="Say the word. Stay safe." />

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
        {/* ── Left card: visualizer + controls ── */}
        <div
          className="glass rounded-[2rem] p-8 relative overflow-hidden"
          style={{
            boxShadow: isActive
              ? "0 0 60px hsl(140 13% 73% / 0.12), inset 0 1px 0 hsl(140 13% 73% / 0.08)"
              : undefined,
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -bottom-32 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full blur-3xl transition-all duration-700"
            style={{
              background: isDetected
                ? "hsl(8 80% 60% / 0.2)"
                : isListening
                ? "hsl(140 13% 73% / 0.12)"
                : "transparent",
            }}
          />

          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                style={{
                  background: isDetected
                    ? "hsl(8 80% 60% / 0.15)"
                    : isListening
                    ? "hsl(140 13% 73% / 0.12)"
                    : "hsl(150 19% 18% / 0.5)",
                  borderColor: isDetected
                    ? "hsl(8 80% 60% / 0.4)"
                    : isListening
                    ? "hsl(140 13% 73% / 0.3)"
                    : "hsl(140 13% 73% / 0.1)",
                  color: isDetected ? "hsl(8 85% 80%)" : isListening ? "hsl(140 13% 80%)" : "hsl(140 13% 50%)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: isDetected ? "hsl(8 80% 60%)" : isListening ? "hsl(140 13% 73%)" : "hsl(140 13% 40%)",
                    animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                />
                {isDetected
                  ? "🚨 SOS Activated"
                  : isListening
                  ? "🎙 Listening Active"
                  : isError
                  ? "⚠ Mic Error"
                  : isUnsupported
                  ? "✕ Not Supported"
                  : "Voice SOS Off"}
              </span>
              <span className="text-xs text-foreground/40 flex items-center gap-1">
                <Volume2 className="h-3 w-3" /> Ambient
              </span>
            </div>

            {/* Waveform */}
            <div
              className="rounded-2xl px-6 py-5 mb-6 flex items-center justify-between gap-4"
              style={{ background: "hsl(150 19% 10% / 0.6)" }}
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-foreground/50 mb-1">
                  Audio stream
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: isActive ? "hsl(140 13% 80%)" : "hsl(140 13% 45%)" }}
                >
                  {isDetected
                    ? "Keyword matched!"
                    : isListening
                    ? "Monitoring speech…"
                    : "Microphone inactive"}
                </div>
              </div>
              <WaveformDisplay active={isListening} detected={isDetected} />
            </div>

            {/* Error notice */}
            {(isError || isUnsupported) && (
              <div
                className="rounded-2xl px-4 py-3 mb-5 flex items-start gap-3"
                style={{
                  background: "hsl(38 90% 50% / 0.08)",
                  border: "1px solid hsl(38 90% 50% / 0.2)",
                }}
              >
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-[hsl(38_90%_65%)]" />
                <p className="text-xs leading-relaxed text-[hsl(38_80%_70%)]">
                  {isUnsupported
                    ? "Voice detection requires Chrome, Edge, or Safari on desktop/Android. Please switch browsers."
                    : errorMessage ?? "Microphone access failed. Check browser permissions."}
                </p>
              </div>
            )}

            {/* Toggle button */}
            <button
              id="voice-sos-toggle"
              onClick={toggle}
              disabled={isUnsupported}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: isListening
                  ? "hsl(8 80% 60% / 0.15)"
                  : isUnsupported
                  ? "hsl(150 19% 18% / 0.3)"
                  : "linear-gradient(135deg, hsl(148 14% 38% / 0.4), hsl(150 19% 27% / 0.4))",
                border: `1px solid ${isListening ? "hsl(8 80% 60% / 0.35)" : "hsl(140 13% 73% / 0.2)"}`,
                color: isListening ? "hsl(8 85% 80%)" : "hsl(140 13% 75%)",
                cursor: isUnsupported ? "not-allowed" : "pointer",
                opacity: isUnsupported ? 0.45 : 1,
                boxShadow: isListening ? "0 0 30px hsl(8 80% 60% / 0.2)" : undefined,
              }}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Voice Detection
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  {isUnsupported ? "Not Available in This Browser" : "Start Voice Detection"}
                </>
              )}
            </button>

            <p className="mt-4 text-xs text-center text-foreground/40 leading-relaxed">
              All audio processing happens locally in your browser.{" "}
              <span className="text-foreground/60">No audio is ever sent to a server.</span>
            </p>
          </div>
        </div>

        {/* ── Right card: keywords + how it works ── */}
        <div className="space-y-5">
          {/* Keywords card */}
          <div className="glass rounded-[2rem] p-7">
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="h-4 w-4 text-[hsl(8_80%_65%)]" />
              <span className="text-xs uppercase tracking-[0.2em] text-foreground/60">
                SOS Trigger Keywords
              </span>
            </div>

            <div className="space-y-3">
              {SOS_KEYWORDS.map((kw) => (
                <KeywordPill
                  key={kw}
                  keyword={kw}
                  active={isListening}
                  matched={matchedKeyword === kw}
                />
              ))}
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: "hsl(150 19% 14% / 0.6)" }}>
              <div className="text-xs uppercase tracking-widest text-foreground/50 mb-2">
                How it works
              </div>
              <p className="text-xs leading-relaxed text-foreground/60">
                The Web Speech API continuously transcribes ambient audio. When any trigger phrase is
                detected, SOS is activated instantly — alerting your emergency contacts and sharing your
                live GPS location.
              </p>
            </div>
          </div>

          {/* Tips card */}
          <div className="glass rounded-[2rem] p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-foreground/50 mb-4">
              Tips for best accuracy
            </div>
            <ul className="space-y-3">
              {[
                ["🎙", "Speak clearly", "in a normal conversational tone."],
                ["🔇", "Reduce background noise", "for faster detection."],
                ["🌐", "Use Chrome or Edge", "for best compatibility."],
                ["🔒", "Allow mic access", "when prompted by your browser."],
              ].map(([icon, title, desc]) => (
                <li key={title} className="flex items-start gap-2.5 text-xs">
                  <span className="text-base leading-none mt-0.5">{icon}</span>
                  <span className="text-foreground/70">
                    <strong className="text-foreground/90 font-medium">{title}</strong> {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes voiceWave {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </section>
  );
}
