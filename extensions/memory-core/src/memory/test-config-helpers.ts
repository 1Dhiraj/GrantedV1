import type { GrantedConfig } from "granted/plugin-sdk/memory-core-host-engine-foundation";

export function isolateMemoryManagerTestConfig(cfg: GrantedConfig): GrantedConfig {
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      enabled: cfg.plugins?.enabled ?? false,
    },
  };
}
