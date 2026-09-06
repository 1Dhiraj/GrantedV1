/**
 * Wake word: hands-free activation of talk mode.
 *
 * Listens in the background for a user-set phrase ("hey granted") and opens
 * talk mode when it hears it. It runs only while talk mode is off, because talk
 * mode owns the microphone once it starts; releasing it back is what re-arms
 * listening. The fork drove this from module-level singletons reading
 * localStorage directly. Here it takes its host explicitly, so the chat pane
 * owns the state and the controller is testable without a browser.
 */

import { isWakeSttSupported, startWakeStt, stopWakeStt } from "./wake-word-stt.ts";

export const DEFAULT_WAKE_PHRASE = "hey granted";

/** A dead microphone ends a session immediately; restarting forever would spin. */
const MAX_RESTARTS = 4;
const RESTART_WINDOW_MS = 5000;
/**
 * Talk mode reports no "ended" event, so a light poll notices the microphone
 * coming free. Two seconds is below the pause a person leaves before speaking
 * again, and costs nothing while idle.
 */
const REARM_POLL_MS = 2000;

export type WakeWordHost = {
  /** The configured phrase; blank falls back to the default. */
  phrase: () => string;
  enabled: () => boolean;
  /** True while talk mode holds the microphone. */
  talkActive: () => boolean;
  /** Opens talk mode. Rejections are swallowed: a failed start must not kill listening. */
  startTalk: () => void | Promise<void>;
  requestUpdate: () => void;
};

/** Collapses punctuation and casing so "Hey, Granted!" matches "hey granted". */
export function normalizeWakeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type WakeWordController = {
  /** Arms listening when enabled. Safe to call repeatedly, including from render. */
  sync: () => void;
  /** Releases the microphone and stops the re-arm poll. */
  stop: () => void;
  isListening: () => boolean;
  isSupported: () => boolean;
};

export function createWakeWordController(host: WakeWordHost): WakeWordController {
  let listening = false;
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let restartTimestamps: number[] = [];

  const resolvePhrase = (): string => normalizeWakeText(host.phrase() || DEFAULT_WAKE_PHRASE);

  const releaseMicrophone = () => {
    if (!listening) {
      return;
    }
    listening = false;
    stopWakeStt();
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const onWake = () => {
    // Hand the microphone over before starting talk mode: two consumers of one
    // input device is what makes hands-free activation flaky.
    releaseMicrophone();
    void (async () => {
      try {
        await host.startTalk();
      } catch {
        // Talk mode reports its own errors; listening re-arms on the next poll.
      }
    })();
    host.requestUpdate();
  };

  const armIfIdle = () => {
    if (stopped || listening || !host.enabled() || host.talkActive()) {
      return;
    }
    const phrase = resolvePhrase();
    if (!phrase) {
      return;
    }
    listening = startWakeStt({
      onTranscript: (text) => {
        if (!listening || host.talkActive()) {
          return;
        }
        if (normalizeWakeText(text).includes(phrase)) {
          onWake();
        }
      },
      onEnd: () => {
        listening = false;
        // Browsers end a recognition session every minute or so on their own.
        // Restarting is normal; restarting instantly and repeatedly means the
        // microphone is gone, so back off rather than spin.
        const now = Date.now();
        restartTimestamps = restartTimestamps.filter((at) => now - at < RESTART_WINDOW_MS);
        restartTimestamps.push(now);
        if (!stopped && restartTimestamps.length <= MAX_RESTARTS) {
          setTimeout(armIfIdle, 250);
        }
      },
      onError: () => {
        listening = false;
      },
    });
  };

  return {
    sync() {
      if (stopped) {
        return;
      }
      if (!host.enabled() || !isWakeSttSupported()) {
        releaseMicrophone();
        stopPolling();
        return;
      }
      restartTimestamps = [];
      armIfIdle();
      if (!pollTimer) {
        pollTimer = setInterval(armIfIdle, REARM_POLL_MS);
      }
    },
    stop() {
      stopped = true;
      stopPolling();
      releaseMicrophone();
    },
    isListening: () => listening,
    isSupported: () => isWakeSttSupported(),
  };
}
