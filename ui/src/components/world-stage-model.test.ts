// The world map is generated from the agent roster, so the geometry has to
// hold for one agent and for a full team. Splitting the model out of the
// element is what makes this testable at all.
import { describe, expect, it } from "vitest";
import type { GatewayAgentRow } from "../api/types.ts";
import {
  agentDisplayName,
  buildWorld,
  deskGrid,
  hashString,
  isWalkable,
  spriteArtFor,
} from "./world-stage-model.ts";

const agent = (over: Partial<GatewayAgentRow> = {}): GatewayAgentRow =>
  ({ id: "main", name: "Main", ...over }) as GatewayAgentRow;

describe("hashString", () => {
  it("is stable for the same input", () => {
    expect(hashString("main")).toBe(hashString("main"));
  });

  it("separates different agents", () => {
    expect(hashString("main")).not.toBe(hashString("helper"));
  });

  it("never returns a negative index source", () => {
    // The result feeds modulo lookups into the sprite tables.
    for (const value of ["", "a", "zzzzzzzzzzzzzzzz", "🙂"]) {
      expect(hashString(value)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("spriteArtFor", () => {
  it("gives one agent the same sprite every time", () => {
    const first = spriteArtFor("main", "/base");
    expect(spriteArtFor("main", "/base")).toEqual(first);
  });

  it("resolves against the asset base path without doubling slashes", () => {
    expect(spriteArtFor("main", "/base/").url).not.toContain("//sprites");
    expect(spriteArtFor("main", "/base").url).toContain("/base/sprites/");
  });

  it("still returns art when no base path is configured", () => {
    expect(spriteArtFor("main", "").url).toContain("/sprites/");
  });
});

describe("deskGrid", () => {
  it("gives every agent a desk", () => {
    for (const count of [1, 2, 5, 12, 13, 40]) {
      const { cols, rows } = deskGrid(count);
      expect(cols * rows).toBeGreaterThanOrEqual(count);
    }
  });

  it("grows in columns before it runs away in rows", () => {
    expect(deskGrid(1).cols).toBeGreaterThanOrEqual(1);
    expect(deskGrid(40).cols).toBeLessThanOrEqual(12);
  });
});

describe("buildWorld", () => {
  it("lays out one desk per agent", () => {
    expect(buildWorld("office", 1).desks).toHaveLength(1);
    expect(buildWorld("office", 7).desks).toHaveLength(7);
  });

  it("grows the map as the team grows", () => {
    const small = buildWorld("office", 1);
    const large = buildWorld("office", 24);
    expect(large.vh).toBeGreaterThan(small.vh);
  });

  it("always leaves somewhere to walk", () => {
    // Sprites pick random walk targets; an empty region list would strand them.
    for (const theme of ["office", "forest"]) {
      expect(buildWorld(theme, 3).walk.length).toBeGreaterThan(0);
    }
  });

  it("handles an empty roster without collapsing", () => {
    const world = buildWorld("office", 0);
    expect(world.vw).toBeGreaterThan(0);
    expect(world.vh).toBeGreaterThan(0);
  });
});

describe("isWalkable", () => {
  it("accepts a point inside a walk region and rejects one far outside", () => {
    const world = buildWorld("office", 4);
    const region = world.walk[0];
    expect(region).toBeDefined();
    if (!region) {
      return;
    }
    expect(isWalkable(world, region.x + region.w / 2, region.y + region.h / 2)).toBe(true);
    expect(isWalkable(world, -500, -500)).toBe(false);
  });
});

describe("agentDisplayName", () => {
  it("prefers the configured name", () => {
    expect(agentDisplayName(agent({ name: "Molty" }))).toBe("Molty");
  });

  it("falls back to something printable when unnamed", () => {
    expect(agentDisplayName(agent({ name: undefined }))).toBeTruthy();
  });
});
