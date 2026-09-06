// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isWakeSttSupported, startWakeStt, stopWakeStt } from "./wake-word-stt.ts";
import { createWakeWordController, DEFAULT_WAKE_PHRASE, normalizeWakeText } from "./wake-word.ts";

class MockSpeechRecognition extends EventTarget {
  static instances: MockSpeechRecognition[] = [];
  static failOnStart = false;

  continuous = false;
  interimResults = false;
  lang = "";
  started = false;
  stopped = false;

  constructor() {
    super();
    MockSpeechRecognition.instances.push(this);
  }

  start(): void {
    if (MockSpeechRecognition.failOnStart) {
      throw new Error("microphone unavailable");
    }
    this.started = true;
  }

  stop(): void {
    this.stopped = true;
  }

  abort(): void {
    this.stopped = true;
  }

  /** Mimics the browser delivering a phrase, interim or final alike. */
  say(transcript: string): void {
    const event = new Event("result") as Event & {
      results: unknown;
      resultIndex: number;
    };
    event.resultIndex = 0;
    event.results = { 0: { 0: { transcript } }, length: 1 };
    this.dispatchEvent(event);
  }

  endSession(): void {
    this.dispatchEvent(new Event("end"));
  }

  fail(error: string): void {
    const event = new Event("error") as Event & { error: string };
    event.error = error;
    this.dispatchEvent(event);
  }

  static latest(): MockSpeechRecognition {
    const instance = MockSpeechRecognition.instances.at(-1);
    if (!instance) {
      throw new Error("no recognition was started");
    }
    return instance;
  }
}

function installSpeechRecognition(): void {
  (globalThis as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition;
}

function removeSpeechRecognition(): void {
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
}

type HostOverrides = {
  enabled?: boolean;
  phrase?: string;
  talkActive?: boolean;
};

function makeHost(overrides: HostOverrides = {}) {
  const state = {
    enabled: overrides.enabled ?? true,
    phrase: overrides.phrase ?? DEFAULT_WAKE_PHRASE,
    talkActive: overrides.talkActive ?? false,
  };
  const startTalk = vi.fn(() => {
    state.talkActive = true;
  });
  const requestUpdate = vi.fn();
  return {
    state,
    startTalk,
    requestUpdate,
    host: {
      phrase: () => state.phrase,
      enabled: () => state.enabled,
      talkActive: () => state.talkActive,
      startTalk,
      requestUpdate,
    },
  };
}

beforeEach(() => {
  MockSpeechRecognition.instances = [];
  MockSpeechRecognition.failOnStart = false;
  installSpeechRecognition();
});

afterEach(() => {
  stopWakeStt();
  removeSpeechRecognition();
  vi.useRealTimers();
});

describe("normalizeWakeText", () => {
  it("ignores casing and punctuation so a spoken phrase still matches", () => {
    expect(normalizeWakeText("Hey, Granted!")).toBe("hey granted");
    expect(normalizeWakeText("  HEY   granted  ")).toBe("hey granted");
  });

  it("keeps letters and digits from non-latin scripts", () => {
    expect(normalizeWakeText("привет, Granted 42")).toBe("привет granted 42");
  });
});

describe("wake-word speech recognition", () => {
  it("reports support from the browser global", () => {
    expect(isWakeSttSupported()).toBe(true);
    removeSpeechRecognition();
    expect(isWakeSttSupported()).toBe(false);
  });

  it("reports failure instead of throwing when the microphone cannot start", () => {
    MockSpeechRecognition.failOnStart = true;
    const onError = vi.fn();
    expect(startWakeStt({ onTranscript: vi.fn(), onError })).toBe(false);
    expect(onError).toHaveBeenCalled();
  });
});

describe("createWakeWordController", () => {
  it("does not arm the microphone while the wake word is off", () => {
    const { host } = makeHost({ enabled: false });
    const controller = createWakeWordController(host);

    controller.sync();

    expect(MockSpeechRecognition.instances).toHaveLength(0);
    expect(controller.isListening()).toBe(false);
  });

  it("opens talk mode when it hears the phrase", () => {
    const { host, startTalk } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();

    expect(controller.isListening()).toBe(true);
    MockSpeechRecognition.latest().say("hey granted, what is on my calendar");

    expect(startTalk).toHaveBeenCalledTimes(1);
    // The microphone is handed to talk mode rather than held by both.
    expect(controller.isListening()).toBe(false);
    expect(MockSpeechRecognition.latest().stopped).toBe(true);
    controller.stop();
  });

  it("ignores speech that does not contain the phrase", () => {
    const { host, startTalk } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();

    MockSpeechRecognition.latest().say("what is the weather today");

    expect(startTalk).not.toHaveBeenCalled();
    expect(controller.isListening()).toBe(true);
    controller.stop();
  });

  it("honours a custom phrase", () => {
    const { host, startTalk } = makeHost({ phrase: "computer" });
    const controller = createWakeWordController(host);
    controller.sync();

    MockSpeechRecognition.latest().say("Computer, open the door");

    expect(startTalk).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it("stays quiet while talk mode already owns the microphone", () => {
    const { host } = makeHost({ talkActive: true });
    const controller = createWakeWordController(host);

    controller.sync();

    expect(MockSpeechRecognition.instances).toHaveLength(0);
    controller.stop();
  });

  it("re-arms after the browser ends a recognition session on its own", () => {
    vi.useFakeTimers();
    const { host } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();
    expect(MockSpeechRecognition.instances).toHaveLength(1);

    MockSpeechRecognition.latest().endSession();
    vi.advanceTimersByTime(300);

    expect(MockSpeechRecognition.instances).toHaveLength(2);
    expect(controller.isListening()).toBe(true);
    controller.stop();
  });

  it("stops restarting instantly when sessions keep dying on a broken microphone", () => {
    vi.useFakeTimers();
    const { host } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();

    // Six deaths in 1.5s, which stays inside the restart window and short of the
    // re-arm poll, so this measures the burst guard on its own.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      MockSpeechRecognition.latest().endSession();
      vi.advanceTimersByTime(250);
    }

    // One initial session plus four restarts, then the guard stops the spin.
    expect(MockSpeechRecognition.instances).toHaveLength(5);
    expect(controller.isListening()).toBe(false);
    controller.stop();
  });

  it("still recovers on the slow poll after the burst guard trips", () => {
    vi.useFakeTimers();
    const { host } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      MockSpeechRecognition.latest().endSession();
      vi.advanceTimersByTime(250);
    }
    expect(controller.isListening()).toBe(false);

    // A microphone that comes back must not stay ignored for the rest of the
    // session, so the poll retries at its own unhurried pace.
    vi.advanceTimersByTime(2000);

    expect(controller.isListening()).toBe(true);
    controller.stop();
  });

  it("re-arms once talk mode releases the microphone", () => {
    vi.useFakeTimers();
    const context = makeHost();
    const controller = createWakeWordController(context.host);
    controller.sync();

    MockSpeechRecognition.latest().say("hey granted");
    expect(controller.isListening()).toBe(false);

    // Talk mode finishes and hands the microphone back.
    context.state.talkActive = false;
    vi.advanceTimersByTime(2000);

    expect(controller.isListening()).toBe(true);
    controller.stop();
  });

  it("releases the microphone when the wake word is switched off", () => {
    const context = makeHost();
    const controller = createWakeWordController(context.host);
    controller.sync();
    expect(controller.isListening()).toBe(true);

    context.state.enabled = false;
    controller.sync();

    expect(controller.isListening()).toBe(false);
    expect(MockSpeechRecognition.latest().stopped).toBe(true);
  });

  it("stays off in a browser without speech recognition", () => {
    removeSpeechRecognition();
    const { host } = makeHost();
    const controller = createWakeWordController(host);

    controller.sync();

    expect(controller.isSupported()).toBe(false);
    expect(controller.isListening()).toBe(false);
  });

  it("does not re-arm after stop()", () => {
    vi.useFakeTimers();
    const { host } = makeHost();
    const controller = createWakeWordController(host);
    controller.sync();

    controller.stop();
    vi.advanceTimersByTime(5000);

    expect(controller.isListening()).toBe(false);
  });

  it("keeps listening when starting talk mode rejects", async () => {
    const context = makeHost();
    context.startTalk.mockImplementation(() => Promise.reject(new Error("no provider")));
    const controller = createWakeWordController(context.host);
    controller.sync();

    MockSpeechRecognition.latest().say("hey granted");
    await Promise.resolve();
    await Promise.resolve();

    expect(context.startTalk).toHaveBeenCalledTimes(1);
    controller.stop();
  });
});
