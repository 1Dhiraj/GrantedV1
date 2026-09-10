// Logger browser import tests cover safe import behavior in browser-like runtimes.
import { importFreshModule } from "granted/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredGrantedTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredGrantedTmpDir: ReturnType<typeof vi.fn>;
}> {
  const resolvePreferredGrantedTmpDir =
    params?.resolvePreferredGrantedTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredGrantedTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-granted-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-granted-dir.js")>(
      "../infra/tmp-granted-dir.js",
    );
    return {
      ...actual,
      resolvePreferredGrantedTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await importFreshModule<LoggerModule>(
    import.meta.url,
    "./logger.js?scope=browser-safe",
  );
  return { module, resolvePreferredGrantedTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.doUnmock("../infra/tmp-granted-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredGrantedTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredGrantedTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/openclaw");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/openclaw/openclaw.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredGrantedTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toStrictEqual({
      level: "silent",
      file: "/tmp/openclaw/openclaw.log",
      maxFileBytes: 100 * 1024 * 1024,
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(module.getLogger().info("browser-safe")).toBeUndefined();
    expect(resolvePreferredGrantedTmpDir).not.toHaveBeenCalled();
  });
});
