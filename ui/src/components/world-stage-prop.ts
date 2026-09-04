// Renders one map prop (desk, stump, campfire and friends). A workstation
// carries its owning agent's sprite hue so "whose desk is this" reads at a
// glance. Split out of world-stage.ts for the per-file line cap.
import { html, nothing } from "lit";
import type { GatewayAgentRow } from "../api/types.ts";
import { agentDisplayName, spriteArtFor } from "./world-stage-model.ts";
import type { Prop } from "./world-stage-model.ts";

const PROP_ART: Record<string, unknown> = {
  desk: html`
    <svg viewBox="0 0 24 18" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="8" y="1" width="8" height="6" fill="#20232b" />
      <rect x="9" y="2" width="6" height="4" class="ws-screen" fill="#3a4354" />
      <rect x="11" y="7" width="2" height="1" fill="#20232b" />
      <rect x="2" y="8" width="20" height="4" fill="#a97142" />
      <rect x="2" y="8" width="20" height="1" fill="#c98d59" />
      <rect x="8" y="9" width="8" height="2" fill="#8b5a2b" />
      <rect x="3" y="12" width="2" height="4" fill="#6f4620" />
      <rect x="19" y="12" width="2" height="4" fill="#6f4620" />
    </svg>
  `,
  stump: html`
    <svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="5" y="0" width="6" height="4" fill="#2b2f38" />
      <rect x="6" y="1" width="4" height="2" class="ws-screen" fill="#3a4354" />
      <rect x="2" y="4" width="12" height="5" fill="#c9a06c" />
      <rect x="4" y="5" width="8" height="3" fill="#a97e4b" />
      <rect x="6" y="6" width="4" height="1" fill="#8a6236" />
      <rect x="2" y="9" width="12" height="4" fill="#8a6236" />
      <rect x="3" y="9" width="2" height="4" fill="#6f4a24" />
      <rect x="11" y="9" width="2" height="4" fill="#6f4a24" />
    </svg>
  `,
  coffee: html`
    <svg viewBox="0 0 14 18" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="2" y="1" width="10" height="15" fill="#3b3f4a" />
      <rect x="3" y="2" width="8" height="3" fill="#262a33" />
      <rect x="9" y="3" width="1" height="1" fill="#ff5f5f" />
      <rect x="4" y="6" width="6" height="4" fill="#14161c" />
      <rect x="6" y="8" width="2" height="2" fill="#f2ede4" />
      <rect x="5" y="10" width="4" height="1" fill="#c9a06c" />
      <rect x="2" y="13" width="10" height="3" fill="#2c303a" />
      <rect x="5" y="4" width="1" height="1" class="ws-steam ws-steam--a" fill="#dfe6ee" />
      <rect x="8" y="3" width="1" height="1" class="ws-steam ws-steam--b" fill="#dfe6ee" />
    </svg>
  `,
  watercooler: html`
    <svg viewBox="0 0 10 16" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="2" y="1" width="6" height="4" fill="#9fd0ea" />
      <rect x="3" y="2" width="2" height="2" fill="#cdeaf7" />
      <rect x="1" y="5" width="8" height="8" fill="#dfe6ee" />
      <rect x="2" y="6" width="6" height="2" fill="#b9c4cf" />
      <rect x="2" y="13" width="6" height="2" fill="#8f99a3" />
    </svg>
  `,
  server: html`
    <svg viewBox="0 0 14 20" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="12" height="18" fill="#232733" />
      <rect x="2" y="2" width="10" height="3" fill="#2e3442" />
      <rect x="2" y="6" width="10" height="3" fill="#2e3442" />
      <rect x="2" y="10" width="10" height="3" fill="#2e3442" />
      <rect x="2" y="14" width="10" height="4" fill="#2e3442" />
      <rect x="10" y="3" width="1" height="1" class="ws-led ws-led--1" fill="#54e08a" />
      <rect x="10" y="7" width="1" height="1" class="ws-led ws-led--2" fill="#54e08a" />
      <rect x="10" y="11" width="1" height="1" class="ws-led ws-led--3" fill="#ffbf47" />
      <rect x="10" y="15" width="1" height="1" class="ws-led ws-led--4" fill="#54e08a" />
      <rect x="3" y="3" width="4" height="1" fill="#1a1e28" />
      <rect x="3" y="7" width="4" height="1" fill="#1a1e28" />
      <rect x="3" y="11" width="4" height="1" fill="#1a1e28" />
    </svg>
  `,
  whiteboard: html`
    <svg viewBox="0 0 26 14" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="24" height="12" fill="#b9c4cf" />
      <rect x="2" y="2" width="22" height="10" fill="#f2f5f8" />
      <rect x="4" y="4" width="8" height="1" fill="#5b79d6" />
      <rect x="4" y="6" width="12" height="1" fill="#5b79d6" />
      <rect x="4" y="8" width="6" height="1" fill="#d66b6b" />
      <rect x="17" y="4" width="5" height="4" fill="#7fc98d" />
      <rect x="13" y="9" width="9" height="1" fill="#9aa7b4" />
    </svg>
  `,
  bookshelf: html`
    <svg viewBox="0 0 20 16" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="18" height="15" fill="#6f4a24" />
      <rect x="2" y="1" width="16" height="5" fill="#4a3118" />
      <rect x="2" y="8" width="16" height="5" fill="#4a3118" />
      <rect x="3" y="2" width="2" height="4" fill="#d66b6b" />
      <rect x="5" y="2" width="2" height="4" fill="#5b79d6" />
      <rect x="7" y="3" width="2" height="3" fill="#7fc98d" />
      <rect x="10" y="2" width="2" height="4" fill="#ffbf47" />
      <rect x="13" y="3" width="2" height="3" fill="#b57edc" />
      <rect x="4" y="9" width="2" height="4" fill="#5b79d6" />
      <rect x="7" y="10" width="2" height="3" fill="#d66b6b" />
      <rect x="10" y="9" width="2" height="4" fill="#7fc98d" />
      <rect x="14" y="10" width="2" height="3" fill="#ffbf47" />
    </svg>
  `,
  clock: html`
    <svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="1" y="0" width="6" height="8" fill="#2c303a" />
      <rect x="2" y="1" width="4" height="6" fill="#f2f5f8" />
      <rect x="3" y="3" width="2" height="1" fill="#2c303a" />
      <rect x="4" y="4" width="1" height="2" fill="#d66b6b" />
    </svg>
  `,
  plant: html`
    <svg viewBox="0 0 12 16" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="5" y="4" width="2" height="4" fill="#3f7d46" />
      <rect x="2" y="2" width="3" height="3" fill="#54a05c" />
      <rect x="7" y="1" width="3" height="3" fill="#54a05c" />
      <rect x="4" y="0" width="3" height="3" fill="#6cbb74" />
      <rect x="3" y="5" width="2" height="2" fill="#3f7d46" />
      <rect x="8" y="4" width="2" height="2" fill="#3f7d46" />
      <rect x="3" y="8" width="6" height="2" fill="#c96f3a" />
      <rect x="4" y="10" width="4" height="5" fill="#a34f27" />
    </svg>
  `,
  tree: html`
    <svg viewBox="0 0 20 24" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="8" y="16" width="4" height="7" fill="#6f4a24" />
      <rect x="8" y="16" width="2" height="7" fill="#7d5628" />
      <rect x="4" y="4" width="12" height="4" fill="#3f7d46" />
      <rect x="2" y="7" width="16" height="6" fill="#4c9152" />
      <rect x="4" y="12" width="12" height="4" fill="#3f7d46" />
      <rect x="6" y="2" width="8" height="3" fill="#59a860" />
      <rect x="5" y="8" width="4" height="2" fill="#65b86d" />
      <rect x="11" y="6" width="3" height="2" fill="#65b86d" />
    </svg>
  `,
  rug: html`
    <svg viewBox="0 0 26 14" shape-rendering="crispEdges" aria-hidden="true" opacity="0.85">
      <rect x="0" y="0" width="26" height="14" fill="#8d4f57" />
      <rect x="1" y="1" width="24" height="12" fill="#a35f68" />
      <rect x="3" y="3" width="20" height="8" fill="#8d4f57" />
      <rect x="5" y="5" width="16" height="4" fill="#b8737c" />
    </svg>
  `,
  campfire: html`
    <svg viewBox="0 0 16 14" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="2" y="11" width="12" height="2" fill="#6f4a24" />
      <rect x="4" y="10" width="8" height="1" fill="#8a6236" />
      <rect x="6" y="4" width="4" height="6" class="ws-flame-outer" fill="#ff8c1a" />
      <rect x="7" y="2" width="2" height="3" class="ws-flame-tip" fill="#ff8c1a" />
      <rect x="7" y="6" width="2" height="4" class="ws-flame-inner" fill="#ffd23e" />
    </svg>
  `,
  tent: html`
    <svg viewBox="0 0 20 14" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="8" y="0" width="4" height="2" fill="#8d4f2e" />
      <rect x="6" y="2" width="8" height="3" fill="#c96f3a" />
      <rect x="4" y="5" width="12" height="3" fill="#d97f47" />
      <rect x="2" y="8" width="16" height="5" fill="#c96f3a" />
      <rect x="8" y="8" width="4" height="5" fill="#5a3419" />
      <rect x="9" y="9" width="2" height="4" fill="#2f1a0b" />
    </svg>
  `,
  sign: html`
    <svg viewBox="0 0 14 16" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="6" y="7" width="2" height="8" fill="#6f4a24" />
      <rect x="1" y="1" width="12" height="6" fill="#c9a06c" />
      <rect x="2" y="2" width="10" height="4" fill="#a97e4b" />
      <rect x="3" y="3" width="4" height="1" fill="#5a3c1c" />
      <rect x="3" y="5" width="6" height="1" fill="#5a3c1c" />
    </svg>
  `,
  pond: html`
    <svg viewBox="0 0 40 24" shape-rendering="crispEdges" aria-hidden="true">
      <rect x="4" y="4" width="32" height="16" fill="#3f6f8a" />
      <rect x="6" y="6" width="28" height="12" fill="#5a97b8" />
      <rect x="9" y="8" width="10" height="2" fill="#7fb8d4" />
      <rect x="22" y="12" width="8" height="2" fill="#7fb8d4" />
      <rect x="4" y="4" width="32" height="2" fill="#345d73" />
    </svg>
  `,
};

export function renderWorldProp(
  prop: Prop,
  workingDeskIdxs: ReadonlySet<number>,
  agents: readonly GatewayAgentRow[],
  basePath: string,
) {
  const isWorkstation = prop.kind === "desk" || prop.kind === "stump";
  const active = isWorkstation && prop.deskIdx !== undefined && workingDeskIdxs.has(prop.deskIdx);
  // Each workstation belongs to one agent: its monitor carries the owner's
  // sprite hue, so "whose desk is this" is visible at a glance.
  let hue = 0;
  if (isWorkstation && prop.deskIdx !== undefined) {
    const owner = agents[prop.deskIdx];
    if (owner) {
      hue = spriteArtFor(owner.id || agentDisplayName(owner), basePath).hue;
    }
  }
  return html`
    <div
      class="ws-prop ws-prop--${prop.kind} ${active ? "is-active" : ""}"
      style="left:${prop.x}%;top:${prop.y}%;width:calc(var(--u) * ${prop.w});z-index:${Math.round(
        prop.y * 10,
      )};--hue:${hue}deg"
    >
      ${PROP_ART[prop.kind] ?? nothing}
    </div>
  `;
}
