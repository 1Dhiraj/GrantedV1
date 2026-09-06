import { spawnSync } from "node:child_process";
import path from "node:path";

export function runBuiltCli(
  tempHome: string,
  args: string[],
  envOverrides: NodeJS.ProcessEnv = {},
  options: { inheritEnvironment?: boolean } = {},
) {
  const env: NodeJS.ProcessEnv = {
    ...(options.inheritEnvironment === false ? { PATH: process.env.PATH } : process.env),
    HOME: tempHome,
    USERPROFILE: tempHome,
    GRANTED_TEST_FAST: "1",
  };
  delete env.GRANTED_HOME;
  delete env.GRANTED_STATE_DIR;
  delete env.GRANTED_CONFIG_PATH;
  delete env.VITEST;
  Object.assign(env, envOverrides);

  const entry = path.resolve(process.cwd(), "openclaw.mjs");
  return spawnSync(process.execPath, [entry, ...args], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000,
  });
}
