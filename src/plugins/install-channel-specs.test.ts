import { describe, expect, it } from "vitest";
import { resolveNpmIntegrityDriftWithDefaultMessage } from "../infra/npm-integrity.js";
import {
  installWithSourceFallback,
  resolveClawHubInstallSpecsForUpdateChannel,
  resolveNpmInstallSpecsForUpdateChannel,
} from "./install-channel-specs.js";

describe("installWithSourceFallback", () => {
  it.each(["notarget", "etarget"])(
    "keeps an integrity refusal terminal for package %s",
    async (name) => {
      const spec = `@synthetic/${name}@1.0.0`;
      const refusal = await resolveNpmIntegrityDriftWithDefaultMessage({
        spec,
        expectedIntegrity: `sha512-${Buffer.alloc(64, 1).toString("base64")}`,
        resolution: {
          resolvedSpec: spec,
          integrity: `sha512-${Buffer.alloc(64, 2).toString("base64")}`,
        },
        onIntegrityDrift: () => false,
      });
      expect(refusal.error).toContain("aborted: npm package integrity drift");
      const attempted: string[] = [];
      const result = await installWithSourceFallback({
        sources: [
          { source: "npm", spec },
          { source: "clawhub", spec: `clawhub:${name}@1.0.0` },
        ],
        install: async ({ source }) => {
          attempted.push(source);
          return source === "npm" ? { ok: false, error: refusal.error } : { ok: true };
        },
        result: (attempt) => attempt,
        onFallback: () => {},
      });
      expect(result.attempt).toEqual({ ok: false, error: refusal.error });
      expect(attempted).toEqual(["npm"]);
    },
  );
});

describe("resolveNpmInstallSpecsForUpdateChannel", () => {
  it.each(["@granted/discord", "@granted/discord@latest"])(
    "targets the exact core version for official extended-stable intent %s",
    (spec) => {
      expect(
        resolveNpmInstallSpecsForUpdateChannel({
          spec,
          updateChannel: "extended-stable",
          officialPackageName: "@granted/discord",
          coreVersion: "2026.7.33",
        }),
      ).toEqual({
        installSpec: "@granted/discord@2026.7.33",
        recordSpec: spec,
      });
    },
  );

  it.each([
    "@granted/discord@2026.6.33",
    "@granted/discord@next",
    "@granted/discord@beta",
    "@granted/discord@^2026.6.0",
    "https://registry.example.test/discord.tgz",
  ])("preserves explicit extended-stable intent %s", (spec) => {
    expect(
      resolveNpmInstallSpecsForUpdateChannel({
        spec,
        updateChannel: "extended-stable",
        officialPackageName: "@granted/discord",
        coreVersion: "2026.7.33",
      }),
    ).toEqual({ installSpec: spec, recordSpec: spec });
  });

  it("does not rewrite a third-party package", () => {
    expect(
      resolveNpmInstallSpecsForUpdateChannel({
        spec: "@acme/discord",
        updateChannel: "extended-stable",
        officialPackageName: "@granted/discord",
        coreVersion: "2026.7.33",
      }),
    ).toEqual({ installSpec: "@acme/discord", recordSpec: "@acme/discord" });
  });

  it("fails closed without an authoritative extended-stable core version", () => {
    expect(() =>
      resolveNpmInstallSpecsForUpdateChannel({
        spec: "@granted/discord",
        updateChannel: "extended-stable",
        officialPackageName: "@granted/discord",
      }),
    ).toThrow("requires an exact core version");
  });

  it.each(["@granted/codex", "@granted/codex@latest"])(
    "targets the exact core version for stable version-bound intent %s",
    (spec) => {
      expect(
        resolveNpmInstallSpecsForUpdateChannel({
          spec,
          updateChannel: "stable",
          officialPackageName: "@granted/codex",
          coreVersion: "2026.8.1",
          versionBoundToCore: true,
        }),
      ).toEqual({
        installSpec: "@granted/codex@2026.8.1",
        recordSpec: spec,
      });
    },
  );

  it.each([
    { channel: "stable" as const, expectedVersion: "2026.7.1" },
    { channel: "extended-stable" as const, expectedVersion: "2026.7.1" },
  ])("preserves the $channel release-cohort contract", ({ channel, expectedVersion }) => {
    expect(
      resolveNpmInstallSpecsForUpdateChannel({
        spec: "@granted/codex",
        updateChannel: channel,
        officialPackageName: "@granted/codex",
        coreVersion: "2026.7.1-2",
        versionBoundToCore: true,
      }),
    ).toEqual({
      installSpec: `@granted/codex@${expectedVersion}`,
      recordSpec: "@granted/codex",
    });
  });

  it.each(
    [false, true].flatMap((versionBoundToCore) =>
      ["@granted/codex", "@granted/codex@latest"].map((spec) => ({ versionBoundToCore, spec })),
    ),
  )(
    "targets the installed beta core for $spec (version-bound=$versionBoundToCore)",
    ({ versionBoundToCore, spec }) => {
      expect(
        resolveNpmInstallSpecsForUpdateChannel({
          spec,
          updateChannel: "beta",
          officialPackageName: "@granted/codex",
          coreVersion: "2026.8.1-beta.3",
          versionBoundToCore,
        }),
      ).toEqual({
        installSpec: "@granted/codex@2026.8.1-beta.3",
        recordSpec: spec,
        fallbackSpec: spec,
        fallbackLabel: "@granted/codex@2026.8.1-beta.3",
      });
    },
  );

  it.each([
    { spec: "@granted/discord", channel: "stable" as const, target: "@granted/discord" },
    { spec: "@granted/discord", channel: "dev" as const, target: "@granted/discord" },
    { spec: "@granted/discord@next", channel: "beta" as const, target: "@granted/discord@next" },
    { spec: "@granted/discord@beta", channel: "beta" as const, target: "@granted/discord@beta" },
    {
      spec: "@granted/discord@2026.7.1",
      channel: "beta" as const,
      target: "@granted/discord@2026.7.1",
    },
  ])("preserves $channel selection for $spec on a beta core", ({ spec, channel, target }) => {
    expect(
      resolveNpmInstallSpecsForUpdateChannel({
        spec,
        updateChannel: channel,
        officialPackageName: "@granted/discord",
        coreVersion: "2026.8.1-beta.3",
      }),
    ).toEqual({ installSpec: target, recordSpec: spec });
  });

  it.each([
    { spec: "@acme/discord", coreVersion: "2026.8.1-beta.3" },
    { spec: "@granted/discord", coreVersion: "2026.8.1" },
    { spec: "@granted/discord", coreVersion: undefined },
  ])("keeps moving beta selection for $spec with core $coreVersion", ({ spec, coreVersion }) => {
    expect(
      resolveNpmInstallSpecsForUpdateChannel({
        spec,
        updateChannel: "beta",
        officialPackageName: "@granted/discord",
        coreVersion,
      }),
    ).toEqual({
      installSpec: `${spec}@beta`,
      recordSpec: spec,
      fallbackSpec: spec,
      fallbackLabel: `${spec}@beta`,
    });
  });
});

describe("resolveClawHubInstallSpecsForUpdateChannel", () => {
  it.each([
    ["stable", false, "2026.7.33", undefined],
    ["stable", true, "2026.7.33", "2026.7.33"],
    ["beta", false, "2026.7.33", "beta"],
    ["beta", false, "2026.8.1-beta.3", "2026.8.1-beta.3"],
    ["beta", true, "2026.8.1-beta.3", "2026.8.1-beta.3"],
    ["extended-stable", false, "2026.7.33", "2026.7.33"],
  ] as const)(
    "resolves declared ClawHub defaults on %s (bound: %s, core: %s)",
    (updateChannel, versionBoundToCore, coreVersion, selector) => {
      for (const spec of ["clawhub:@granted/discord", "clawhub:@granted/discord@latest"]) {
        const installSpec = selector ? `clawhub:@granted/discord@${selector}` : spec;
        expect(
          resolveClawHubInstallSpecsForUpdateChannel({
            spec,
            updateChannel,
            officialPackageName: "@granted/discord",
            coreVersion,
            versionBoundToCore,
          }),
        ).toEqual({
          installSpec,
          recordSpec: spec,
          ...(updateChannel === "beta" ? { fallbackSpec: spec, fallbackLabel: installSpec } : {}),
        });
      }
    },
  );

  it.each(["stable", "beta", "extended-stable"] as const)(
    "preserves exact and non-latest ClawHub selectors on %s",
    (updateChannel) => {
      for (const selector of ["2026.6.33", "next", "beta"]) {
        const spec = `clawhub:@granted/discord@${selector}`;
        expect(
          resolveClawHubInstallSpecsForUpdateChannel({
            spec,
            updateChannel,
            officialPackageName: "@granted/discord",
            coreVersion: updateChannel === "beta" ? "2026.8.1-beta.3" : "2026.7.33",
            versionBoundToCore: true,
          }),
        ).toEqual({ installSpec: spec, recordSpec: spec });
      }
    },
  );

  it("does not rewrite ClawHub on extended-stable", () => {
    expect(
      resolveClawHubInstallSpecsForUpdateChannel({
        spec: "clawhub:@granted/discord",
        updateChannel: "extended-stable",
      }),
    ).toEqual({
      installSpec: "clawhub:@granted/discord",
      recordSpec: "clawhub:@granted/discord",
    });
  });
});
