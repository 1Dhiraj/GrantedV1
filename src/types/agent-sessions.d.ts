// Declares extension points for agent session type augmentation.
export type GrantedAgentSessionSkillSourceAugmentation = never;

declare module "granted/plugin-sdk/agent-sessions" {
  interface Skill {
    // OpenClaw relies on the source identifier returned by skill loaders.
    source: string;
  }
}
