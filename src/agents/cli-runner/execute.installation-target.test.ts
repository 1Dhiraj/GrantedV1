import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getInstallationTarget,
  withInstallationTarget,
} from "../../infra/installation-target-context.js";
import { withEnvAsync } from "../../test-utils/env.js";
import { buildPreparedCliRunContext } from "../cli-runner.test-helpers.js";
import { executePreparedCliRun } from "./execute.js";
import { createManagedRun, supervisorSpawnMock } from "./execute.test-support.js";

afterEach(() => supervisorSpawnMock.mockReset());

describe("CLI installation target", () => {
  it.each(["process", "plugin", "node"] as const)(
    "projects local child environment and fences %s placement",
    async (kind) => {
      const target = {
        stateDir: "/fixture/diagnosed",
        configPath: "/fixture/custom.json",
        defaultWorkspaceDir: "/fixture/default-workspace",
      };
      const context = buildPreparedCliRunContext({
        model: "fixture-model",
        backend: {
          command: "/bin/sh",
          args: [],
          output: "text",
          systemPromptFileArg: undefined,
          input: "stdin",
        },
      });
      let childEnv: NodeJS.ProcessEnv | undefined;
      const pluginExecute = vi.fn(async function* (execution: { env: NodeJS.ProcessEnv }) {
        childEnv = execution.env;
        yield { type: "result", subtype: "success", result: "done" };
      });
      if (kind === "plugin") {
        context.executionTarget = { kind, execute: pluginExecute };
        context.preparedBackend.backend.output = "jsonl";
        context.preparedBackend.backend.jsonlDialect = "claude-stream-json";
      } else if (kind === "node") {
        context.executionTarget = { kind, placement: { nodeId: "fixture-node" } };
      }
      supervisorSpawnMock.mockResolvedValue(
        createManagedRun({
          reason: "exit",
          exitCode: 0,
          exitSignal: null,
          durationMs: 1,
          stdout: "done",
          stderr: "",
          timedOut: false,
          noOutputTimedOut: false,
        }),
      );
      await withEnvAsync(
        {
          GRANTED_STATE_DIR: "/fixture/scratch",
          GRANTED_CONFIG_PATH: undefined,
          GRANTED_WORKSPACE_DIR: "/fixture/execution-cwd",
        },
        async () => {
          const run = withInstallationTarget(target, () => executePreparedCliRun(context));
          expect(getInstallationTarget()).toBeUndefined();
          if (kind === "node") {
            await expect(run).rejects.toThrow("saved prompt");
            expect(supervisorSpawnMock).not.toHaveBeenCalled();
            expect(pluginExecute).not.toHaveBeenCalled();
            return;
          }
          await expect(run).resolves.toMatchObject({ text: "done" });
          const expectedEnv = {
            GRANTED_STATE_DIR: target.stateDir,
            GRANTED_CONFIG_PATH: target.configPath,
            GRANTED_WORKSPACE_DIR: target.defaultWorkspaceDir,
          };
          if (kind === "process") {
            expect(supervisorSpawnMock).toHaveBeenLastCalledWith(
              expect.objectContaining({ env: expect.objectContaining(expectedEnv) }),
            );
          } else {
            expect(childEnv).toMatchObject(expectedEnv);
          }
          expect(process.env.GRANTED_STATE_DIR).toBe("/fixture/scratch");
          expect(process.env.GRANTED_CONFIG_PATH).toBeUndefined();
          expect(process.env.GRANTED_WORKSPACE_DIR).toBe("/fixture/execution-cwd");
          await executePreparedCliRun(context);
          if (kind === "process") {
            expect(supervisorSpawnMock).toHaveBeenLastCalledWith(
              expect.objectContaining({
                env: expect.objectContaining({
                  GRANTED_STATE_DIR: "/fixture/scratch",
                  GRANTED_WORKSPACE_DIR: "/fixture/execution-cwd",
                }),
              }),
            );
            expect(supervisorSpawnMock).not.toHaveBeenLastCalledWith(
              expect.objectContaining({
                env: expect.objectContaining({ GRANTED_CONFIG_PATH: expect.anything() }),
              }),
            );
          } else {
            expect(childEnv?.GRANTED_STATE_DIR).toBe("/fixture/scratch");
            expect(childEnv?.GRANTED_CONFIG_PATH).toBeUndefined();
            expect(childEnv?.GRANTED_WORKSPACE_DIR).toBe("/fixture/execution-cwd");
          }
        },
      );
    },
  );
});
