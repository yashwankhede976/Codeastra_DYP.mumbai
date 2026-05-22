import { useCallback, useEffect, useRef, useState } from "react";

/** Keywords that auto-trigger SOS when spoken */
export const SOS_KEYWORDS = ["help", "save me", "emergency"] as const;
export type SOSKeyword = (typeof SOS_KEYWORDS)[number];

export type VoiceSOSState =
  | "idle"         // mic not active
  | "requesting"   // asking for mic permission
  | "listening"    // actively listening
  | "detected"     // keyword matched, SOS firing
  | "error"        // mic / SR not available
  | "unsupported"; // browser doesn't support SR

interface UseVoiceSOSOptions {
  /** Called once when a keyword is detected */
  onKeywordDetected: (keyword: SOSKeyword) => void | Promise<void>;
  /** Whether voice detection should be active */
  enabled?: boolean;
}

interface UseVoiceSOSReturn {
  state: VoiceSOSState;
  lastKeyword: SOSKeyword | null;
  errorMessage: string | null;
  /** Start listening (requests mic permission if needed) */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Toggle between start / stop */
  toggle: () => void;
}

// Extend the Window type for the WebKit prefixed version
type SpeechRecognitionCtor = typeof window.SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as typeof window & { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
    (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ??
    null
  );
}

export function useVoiceSOS({
  onKeywordDetected,
  enabled = true,
}: UseVoiceSOSOptions): UseVoiceSOSReturn {
  const [state, setState] = useState<VoiceSOSState>(() =>
    getSpeechRecognition() ? "idle" : "unsupported"
  );
  const [lastKeyword, setLastKeyword] = useState<SOSKeyword | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const stateRef = useRef<VoiceSOSState>(state);
  const onKeywordRef = useRef(onKeywordDetected);

  // Keep latest callback ref so closure is always fresh
  useEffect(() => {
    onKeywordRef.current = onKeywordDetected;
  }, [onKeywordDetected]);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setState("unsupported");
      return;
    }

    if (stateRef.current === "listening" || stateRef.current === "detected") return;

    setState("requesting");

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setState("listening");
      setErrorMessage(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Check all alternatives
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();

          for (const keyword of SOS_KEYWORDS) {
            if (transcript.includes(keyword)) {
              setState("detected");
              setLastKeyword(keyword);
              recognition.stop();
              void onKeywordRef.current(keyword);
              return;
            }
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg =
        event.error === "not-allowed"
          ? "Microphone access denied. Please allow mic permissions."
          : event.error === "no-speech"
          ? "No speech detected. Try again."
          : `Voice error: ${event.error}`;

      setErrorMessage(msg);
      setState("error");
    };

    recognition.onend = () => {
      // If we are still supposed to be listening (not stopped manually or detected),
      // restart automatically so we get continuous listening.
      if (stateRef.current === "listening") {
        try {
          recognition.start();
        } catch {
          // recognition may have already been stopped
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setErrorMessage(`Failed to start voice recognition: ${String(err)}`);
      setState("error");
    }
  }, []);

  const toggle = useCallback(() => {
    if (stateRef.current === "listening") {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // Clean up on unmount or when disabled
  useEffect(() => {
    if (!enabled) {
      stop();
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, [enabled, stop]);

  return { state, lastKeyword, errorMessage, start, stop, toggle };
}
