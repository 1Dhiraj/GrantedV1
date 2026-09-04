// Renders one agent sprite: its position, walk state, speech bubble and
// nametag. Split out of world-stage.ts to keep that file under the repo's
// per-file line cap. Takes the handful of element fields it needs as a
// context object rather than reaching back into the element.
import { html, nothing } from "lit";
import type { GatewayAgentRow } from "../api/types.ts";
import { agentDisplayName, agentModelLabel, spriteArtFor } from "./world-stage-model.ts";
import type { SimAgent } from "./world-stage-model.ts";

export type WorldAgentRenderContext = {
  sim: SimAgent;
  working: boolean;
  basePath: string;
  selectedAgentId: string | null;
  focusedAgentId: string | null;
  liveSnippet: string | null;
  liveSnippetAgentId: string | null;
  /** Suppresses walk animation right after a camera teleport. */
  teleportedAt: number;
  onAgentSelect?: (agentId: string) => void;
};

export function renderWorldAgent(
  agent: GatewayAgentRow,
  now: number,
  ctx: WorldAgentRenderContext,
) {
  const s = ctx.sim;
  const working = ctx.working;
  const selected = agent.id === ctx.selectedAgentId;
  const focused = agent.id === ctx.focusedAgentId;
  const moving = s.moveUntil > now;
  const chatting = now < s.chatUntil;
  const noAnim = now - ctx.teleportedAt < 500;
  const left = moving ? s.tx : s.x;
  const top = moving ? s.ty : s.y;
  const art = spriteArtFor(agent.id || agentDisplayName(agent), ctx.basePath);
  const name = agentDisplayName(agent);
  let bubble: string | null = s.bubble;
  if (working) {
    const snippet = agent.id === ctx.liveSnippetAgentId ? (ctx.liveSnippet ?? "").trim() : "";
    bubble = snippet ? snippet.slice(-64) : "working…";
  }
  const classes = [
    "ws-agent",
    moving ? "is-walking" : "",
    working ? "is-working" : "",
    selected ? "is-selected" : "",
    focused ? "is-focused" : "",
    chatting ? "is-chatting" : "",
    noAnim ? "no-anim" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return html`
    <button
      class=${classes}
      style="left:${left}%;top:${top}%;--movedur:${s.moveDur}s;z-index:${Math.round(top * 10) + 5}"
      title="${name} · ${agentModelLabel(agent)} · ${working
        ? "working"
        : "idle"} — click to give it a task"
      @click=${(e: Event) => {
        e.stopPropagation();
        ctx.onAgentSelect?.(agent.id);
      }}
    >
      ${bubble
        ? html`<span class="ws-bubble ${working ? "ws-bubble--working" : ""}">
            ${working ? html`<span class="ws-bubble-dots"><i></i><i></i><i></i></span>` : nothing}
            <span class="ws-bubble-text">${bubble}</span>
          </span>`
        : nothing}
      <span class="ws-ring"></span>
      <span class="ws-shadow"></span>
      <span
        class="ws-sprite"
        style="background-image:url('${art.url}');--dirx:${s.facing};--hue:${art.hue}deg"
      ></span>
      <span class="ws-nametag">
        <span class="ws-nametag-name">${name}</span>
        ${working ? html`<span class="ws-nametag-dot"></span>` : nothing}
      </span>
    </button>
  `;
}
