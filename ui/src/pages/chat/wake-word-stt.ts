/**
 * Browser-native speech recognition, used only for wake-word listening.
 *
 * Talk mode streams microphone audio to a realtime provider, which is metered.
 * Background listening runs for hours without a word being said, so it cannot
 * use that path: it would bill an entire idle day to hear "hey granted". The
 * browser's own SpeechRecognition is free and needs no gateway connection, so
 * the wake word listens locally and only then hands the microphone to talk mode.
 */

type WakeSttEvent = Event & {
  results: SpeechRecognitionResultList;
  resultIndex: number;
};

type WakeSttErrorEvent = Event & {
  error: string;
  message?: string;
};

interface WakeSttInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

type WakeSttCtor = new () => WakeSttInstance;

function resolveWakeSttCtor(): WakeSttCtor | null {
  const scope = globalThis as Record<string, unknown>;
  return (scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null) as WakeSttCtor | null;
}

/** True when this browser exposes SpeechRecognition at all. */
export function isWakeSttSupported(): boolean {
  return resolveWakeSttCtor() !== null;
}

export type WakeSttCallbacks = {
  /** Called for interim and final phrases alike; the wake word matches on both. */
  onTranscript: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
};

let activeRecognition: WakeSttInstance | null = null;

/**
 * Starts listening. Returns false when the browser cannot, so the caller can
 * report an unsupported browser rather than waiting for a wake that never comes.
 */
export function startWakeStt(callbacks: WakeSttCallbacks): boolean {
  const Ctor = resolveWakeSttCtor();
  if (!Ctor) {
    callbacks.onError?.("Speech recognition is not supported in this browser");
    return false;
  }

  stopWakeStt();

  let recognition: WakeSttInstance;
  try {
    recognition = new Ctor();
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : String(error));
    return false;
  }

  recognition.continuous = true;
  // Interim results matter here: waiting for the browser to finalize a phrase
  // adds a pause between the wake word and talk mode opening.
  recognition.interimResults = true;
  recognition.lang = globalThis.navigator?.language || "en-US";

  recognition.addEventListener("result", (event) => {
    const speechEvent = event as unknown as WakeSttEvent;
    let transcript = "";
    for (let index = speechEvent.resultIndex; index < speechEvent.results.length; index += 1) {
      const alternative = speechEvent.results[index]?.[0];
      if (alternative) {
        transcript += alternative.transcript;
      }
    }
    if (transcript) {
      callbacks.onTranscript(transcript);
    }
  });

  recognition.addEventListener("error", (event) => {
    const speechEvent = event as unknown as WakeSttErrorEvent;
    // Silence between wake words is the normal state, and stopping deliberately
    // raises "aborted"; neither is a fault worth surfacing.
    if (speechEvent.error === "aborted" || speechEvent.error === "no-speech") {
      return;
    }
    callbacks.onError?.(speechEvent.error);
  });

  recognition.addEventListener("end", () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
    }
    callbacks.onEnd?.();
  });

  activeRecognition = recognition;
  try {
    recognition.start();
  } catch (error) {
    activeRecognition = null;
    callbacks.onError?.(error instanceof Error ? error.message : String(error));
    return false;
  }
  return true;
}

export function stopWakeStt(): void {
  const recognition = activeRecognition;
  if (!recognition) {
    return;
  }
  activeRecognition = null;
  try {
    recognition.stop();
  } catch {
    // Already stopped by the browser; nothing left to release.
  }
}

/** True while the background microphone is armed. */
export function isWakeSttActive(): boolean {
  return activeRecognition !== null;
}
