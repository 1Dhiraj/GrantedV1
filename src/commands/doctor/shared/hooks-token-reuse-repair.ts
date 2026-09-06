// Doctor repair for configs that reuse Gateway shared-secret auth as hooks.token.
import { normalizeOptionalString } from "@granted/normalization-core/string-coerce";
import type { GrantedConfig } from "../../../config/types.openclaw.js";
import {
  canMaterializeGatewayAuthSecretRefsWithoutExec,
  materializeGatewayAuthSecretRefs,
} from "../../../gateway/auth-config-utils.js";
import { resolveGatewayAuth, type ResolvedGatewayAuth } from "../../../gateway/auth.js";
import { randomToken } from "../../random-token.js";
import type { DoctorConfigMutationResult } from "./config-mutation-state.js";

function activeGatewaySharedSecret(auth: ResolvedGatewayAuth): string {
  if (auth.mode === "token") {
    return normalizeOptionalString(auth.token) ?? "";
  }
  if (auth.mode === "password" || auth.mode === "trusted-proxy") {
    return normalizeOptionalString(auth.password) ?? "";
  }
  return "";
}

/** Rotate hooks.token when it matches the active Gateway token/password shared secret. */
export function repairHooksTokenReuseGatewayAuth(
  cfg: GrantedConfig,
  env: NodeJS.ProcessEnv = process.env,
  createToken: () => string = randomToken,
): Promise<DoctorConfigMutationResult> {
  return repairHooksTokenReuseGatewayAuthAfterMaterializingRefs(cfg, env, createToken);
}

async function materializeDoctorGatewayAuthRefs(
  cfg: GrantedConfig,
  env: NodeJS.ProcessEnv,
): Promise<GrantedConfig> {
  const materializeParams = {
    cfg,
    env,
    mode: cfg.gateway?.auth?.mode,
    hasTokenOverride: false,
    hasPasswordOverride: false,
    hasTokenFallback: Boolean(normalizeOptionalString(env.GRANTED_GATEWAY_TOKEN)),
    hasPasswordFallback: Boolean(normalizeOptionalString(env.GRANTED_GATEWAY_PASSWORD)),
  };
  if (!canMaterializeGatewayAuthSecretRefsWithoutExec(materializeParams)) {
    return cfg;
  }
  try {
    return await materializeGatewayAuthSecretRefs(materializeParams);
  } catch {
    return cfg;
  }
}

async function repairHooksTokenReuseGatewayAuthAfterMaterializingRefs(
  cfg: GrantedConfig,
  env: NodeJS.ProcessEnv,
  createToken: () => string,
): Promise<DoctorConfigMutationResult> {
  const hooksToken = normalizeOptionalString(cfg.hooks?.token) ?? "";
  if (cfg.hooks?.enabled !== true || !hooksToken) {
    return { config: cfg, changes: [] };
  }

  const materializedCfg = await materializeDoctorGatewayAuthRefs(cfg, env);
  const auth = resolveGatewayAuth({
    authConfig: materializedCfg.gateway?.auth,
    tailscaleMode: materializedCfg.gateway?.tailscale?.mode ?? "off",
    env,
  });
  if (hooksToken !== activeGatewaySharedSecret(auth)) {
    return { config: cfg, changes: [] };
  }

  const nextHooksToken = createToken();
  return {
    config: {
      ...cfg,
      hooks: {
        ...cfg.hooks,
        token: nextHooksToken,
      },
    },
    changes: [
      "Rotated hooks.token because it reused active Gateway shared-secret auth. Update external hook senders to use the new hooks.token.",
    ],
  };
}
