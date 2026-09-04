// World simulation model: the map, its regions and props, and the pure
// helpers that drive sprite behaviour. Split out of world-stage.ts so the
// element file stays under the repo's per-file line cap, and so this logic
// can be exercised without mounting a custom element.
import type { GatewayAgentRow } from "../api/types.ts";

// ── World stage ────────────────────────────────────────────────────────
// A living top-down pixel world. Each agent is a sprite that freely roams
// the map: idle agents wander between points of interest, pause, chat with
// each other and think out loud; the working agent walks to its desk and
// types. The simulation ticks inside this element (~1.7 Hz) so the rest of
// the app never re-renders for animation.
//
// The world GROWS with the team: desks are laid out on a grid sized to the
// agent count, so every agent gets its own workstation and the map expands
// (and the viewport scrolls) as more agents move in.
//
// Sprites are CC0 (Ninja Adventure pack). Sheets are 4 columns × 7 rows of
// 16px frames; COLUMNS are facing directions (down, up, left, right) and
// the first four ROWS are the walk-cycle frames for that direction.

const SPRITE_BASES = ["ninja_blue", "samurai_blue", "samurai_green"];
const SPRITE_HUES = [0, 35, 70, 140, 200, 250, 300];

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function spriteArtFor(agentKey: string, basePath: string): { url: string; hue: number } {
  const h = hashString(agentKey);
  // Modulo keeps these in range; the fallbacks satisfy strict index checking
  // and would only ever be reached if the arrays were emptied.
  const base = SPRITE_BASES[h % SPRITE_BASES.length] ?? "ninja_blue";
  const hue = SPRITE_HUES[(h >> 4) % SPRITE_HUES.length] ?? 0;
  const root = (basePath || "").replace(/\/$/, "");
  return { url: `${root}/sprites/${base}.png`, hue };
}

export function agentDisplayName(agent: GatewayAgentRow): string {
  return (agent.name || agent.identity?.name || agent.id || "agent").trim();
}

/** Shorten "together/moonshotai/Kimi-K2.6" → "Kimi-K2.6". */
export function agentModelLabel(agent: GatewayAgentRow): string {
  const primary = agent.model?.primary?.trim();
  if (!primary) {
    return "default model";
  }
  const parts = primary.split("/");
  return parts[parts.length - 1] || primary;
}

// Facing → sprite sheet column.
export const FACE_DOWN = 0;
export const FACE_UP = 1;
export const FACE_LEFT = 2;
export const FACE_RIGHT = 3;

type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };
/** A wander target with a meaning ("break", "server", "lounge", "pond"). */
type Poi = { x: number; y: number; kind: string };
type Zone = { x: number; y: number; label: string };
export type Prop = { kind: string; x: number; y: number; w: number; deskIdx?: number };

/** A fully resolved, size-aware world (all positions in % of the map). */
export type WorldModel = {
  /** Virtual map size in px at base zoom; the render scales this to fit. */
  vw: number;
  vh: number;
  /** Walkable rectangles agents may roam within. */
  walk: Rect[];
  /** No-go areas inside the walk rects (e.g. the forest pond). */
  blocked: Rect[];
  /** One workstation spot per agent; the working agent walks to its own. */
  desks: Point[];
  /** Wander targets so idle motion gravitates to meaningful places. */
  pois: Poi[];
  props: Prop[];
  zones: Zone[];
};

export const WORLD_THEMES: Array<{ id: string; label: string }> = [
  { id: "office", label: "Office" },
  { id: "forest", label: "Forest" },
  { id: "void", label: "Minimal" },
];

// Layout constants (virtual px).
const PAD = 66; // outer margin
const CELL_W = 152; // desk cell width
const CELL_H = 120; // desk cell height
const TOP_BAND = 78; // structures strip above the desks
const BREAK_BAND = 140; // lounge / campfire strip below the desks
const MAX_COLS = 12;

export function deskGrid(count: number): { cols: number; rows: number } {
  const n = Math.max(1, count);
  // Aim for a ~16:10 grid so it reads like a room, not a corridor.
  // Small teams get a cozy room (3×1); the map genuinely grows as agents
  // move in, up to a wide scrollable floor.
  const cols = Math.min(MAX_COLS, Math.max(3, Math.ceil(Math.sqrt(n * 1.7))));
  const rows = Math.max(1, Math.ceil(n / cols));
  return { cols, rows };
}

/** Build the world for a theme + agent count. Deterministic and memoized. */
export function buildWorld(theme: string, count: number): WorldModel {
  const forest = theme === "forest";
  const { cols, rows } = deskGrid(count);
  const gridW = cols * CELL_W;
  const gridH = rows * CELL_H;
  const vw = PAD * 2 + gridW;
  const vh = PAD + TOP_BAND + gridH + BREAK_BAND + PAD;
  const px = (v: number) => (v / vw) * 100;
  const py = (v: number) => (v / vh) * 100;
  const wUnits = (widthPx: number) => (widthPx / vw) * 100; // prop width in %-of-width

  const desks: Point[] = [];
  const props: Prop[] = [];
  // Exactly one desk per agent — no empty filler workstations.
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const cx = PAD + c * CELL_W + CELL_W / 2;
    const standY = PAD + TOP_BAND + r * CELL_H + CELL_H * 0.66;
    desks.push({ x: px(cx), y: py(standY) });
    props.push({
      kind: forest ? "stump" : "desk",
      x: px(cx),
      y: py(standY - 34),
      w: wUnits(forest ? 82 : 96),
      deskIdx: i,
    });
  }

  // Structures along the top strip.
  const topY = PAD + TOP_BAND * 0.42;
  const centerX = vw / 2;
  if (forest) {
    props.push({ kind: "tent", x: px(PAD + CELL_W * 0.5), y: py(topY), w: wUnits(96) });
    props.push({ kind: "tent", x: px(vw - PAD - CELL_W * 0.5), y: py(topY), w: wUnits(88) });
    props.push({ kind: "sign", x: px(PAD * 0.7), y: py(topY + 18), w: wUnits(52) });
    // Frame the clearing with trees along the top edge.
    const treeN = Math.max(4, cols);
    for (let i = 0; i < treeN; i++) {
      const tx = PAD + ((i + 0.5) / treeN) * gridW;
      props.push({ kind: "tree", x: px(tx), y: py(PAD * 0.5), w: wUnits(120) });
    }
  } else {
    props.push({ kind: "whiteboard", x: px(centerX), y: py(topY - 4), w: wUnits(132) });
    props.push({ kind: "bookshelf", x: px(centerX - CELL_W), y: py(topY), w: wUnits(104) });
    props.push({ kind: "clock", x: px(centerX + CELL_W), y: py(topY - 6), w: wUnits(40) });
  }

  // Corner plants (both indoor + a couple in the forest for variety).
  props.push({ kind: "plant", x: px(PAD * 0.6), y: py(PAD + TOP_BAND + 6), w: wUnits(52) });
  props.push({ kind: "plant", x: px(vw - PAD * 0.6), y: py(PAD + TOP_BAND + 6), w: wUnits(52) });

  // Break / lounge strip along the bottom.
  const breakY = vh - PAD - BREAK_BAND * 0.5;
  const pois: Poi[] = [];
  const zones: Zone[] = [];
  const blocked: Rect[] = [];
  if (forest) {
    props.push({ kind: "campfire", x: px(centerX), y: py(breakY), w: wUnits(84) });
    pois.push({ x: px(centerX), y: py(breakY + 6), kind: "break" });
    zones.push({ x: px(centerX), y: py(breakY + BREAK_BAND * 0.42), label: "campfire" });
    // A pond occupies the bottom-right corner (a no-go area).
    const pondX = vw - PAD - 150;
    const pondY = vh - PAD - 96;
    props.push({ kind: "pond", x: px(pondX + 75), y: py(pondY + 44), w: wUnits(180) });
    blocked.push({ x: px(pondX), y: py(pondY - 20), w: wUnits(190), h: (110 / vh) * 100 });
    zones.push({ x: px(pondX + 75), y: py(pondY + 84), label: "pond" });
    pois.push({ x: px(pondX - 20), y: py(pondY + 30), kind: "pond" });
  } else {
    props.push({ kind: "rug", x: px(centerX), y: py(breakY + 8), w: wUnits(190) });
    props.push({ kind: "coffee", x: px(vw - PAD - 40), y: py(breakY - 6), w: wUnits(56) });
    props.push({ kind: "watercooler", x: px(vw - PAD - 96), y: py(breakY + 6), w: wUnits(44) });
    props.push({ kind: "server", x: px(PAD + 30), y: py(breakY), w: wUnits(60) });
    pois.push({ x: px(centerX), y: py(breakY + 6), kind: "lounge" });
    pois.push({ x: px(vw - PAD - 60), y: py(breakY), kind: "break" });
    pois.push({ x: px(PAD + 40), y: py(breakY), kind: "server" });
    zones.push({ x: px(vw - PAD - 70), y: py(breakY + BREAK_BAND * 0.42), label: "break corner" });
    zones.push({ x: px(PAD + 40), y: py(breakY + BREAK_BAND * 0.42), label: "server bay" });
  }
  zones.push({ x: px(centerX), y: py(PAD + TOP_BAND * 0.86), label: "workstations" });

  // A couple of mid-floor wander targets between the desk rows.
  pois.push({ x: px(centerX), y: py(PAD + TOP_BAND + gridH * 0.5), kind: "floor" });

  const walk: Rect[] = [
    {
      x: px(PAD * 0.8),
      y: py(PAD + TOP_BAND * 0.7),
      w: 100 - px(PAD * 0.8) * 2,
      h: 100 - py(PAD + TOP_BAND * 0.7) - py(PAD * 0.8),
    },
  ];

  return { vw, vh, walk, blocked, desks, pois, props, zones };
}

// Idle agents think out loud — but what they say follows where they are
// (break corner, server bay, pond…) and the time of day, so bubbles read
// as behavior, not random noise.
export const BUBBLES_BY_PLACE: Record<string, string[]> = {
  break: ["☕ quick break", "refuelling…", "back in a sec"],
  lounge: ["taking five", "stretching…", "thinking it over"],
  server: ["checking the racks", "gateway looks healthy", "all lights green"],
  pond: ["watching the fish", "so calm here", "skipping stones"],
  floor: ["ready for a task", "all quiet", "making the rounds"],
};
export const BUBBLES_NIGHT = ["zzz…", "night shift…", "quiet out here"];
export const CHAT_OPENERS = [
  "any tasks for me?",
  "how's your context?",
  "logs look clean today",
  "heard we got a new skill",
];
export const CHAT_REPLIES = ["all systems green", "plenty of room left", "nice and quiet", "🤖👍"];

// Walk speed in map-height-% per second (x distances are scaled by aspect).
export const WALK_SPEED = 13;

export type SimAgent = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  moveUntil: number;
  moveDur: number;
  pauseUntil: number;
  facing: number;
  bubble: string | null;
  bubbleUntil: number;
  chatUntil: number;
  chatCooldownUntil: number;
  deskIdx: number;
  /** Meaning of the current destination (POI kind), for contextual bubbles. */
  targetKind: string | null;
};

function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function isWalkable(model: WorldModel, x: number, y: number): boolean {
  if (model.blocked.some((r) => pointInRect(x, y, r))) {
    return false;
  }
  return model.walk.some((r) => pointInRect(x, y, r));
}

export function pick<T>(items: readonly T[], fallback: T): T {
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
}

/** Deterministic 0..1 for stable per-index particle styling. */
export function fract(seed: number): number {
  const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function dayPhase(date: Date): "dawn" | "day" | "dusk" | "night" {
  const h = date.getHours();
  if (h >= 5 && h < 8) {
    return "dawn";
  }
  if (h >= 8 && h < 17) {
    return "day";
  }
  if (h >= 17 && h < 21) {
    return "dusk";
  }
  return "night";
}
