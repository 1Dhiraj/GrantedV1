// Expressive synthesis turns assistant text into SSML. The escaping order is
// the load-bearing part: reply text is attacker-influenced, so it must be
// escaped before any tag is inserted.
import { describe, expect, it } from "vitest";
import { buildExpressiveSsml, humanizeToSsml } from "./tts.js";

describe("humanizeToSsml", () => {
  it("turns emphasis markers into spoken stress", () => {
    expect(humanizeToSsml("that is **really** important")).toBe(
      'that is <emphasis level="strong">really</emphasis> important',
    );
    expect(humanizeToSsml("a *little* odd")).toBe(
      'a <emphasis level="moderate">little</emphasis> odd',
    );
  });

  it("turns ellipses, em-dashes and paragraph gaps into pauses", () => {
    expect(humanizeToSsml("wait... ok")).toContain('<break time="350ms"/>');
    expect(humanizeToSsml("one — two")).toContain('<break time="250ms"/>');
    expect(humanizeToSsml("first\n\nsecond")).toContain('<break time="500ms"/>');
  });

  it("does not read markdown out loud", () => {
    expect(humanizeToSsml("# Heading")).toBe("Heading");
    expect(humanizeToSsml("- bullet")).toBe("bullet");
    expect(humanizeToSsml("1. numbered")).toBe("numbered");
    expect(humanizeToSsml("see [the docs](https://example.com)")).toBe("see the docs");
    expect(humanizeToSsml("use `npm test` now")).toBe("use npm test now");
  });

  it("summarizes code blocks instead of spelling them out", () => {
    expect(humanizeToSsml("before\n```js\nconst x = 1;\n```\nafter")).toContain("(code omitted)");
    expect(humanizeToSsml("before\n```js\nconst x = 1;\n```\nafter")).not.toContain("const x");
  });

  it("escapes reply text so it cannot inject SSML", () => {
    // The whole point of escaping before tagging: a reply that contains markup
    // is spoken as text, never executed as SSML.
    const hostile = humanizeToSsml('</voice><audio src="http://evil/x.mp3"/>');
    expect(hostile).not.toContain("<audio");
    expect(hostile).not.toContain("</voice>");
    expect(hostile).toContain("&lt;");
  });

  it("still emphasizes text that also contains escapable characters", () => {
    // Escaping runs first, so the marker survives and the payload stays inert.
    expect(humanizeToSsml("**a < b**")).toBe('<emphasis level="strong">a &lt; b</emphasis>');
  });
});

describe("buildExpressiveSsml", () => {
  const base = { innerSsml: "hello", voice: "en-US-AriaNeural", lang: "en-US" };

  it("wraps content in the speak/voice envelope", () => {
    const ssml = buildExpressiveSsml(base);
    expect(ssml).toContain('xml:lang="en-US"');
    expect(ssml).toContain('<voice name="en-US-AriaNeural">hello</voice>');
  });

  it("omits prosody entirely when nothing is set", () => {
    expect(buildExpressiveSsml(base)).not.toContain("<prosody");
  });

  it("adds only the prosody attributes that were given", () => {
    const ssml = buildExpressiveSsml({ ...base, rate: "+10%" });
    expect(ssml).toContain('<prosody rate="+10%">');
    expect(ssml).not.toContain("pitch=");
  });

  it("adds a speaking style with its intensity", () => {
    const ssml = buildExpressiveSsml({ ...base, style: "chat", styleDegree: "1.5" });
    expect(ssml).toContain('<mstts:express-as style="chat" styledegree="1.5">');
  });

  it("escapes attribute values so config cannot break out of the envelope", () => {
    const ssml = buildExpressiveSsml({ ...base, style: 'chat"><audio src="x' });
    expect(ssml).not.toContain('<audio src="x');
    expect(ssml).toContain("&quot;");
  });
});
