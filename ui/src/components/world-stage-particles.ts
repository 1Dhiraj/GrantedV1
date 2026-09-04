// Ambient weather and light for the world map: fireflies, dust motes and
// sparks. Split out of world-stage.ts to keep that file under the repo's
// per-file line cap; it reads only the theme and the map props, so it is a
// plain function rather than a method.
import { html } from "lit";
import { fract } from "./world-stage-model.ts";
import type { Prop } from "./world-stage-model.ts";

export function renderWorldParticles(phase: string, theme: string, props: readonly Prop[]) {
  const parts: unknown[] = [];
  const mk = (cls: string, count: number, seedBase: number) => {
    for (let i = 0; i < count; i++) {
      const left = 6 + fract(seedBase + i) * 88;
      const top = 10 + fract(seedBase + i + 50) * 75;
      const dur = 6 + fract(seedBase + i + 100) * 9;
      const delay = fract(seedBase + i + 150) * 8;
      parts.push(
        html`<span
          class="ws-particle ${cls}"
          style="left:${left}%;top:${top}%;animation-duration:${dur}s;animation-delay:-${delay}s"
        ></span>`,
      );
    }
  };
  if (theme === "forest") {
    if (phase === "night" || phase === "dusk") {
      mk("ws-particle--firefly", 10, 7);
    } else {
      mk("ws-particle--leaf", 6, 13);
    }
    // Embers rise from the campfire.
    const fire = props.find((p) => p.kind === "campfire");
    if (fire) {
      for (let i = 0; i < 3; i++) {
        const left = fire.x - 1 + fract(29 + i) * 2;
        const top = fire.y - 1 + fract(79 + i) * 2;
        const dur = 1.6 + fract(129 + i) * 1.4;
        const delay = fract(179 + i) * 2;
        parts.push(
          html`<span
            class="ws-particle ws-particle--ember"
            style="left:${left}%;top:${top}%;animation-duration:${dur}s;animation-delay:-${delay}s"
          ></span>`,
        );
      }
    }
  } else if (theme === "office") {
    mk("ws-particle--dust", 7, 17);
  } else {
    mk("ws-particle--spark", 8, 23);
  }
  return parts;
}
