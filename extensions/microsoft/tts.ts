// Microsoft plugin module implements tts behavior.
import { statSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { writeExternalFileWithinRoot } from "openclaw/plugin-sdk/security-runtime";
import { normalizeLowercaseStringOrEmpty } from "openclaw/plugin-sdk/string-coerce-runtime";

type EdgeTTSClient = Pick<import("node-edge-tts").EdgeTTS, "ttsPromise">;

export function inferEdgeExtension(outputFormat: string): string {
  const normalized = normalizeLowercaseStringOrEmpty(outputFormat);
  if (normalized.includes("webm")) {
    return ".webm";
  }
  if (normalized.includes("ogg")) {
    return ".ogg";
  }
  if (normalized.includes("opus")) {
    return ".opus";
  }
  if (normalized.includes("wav") || normalized.includes("riff") || normalized.includes("pcm")) {
    return ".wav";
  }
  return ".mp3";
}

export async function edgeTTS(
  params: {
    text: string;
    outputPath: string;
    config: {
      voice: string;
      lang: string;
      outputFormat: string;
      saveSubtitles: boolean;
      proxy?: string;
      rate?: string;
      pitch?: string;
      volume?: string;
      timeoutMs?: number;
    };
    timeoutMs: number;
  },
  ttsOverride?: EdgeTTSClient,
): Promise<void> {
  const { text, outputPath, config, timeoutMs } = params;
  if (text.trim().length === 0) {
    throw new Error("Microsoft TTS text cannot be empty");
  }

  const tts =
    ttsOverride ??
    new (await import("node-edge-tts")).EdgeTTS({
      voice: config.voice,
      lang: config.lang,
      outputFormat: config.outputFormat,
      saveSubtitles: config.saveSubtitles,
      proxy: config.proxy,
      rate: config.rate,
      pitch: config.pitch,
      volume: config.volume,
      timeout: config.timeoutMs ?? timeoutMs,
    });

  await mkdir(path.dirname(outputPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let outputSize = 0;
    await writeExternalFileWithinRoot({
      rootDir: path.dirname(outputPath),
      path: path.basename(outputPath),
      write: async (tempPath) => {
        writeFileSync(tempPath, "");
        await tts.ttsPromise(text, tempPath);
        outputSize = statSync(tempPath).size;
      },
    });
    if (outputSize > 0) {
      return;
    }
  }
  throw new Error("Edge TTS produced empty audio file after retry");
}

// ── Expressive (human-like) synthesis ──────────────────────────────────
// The Edge service accepts full SSML — emphasis, breaks, and mstts:express-as
// speaking styles — on the same free endpoint, but node-edge-tts hardcodes a
// plain wrapper and XML-escapes the text, so none of it is reachable through
// its API. This is our own sender over the same protocol with caller-supplied
// SSML.

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&"']/gu, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return character;
    }
  });
}

/**
 * Turn assistant text into expressive SSML content: markdown the voice should
 * not read out loud is stripped, emphasis markers become spoken stress, and
 * ellipses, em-dashes and paragraph gaps become natural pauses.
 *
 * The text is XML-escaped BEFORE any tags are inserted, so a reply containing
 * markup cannot inject SSML — the escape pass turns it into literal text, and
 * only the markers this function recognises afterwards become real tags.
 */
export function humanizeToSsml(text: string): string {
  let spoken = text;
  // Markdown the voice should not read literally.
  spoken = spoken.replace(/```[\s\S]*?```/gu, " (code omitted) ");
  spoken = spoken.replace(/`([^`\n]+)`/gu, "$1");
  spoken = spoken.replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1");
  spoken = spoken.replace(/^#{1,6}\s+/gmu, "");
  spoken = spoken.replace(/^\s*[-*+]\s+/gmu, "");
  spoken = spoken.replace(/^\s*\d+\.\s+/gmu, "");
  // Escape first, then convert the surviving plain markers into SSML tags.
  spoken = escapeXml(spoken);
  spoken = spoken.replace(/\*\*([^*\n]+)\*\*/gu, '<emphasis level="strong">$1</emphasis>');
  spoken = spoken.replace(/\*([^*\n]+)\*/gu, '<emphasis level="moderate">$1</emphasis>');
  spoken = spoken.replace(/(\.\.\.|…)/gu, '<break time="350ms"/>');
  spoken = spoken.replace(/\s—\s/gu, '<break time="250ms"/> ');
  spoken = spoken.replace(/\n{2,}/gu, '<break time="500ms"/> ');
  spoken = spoken.replace(/\n/gu, " ");
  return spoken.trim();
}

/** Wrap prepared SSML content in the speak/voice envelope Edge expects. */
export function buildExpressiveSsml(params: {
  innerSsml: string;
  voice: string;
  lang: string;
  rate?: string;
  pitch?: string;
  volume?: string;
  /** Speaking style; needs a style-capable voice such as en-US-AriaNeural. */
  style?: string;
  /** Style intensity, 0.01 to 2. */
  styleDegree?: string;
}): string {
  let body = params.innerSsml;
  const prosodyAttrs = [
    params.rate ? ` rate="${escapeXml(params.rate)}"` : "",
    params.pitch ? ` pitch="${escapeXml(params.pitch)}"` : "",
    params.volume ? ` volume="${escapeXml(params.volume)}"` : "",
  ].join("");
  if (prosodyAttrs) {
    body = `<prosody${prosodyAttrs}>${body}</prosody>`;
  }
  if (params.style) {
    const degree = params.styleDegree ? ` styledegree="${escapeXml(params.styleDegree)}"` : "";
    body = `<mstts:express-as style="${escapeXml(params.style)}"${degree}>${body}</mstts:express-as>`;
  }
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${escapeXml(params.lang)}">` +
    `<voice name="${escapeXml(params.voice)}">${body}</voice></speak>`
  );
}

/**
 * Send prepared SSML over the Edge readaloud socket and write the audio to
 * outputPath. Follows the same write discipline as edgeTTS: the bytes land in
 * a temp file inside the destination root and are moved into place only once
 * the turn completes, so a dropped connection cannot leave a half-written clip
 * where a caller expects finished audio.
 */
export async function edgeTTSSSML(params: {
  ssml: string;
  outputPath: string;
  outputFormat: string;
  timeoutMs: number;
}): Promise<void> {
  // Deep import: node-edge-tts exposes the DRM token helpers only from its
  // dist internals, and the free endpoint rejects requests without them.
  // Loaded lazily so plain (non-expressive) synthesis never pays for it.
  const { CHROMIUM_FULL_VERSION, generateSecMsGecToken, TRUSTED_CLIENT_TOKEN } =
    await import("node-edge-tts/dist/drm.js");
  const { WebSocket } = await import("ws");
  const { createWriteStream } = await import("node:fs");
  const { randomBytes } = await import("node:crypto");

  await mkdir(path.dirname(params.outputPath), { recursive: true });
  let outputSize = 0;
  await writeExternalFileWithinRoot({
    rootDir: path.dirname(params.outputPath),
    path: path.basename(params.outputPath),
    write: async (tempPath) => {
      const socket = new WebSocket(
        `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
          `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
          `&Sec-MS-GEC=${generateSecMsGecToken()}` +
          `&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`,
      );
      try {
        await new Promise<void>((resolve, reject) => {
          socket.on("open", () => {
            socket.send(
              `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
                JSON.stringify({
                  context: {
                    synthesis: {
                      audio: {
                        metadataoptions: {
                          sentenceBoundaryEnabled: "false",
                          wordBoundaryEnabled: "false",
                        },
                        outputFormat: params.outputFormat,
                      },
                    },
                  },
                }),
            );
            resolve();
          });
          socket.on("error", reject);
        });
        await new Promise<void>((resolve, reject) => {
          const audioStream = createWriteStream(tempPath);
          const timeout = setTimeout(() => {
            socket.close();
            reject(new Error("Edge TTS (expressive) timed out"));
          }, params.timeoutMs);
          socket.on("message", (data: Buffer, isBinary: boolean) => {
            if (isBinary) {
              const separator = "Path:audio\r\n";
              const index = data.indexOf(separator) + separator.length;
              audioStream.write(data.subarray(index));
              return;
            }
            if (data.toString().includes("Path:turn.end")) {
              audioStream.end();
              audioStream.on("finish", () => {
                clearTimeout(timeout);
                resolve();
              });
            }
          });
          socket.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
          socket.send(
            `X-RequestId:${randomBytes(16).toString("hex")}\r\n` +
              `Content-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
              params.ssml,
          );
        });
      } finally {
        socket.close();
      }
      outputSize = statSync(tempPath).size;
    },
  });
  if (outputSize === 0) {
    throw new Error("Edge TTS (expressive) produced empty audio file");
  }
}
