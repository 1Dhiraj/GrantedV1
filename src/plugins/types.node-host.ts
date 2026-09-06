// Node-host plugin command contracts, including the opt-in duplex transport.
import type { GrantedConfig } from "../config/types.openclaw.js";

export type GrantedPluginNodeHostCommandAvailabilityContext = {
  /** Node-local configuration used to build this host's Gateway declaration. */
  config: GrantedConfig;
  /** Node-host process environment. */
  env: NodeJS.ProcessEnv;
};

export type GrantedPluginNodeHostCommandIo = {
  emitChunk(chunk: string): Promise<void>;
  onInput(callback: (payloadJSON: string) => void): void;
  /** Complete binary messages; available when the node host dispatches a duplex command. */
  frames?: {
    send(message: Uint8Array): Promise<void>;
    onMessage(listener: (message: Uint8Array) => void | Promise<void>): () => void;
  };
  signal: AbortSignal;
};

export type GrantedPluginNodeWorkspace = {
  workspaceDir: string;
  environmentId: string;
  sessionId: string;
  ownerEpoch: number;
  sessionKey: string;
};

export type GrantedPluginNodeHostCommandContext = {
  /** Emit one node-owned event through the active Gateway connection. */
  sendNodeEvent(event: string, payload: unknown): Promise<unknown>;
  /** Agent session that owns this invocation, when the caller supplied one. */
  sessionKey?: string;
  /** Aborts when the Gateway cancels this specific node-host invocation. */
  signal?: AbortSignal;
  /** Prepare local exec policy; call the returned guard synchronously immediately before spawn. */
  prepareExecAuthorization?: (source: "human-approved" | "session-full") => () => void;
  /** Protect one exact node-owned placement workspace for this invocation's lifetime. */
  acquireManagedWorkspace?: (request: GrantedPluginNodeWorkspace) => {
    workspaceDir: string;
    release: () => void;
  };
};

type GrantedPluginNodeHostCommandBase = {
  command: string;
  cap?: string;
  dangerous?: boolean;
  /** Settle node-local startup before the initial capability declaration; registration stays synchronous. */
  prepare?: (context: GrantedPluginNodeHostCommandAvailabilityContext) => Promise<void> | void;
  /** Return false to omit this command and capability from the node declaration. */
  isAvailable?: (context: GrantedPluginNodeHostCommandAvailabilityContext) => boolean;
  /** Watch node-local availability and request a fresh Gateway declaration. */
  watchAvailability?: (
    context: GrantedPluginNodeHostCommandAvailabilityContext,
    onChange: () => void,
  ) => (() => void) | void;
  /** Release command-owned state when the active Gateway connection closes. */
  onDisconnect?: () => Promise<void> | void;
  /** Optional Computer Use declaration published with this command's node manifest. */
  computerUse?: (context: GrantedPluginNodeHostCommandAvailabilityContext) => unknown;
  agentTool?: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
    /** Platforms where this tool is allowlisted by default; omit for explicit config only. */
    defaultPlatforms?: Array<"ios" | "android" | "macos" | "windows" | "linux" | "unknown">;
    mcp?: { server: string; tool: string };
  };
};

export type GrantedPluginNodeHostCommand = GrantedPluginNodeHostCommandBase & {
  // Not a discriminated handle signature: a union of different arities makes
  // plain `command.handle(params)` uncallable for consumers holding the union.
  // The node host enforces io presence for duplex commands at runtime.
  duplex?: boolean;
  handle: (
    paramsJSON?: string | null,
    io?: GrantedPluginNodeHostCommandIo,
    context?: GrantedPluginNodeHostCommandContext,
  ) => Promise<string>;
};
