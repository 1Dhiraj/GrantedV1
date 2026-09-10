// Install download test utilities provide isolated state and workspace paths.
import {
  createOpenClawTestState,
  type GrantedTestState,
} from "../../test-utils/granted-test-state.js";

/** Creates isolated OpenClaw state for install download tests. */
export async function createInstallDownloadTestState(): Promise<GrantedTestState> {
  return await createOpenClawTestState({
    layout: "state-only",
    prefix: "openclaw-skills-install-",
  });
}
