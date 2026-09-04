import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import type { GatewayAgentRow } from "../api/types.ts";
import { renderWorldAgent } from "./world-stage-agent.ts";
import {
  BUBBLES_BY_PLACE,
  BUBBLES_NIGHT,
  CHAT_OPENERS,
  CHAT_REPLIES,
  FACE_DOWN,
  FACE_LEFT,
  FACE_RIGHT,
  FACE_UP,
  WALK_SPEED,
  WORLD_THEMES,
  agentDisplayName,
  agentModelLabel,
  buildWorld,
  dayPhase,
  isWalkable,
  pick,
  spriteArtFor,
} from "./world-stage-model.ts";
import type { Point, SimAgent, WorldModel } from "./world-stage-model.ts";
import { renderWorldParticles } from "./world-stage-particles.ts";
import { renderWorldProp } from "./world-stage-prop.ts";

// Re-exported so existing imports of these helpers keep working from the
// element module they have always come from.
export { WORLD_THEMES, agentDisplayName, agentModelLabel, spriteArtFor };

export class WorldStage extends LitElement {
  override createRenderRoot() {
    return this; // light DOM so global world.css applies
  }

  @property({ attribute: false }) agents: GatewayAgentRow[] = [];
  @property() theme = "office";
  @property() basePath = "";
  @property({ attribute: false }) workingAgentIds: string[] = [];
  @property({ attribute: false }) selectedAgentId: string | null = null;
  @property({ attribute: false }) liveSnippet: string | null = null;
  /** Agent whose live output feeds its bubble (the chat-session agent). */
  @property({ attribute: false }) liveSnippetAgentId: string | null = null;
  @property({ attribute: false }) onAgentSelect?: (agentId: string) => void;
  @property({ attribute: false }) onThemeChange?: (theme: string) => void;
  @property({ attribute: false }) onStageClick?: () => void;

  @state() private availW = 0;
  @state() private availH = 0;
  @state() private searchQuery = "";
  @state() private focusedAgentId: string | null = null;

  /** While true the camera keeps tracking the focused agent as it walks. */
  private followCamera = false;
  private sim = new Map<string, SimAgent>();
  private tickTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private teleportedAt = 0;
  private model: WorldModel = buildWorld("office", 1);
  private modelKey = "";
  private aspect = 1.6;
  private centeredForKey = "";

  override connectedCallback() {
    super.connectedCallback();
    this.tickTimer = window.setInterval(() => this.tick(), 600);
    this.resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) {
        return;
      }
      this.availW = Math.max(0, Math.floor(rect.width - 4));
      this.availH = Math.max(0, Math.floor(rect.height - 4));
    });
    this.resizeObserver.observe(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.tickTimer !== null) {
      window.clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Rebuild the world model if the theme or agent count changed. */
  private syncModel() {
    const key = `${this.theme}:${this.agents.length}`;
    if (key !== this.modelKey) {
      const previous = this.modelKey;
      this.model = buildWorld(this.theme, this.agents.length);
      this.modelKey = key;
      this.aspect = this.model.vw / this.model.vh;
      // On a theme change, reseat everyone instantly (new floor plan).
      const themeChanged = previous.split(":")[0] !== this.theme;
      if (previous && themeChanged) {
        for (const s of this.sim.values()) {
          const p = this.randomWalkPoint();
          s.x = p.x;
          s.y = p.y;
          s.tx = p.x;
          s.ty = p.y;
          s.moveUntil = 0;
          s.pauseUntil = Date.now() + 1000 + Math.random() * 3000;
        }
        this.teleportedAt = Date.now();
      }
    }
  }

  private workingSet(): Set<string> {
    return new Set(this.workingAgentIds);
  }

  private dist(ax: number, ay: number, bx: number, by: number): number {
    const dx = (ax - bx) * this.aspect;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private randomWalkPoint(): Point {
    const model = this.model;
    for (let attempt = 0; attempt < 24; attempt++) {
      const rect = model.walk[Math.floor(Math.random() * model.walk.length)];
      if (!rect) {
        continue;
      }
      const x = rect.x + Math.random() * rect.w;
      const y = rect.y + Math.random() * rect.h;
      if (isWalkable(model, x, y)) {
        return { x, y };
      }
    }
    const rect = model.walk[0];
    // No walkable region at all: park at the origin rather than throw. The
    // sprite is repositioned on the next relayout.
    return rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : { x: 0, y: 0 };
  }

  private ensureSim(agentId: string): SimAgent {
    let s = this.sim.get(agentId);
    if (!s) {
      const p = this.randomWalkPoint();
      s = {
        x: p.x,
        y: p.y,
        tx: p.x,
        ty: p.y,
        moveUntil: 0,
        moveDur: 0,
        pauseUntil: Date.now() + 500 + Math.random() * 3000,
        facing: FACE_DOWN,
        bubble: null,
        bubbleUntil: 0,
        chatUntil: 0,
        chatCooldownUntil: 0,
        deskIdx: 0,
        targetKind: null,
      };
      this.sim.set(agentId, s);
    }
    return s;
  }

  private startMove(s: SimAgent, x: number, y: number, now: number) {
    const dist = this.dist(s.x, s.y, x, y);
    if (dist < 1) {
      s.pauseUntil = now + 1500;
      return;
    }
    const dur = Math.min(9, Math.max(0.7, dist / WALK_SPEED));
    const dx = (x - s.x) * this.aspect;
    const dy = y - s.y;
    s.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? FACE_RIGHT
          : FACE_LEFT
        : dy > 0
          ? FACE_DOWN
          : FACE_UP;
    s.tx = x;
    s.ty = y;
    s.moveDur = dur;
    s.moveUntil = now + dur * 1000;
  }

  private tick() {
    this.syncModel();
    const now = Date.now();
    const model = this.model;
    const liveIds = new Set(this.agents.map((a) => a.id));
    for (const id of this.sim.keys()) {
      if (!liveIds.has(id)) {
        this.sim.delete(id);
      }
    }
    if (this.focusedAgentId && !liveIds.has(this.focusedAgentId)) {
      this.focusedAgentId = null;
      this.followCamera = false;
    }
    if (this.followCamera && this.focusedAgentId) {
      this.focusCamera(this.focusedAgentId, true);
    }

    const workingSet = this.workingSet();
    this.agents.forEach((agent, index) => {
      const s = this.ensureSim(agent.id);
      s.deskIdx = Math.min(index, model.desks.length - 1);
      const working = workingSet.has(agent.id);

      // Arrival bookkeeping.
      if (s.moveUntil !== 0 && now >= s.moveUntil) {
        s.x = s.tx;
        s.y = s.ty;
        s.moveUntil = 0;
        s.pauseUntil = now + 2500 + Math.random() * 6000;
        s.facing = working ? FACE_UP : FACE_DOWN;
        if (!working && Math.random() < 0.4) {
          // Say something that matches where the agent just arrived and
          // the time of day — bubbles describe behavior, not random noise.
          const night = dayPhase(new Date(now)) === "night";
          const pool =
            night && Math.random() < 0.4
              ? BUBBLES_NIGHT
              : (BUBBLES_BY_PLACE[s.targetKind ?? "floor"] ?? BUBBLES_BY_PLACE.floor);
          s.bubble = pick(pool ?? [], "…");
          s.bubbleUntil = now + 4500;
        }
      }
      if (s.bubbleUntil !== 0 && now >= s.bubbleUntil) {
        s.bubble = null;
        s.bubbleUntil = 0;
      }

      if (working) {
        s.chatUntil = 0;
        const desk = model.desks[s.deskIdx];
        // Desks are laid out from the agent count, so this only misses if the
        // roster shrank mid-tick; the sprite simply stays put until relayout.
        const atDesk = !desk || (s.moveUntil === 0 && this.dist(s.x, s.y, desk.x, desk.y) < 2);
        if (desk && !atDesk && s.moveUntil === 0) {
          this.startMove(s, desk.x, desk.y, now);
        }
        if (atDesk) {
          s.facing = FACE_UP;
          s.bubble = null;
          s.bubbleUntil = 0;
        }
        return;
      }

      if (now < s.chatUntil) {
        return; // mid-conversation, hold still
      }

      if (s.moveUntil === 0 && now >= s.pauseUntil) {
        if (Math.random() < 0.45 && model.pois.length > 0) {
          const poi = pick(model.pois, { x: 0, y: 0, kind: "floor" });
          const jx = poi.x + (Math.random() - 0.5) * 6;
          const jy = poi.y + (Math.random() - 0.5) * 4;
          const target = isWalkable(model, jx, jy) ? { x: jx, y: jy } : poi;
          s.targetKind = poi.kind;
          this.startMove(s, target.x, target.y, now);
        } else {
          const target = this.randomWalkPoint();
          s.targetKind = "floor";
          this.startMove(s, target.x, target.y, now);
        }
      }
    });

    // Chance encounters: two idle agents standing near each other chat.
    const idle = this.agents
      .map((a) => ({ id: a.id, s: this.sim.get(a.id) }))
      .filter(
        (entry): entry is { id: string; s: SimAgent } =>
          Boolean(entry.s) &&
          !workingSet.has(entry.id) &&
          entry.s!.moveUntil === 0 &&
          now >= entry.s!.chatUntil &&
          now >= entry.s!.chatCooldownUntil,
      );
    for (let a = 0; a < idle.length; a++) {
      for (let b = a + 1; b < idle.length; b++) {
        const sa = idle[a]?.s;
        const sb = idle[b]?.s;
        if (sa && sb && this.dist(sa.x, sa.y, sb.x, sb.y) < 11 && Math.random() < 0.5) {
          const until = now + 5000;
          sa.chatUntil = until;
          sb.chatUntil = until;
          sa.chatCooldownUntil = now + 70000 + Math.random() * 60000;
          sb.chatCooldownUntil = sa.chatCooldownUntil;
          sa.facing = sb.x >= sa.x ? FACE_RIGHT : FACE_LEFT;
          sb.facing = sa.x >= sb.x ? FACE_RIGHT : FACE_LEFT;
          sa.bubble = pick(CHAT_OPENERS, "…");
          sb.bubble = pick(CHAT_REPLIES, "…");
          sa.bubbleUntil = until;
          sb.bubbleUntil = until + 400;
        }
      }
    }

    this.requestUpdate();
  }

  // ── Rendering ────────────────────────────────────────────────────────

  override updated() {
    // Center the scroll once per new map size when it overflows the viewport.
    const zoom = this.zoom();
    const mapW = this.model.vw * zoom;
    const mapH = this.model.vh * zoom;
    const key = `${this.modelKey}:${Math.round(mapW)}x${Math.round(mapH)}`;
    if (key === this.centeredForKey) {
      return;
    }
    const vp = this.querySelector<HTMLElement>(".ws-scroll");
    if (!vp) {
      return;
    }
    if (this.followCamera && this.focusedAgentId) {
      // Zoom just changed for a search close-up: jump straight to the agent.
      this.focusCamera(this.focusedAgentId, false);
    } else if (mapW > vp.clientWidth || mapH > vp.clientHeight) {
      vp.scrollLeft = (mapW - vp.clientWidth) / 2;
      vp.scrollTop = (mapH - vp.clientHeight) / 2;
    }
    this.centeredForKey = key;
  }

  /** Fit-to-viewport zoom, clamped so the world stays readable but can grow. */
  private zoom(): number {
    if (this.availW < 40 || this.availH < 40) {
      return 1;
    }
    const fit = Math.min(this.availW / this.model.vw, this.availH / this.model.vh);
    const base = Math.min(1.35, Math.max(0.5, fit));
    // While a searched agent is focused, zoom in for a close-up (the camera
    // pans to keep it centered); clearing the search zooms back out to fit.
    if (this.focusedAgentId) {
      return Math.max(base, 1.35);
    }
    return base;
  }

  // ── Agent search + camera ────────────────────────────────────────────

  private searchMatches(): GatewayAgentRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return this.agents.filter((agent) => {
      const name = agentDisplayName(agent).toLowerCase();
      const id = (agent.id || "").toLowerCase();
      const model = agentModelLabel(agent).toLowerCase();
      return name.includes(q) || id.includes(q) || model.includes(q);
    });
  }

  /** Pan the viewport so the agent lands center-screen (clamped to edges). */
  private focusCamera(agentId: string, smooth: boolean) {
    const s = this.sim.get(agentId);
    const vp = this.querySelector<HTMLElement>(".ws-scroll");
    if (!s || !vp) {
      return;
    }
    const zoom = this.zoom();
    const mapW = this.model.vw * zoom;
    const mapH = this.model.vh * zoom;
    // Aim where the agent is headed, so the camera leads the walk.
    const moving = s.moveUntil > Date.now();
    const ax = ((moving ? s.tx : s.x) / 100) * mapW;
    const ay = ((moving ? s.ty : s.y) / 100) * mapH;
    const left = Math.max(0, Math.min(mapW - vp.clientWidth, ax - vp.clientWidth / 2));
    const top = Math.max(0, Math.min(mapH - vp.clientHeight, ay - vp.clientHeight / 2));
    // Skip micro-adjustments so smooth scrolls don't stutter every tick.
    if (Math.abs(vp.scrollLeft - left) < 24 && Math.abs(vp.scrollTop - top) < 24) {
      return;
    }
    vp.scrollTo({ left, top, behavior: smooth ? "smooth" : "auto" });
  }

  private focusAgent(agentId: string) {
    this.focusedAgentId = agentId;
    this.followCamera = true;
    this.focusCamera(agentId, true);
  }

  private clearSearch() {
    this.searchQuery = "";
    this.focusedAgentId = null;
    this.followCamera = false;
  }

  private renderSearch() {
    const matches = this.searchMatches();
    const open = this.searchQuery.trim().length > 0;
    return html`
      <div class="ws-search" @click=${(e: Event) => e.stopPropagation()}>
        <input
          class="ws-search-input"
          type="search"
          placeholder="Find an agent…"
          aria-label="Find an agent in the world"
          .value=${this.searchQuery}
          @input=${(e: Event) => {
            this.searchQuery = (e.target as HTMLInputElement).value;
            if (!this.searchQuery.trim()) {
              this.clearSearch();
            }
          }}
          @keydown=${(e: KeyboardEvent) => {
            const firstMatch = matches[0];
            if (e.key === "Enter" && firstMatch) {
              e.preventDefault();
              this.focusAgent(firstMatch.id);
            } else if (e.key === "Escape") {
              this.clearSearch();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        ${this.searchQuery
          ? html`<button
              class="ws-search-clear"
              title="Clear search"
              aria-label="Clear search"
              @click=${() => this.clearSearch()}
            >
              ×
            </button>`
          : nothing}
        ${open
          ? html`
              <div class="ws-search-results">
                ${matches.length === 0
                  ? html`<div class="ws-search-empty">No agent matches.</div>`
                  : matches.slice(0, 6).map((agent) => {
                      const art = spriteArtFor(agent.id || agentDisplayName(agent), this.basePath);
                      const working = this.workingSet().has(agent.id);
                      return html`
                        <button
                          class="ws-search-item ${agent.id === this.focusedAgentId
                            ? "is-focused"
                            : ""}"
                          @click=${() => this.focusAgent(agent.id)}
                        >
                          <span
                            class="ws-search-face"
                            style="background-image:url('${art.url}');--hue:${art.hue}deg"
                          ></span>
                          <span class="ws-search-name">${agentDisplayName(agent)}</span>
                          <span class="ws-search-state ${working ? "on" : ""}"
                            >${working ? "working" : "idle"}</span
                          >
                        </button>
                      `;
                    })}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    this.syncModel();
    const model = this.model;
    const now = Date.now();
    const date = new Date(now);
    const phase = dayPhase(date);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const workingSet = this.workingSet();
    const workingAgents = this.agents.filter((a) => workingSet.has(a.id));
    const workingCount = workingAgents.length;
    const workingDeskIdxs = new Set<number>();
    for (const agent of workingAgents) {
      const sim = this.sim.get(agent.id);
      if (sim) {
        workingDeskIdxs.add(sim.deskIdx);
      }
    }
    if (this.availW < 40) {
      return html`<div class="ws-viewport"></div>`;
    }
    const zoom = this.zoom();
    const mapW = Math.round(model.vw * zoom);
    const mapH = Math.round(model.vh * zoom);
    const phaseIcon = phase === "night" ? "🌙" : phase === "day" ? "☀️" : "🌤";
    return html`
      <div
        class="ws-viewport"
        @click=${(e: Event) => {
          const el = e.target as HTMLElement;
          if (!el.closest(".ws-agent") && !el.closest(".ws-themes") && !el.closest(".ws-hud")) {
            this.onStageClick?.();
          }
        }}
      >
        <div
          class="ws-scroll"
          @wheel=${() => {
            this.followCamera = false;
          }}
          @pointerdown=${() => {
            this.followCamera = false;
          }}
        >
          <div
            class="ws-map ws-map--${this.theme} ws-phase--${phase}"
            style="width:${mapW}px;height:${mapH}px;--u:${mapW / 100}px"
          >
            <div class="ws-floor"></div>
            ${model.zones.map(
              (zone) => html`
                <span class="ws-zone" style="left:${zone.x}%;top:${zone.y}%">${zone.label}</span>
              `,
            )}
            ${model.props.map((prop) =>
              renderWorldProp(prop, workingDeskIdxs, this.agents, this.basePath),
            )}
            ${this.agents.map((agent) =>
              renderWorldAgent(agent, now, {
                sim: this.ensureSim(agent.id),
                working: workingSet.has(agent.id),
                basePath: this.basePath,
                selectedAgentId: this.selectedAgentId,
                focusedAgentId: this.focusedAgentId,
                liveSnippet: this.liveSnippet,
                liveSnippetAgentId: this.liveSnippetAgentId,
                teleportedAt: this.teleportedAt,
                onAgentSelect: this.onAgentSelect,
              }),
            )}
            <div class="ws-tint"></div>
            ${renderWorldParticles(phase, this.theme, this.model.props)}
          </div>
        </div>
        ${this.renderSearch()}
        <div class="ws-hud">
          <span class="ws-hud-time">${phaseIcon} ${time}</span>
          <span class="ws-hud-sep">·</span>
          <span>${this.agents.length} agent${this.agents.length === 1 ? "" : "s"}</span>
          <span class="ws-hud-sep">·</span>
          <span class="${workingCount > 0 ? "ws-hud-working" : ""}"
            >${workingCount > 0 ? `${workingCount} working` : "all idle"}</span
          >
        </div>
        <div class="ws-themes">
          ${WORLD_THEMES.map(
            (entry) => html`
              <button
                class="ws-theme-btn ${this.theme === entry.id ? "is-active" : ""}"
                @click=${() => this.onThemeChange?.(entry.id)}
              >
                ${entry.label}
              </button>
            `,
          )}
        </div>
      </div>
    `;
  }
}

// ── Pixel props (hand-drawn SVG rect art, crisp-scaled) ────────────────

if (!customElements.get("world-stage")) {
  customElements.define("world-stage", WorldStage);
}

declare global {
  interface HTMLElementTagNameMap {
    "world-stage": WorldStage;
  }
}
