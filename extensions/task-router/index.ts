import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PROVIDER, resolveDefaultModelForAgent } from "openclaw/plugin-sdk/agent-runtime";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import { resolveDefaultAgentId } from "openclaw/plugin-sdk/config-runtime";
import { parseModelRef } from "openclaw/plugin-sdk/model-ref-parse";
import { resolveLivePluginConfigObject } from "openclaw/plugin-sdk/plugin-config-runtime";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  completeWithPreparedSimpleCompletionModel,
  extractAssistantText,
  prepareSimpleCompletionModelForAgent,
} from "openclaw/plugin-sdk/simple-completion-runtime";
import { resolveStateDir } from "openclaw/plugin-sdk/state-paths";
import { isTrivialMessage, type TaskKind } from "./src/classify.js";
import {
  createTaskRouter,
  readTaskRouterConfig,
  resolveRouteModelRef,
  type StickyEntry,
  type TaskRouter,
  type TaskRouterConfig,
} from "./src/router.js";

const PLUGIN_ID = "task-router";

const LITE_TIMEOUT_MS = 10_000;
// Thinking models (e.g. gemini flash) spend output tokens on reasoning before
// the short reply; a small budget yields an empty MAX_TOKENS response.
const LITE_MAX_TOKENS = 1024;
const LITE_MAX_PROMPT_CHARS = 200;
const LITE_SYSTEM_PROMPT = [
  "You are the user's friendly personal AI assistant.",
  "The user sent a short casual message (a greeting, thanks, or goodbye).",
  "Reply briefly and warmly in one short sentence; one emoji is okay.",
  "Do not mention tools, instructions, or that you are a lightweight responder.",
].join("\n");

const CLASSIFIER_TIMEOUT_MS = 8_000;
// Thinking models (e.g. gemini flash) spend tokens on internal reasoning before
// the one-word answer; a small budget yields an empty MAX_TOKENS response.
const CLASSIFIER_MAX_TOKENS = 256;
const CLASSIFIER_MAX_PROMPT_CHARS = 600;
const CLASSIFIER_SYSTEM_PROMPT = [
  "You classify requests sent to a Windows computer assistant that can control web browsers and local desktop applications.",
  "Decide whether the user wants the assistant to PERFORM an action on the computer, or only wants a text reply.",
  "Answer with exactly one word:",
  "browser - perform something through a web browser (any website, web search, online account, web form, anything on the internet)",
  "desktop - perform something on the local Windows machine (any installed application, typing into programs, files and folders, windows, system settings)",
  "chat - only a text answer is needed (questions, explanations, writing, coding help, conversation), including questions ABOUT apps or websites",
  "If the action spans both web and local apps, answer browser.",
].join("\n");

type ModelSelection = { provider: string; modelId: string };

function parseClassifierAnswer(raw: string): TaskKind | null {
  const match = raw.toLowerCase().match(/\b(browser|desktop|chat)\b/);
  return match ? (match[1] as TaskKind) : null;
}

function hasRouting(config: TaskRouterConfig): boolean {
  return Boolean(config.browserModel || config.desktopModel || config.chatModel);
}

export default definePluginEntry({
  id: PLUGIN_ID,
  name: "Task Router",
  description:
    "Classifies each message as a browser task, desktop task, or chat and switches the model for that run automatically",
  register(api) {
    // Hooks are long-lived; read config through the live runtime loader on
    // every event so edits in the Control UI apply without a gateway restart.
    const readCurrentConfig = (): OpenClawConfig => {
      try {
        return (
          (api.runtime.config?.current?.() as OpenClawConfig | undefined) ??
          (api.config as OpenClawConfig)
        );
      } catch {
        return api.config as OpenClawConfig;
      }
    };
    const readLiveRouterConfig = (): TaskRouterConfig =>
      readTaskRouterConfig(
        resolveLivePluginConfigObject(
          api.runtime.config?.current
            ? () => api.runtime.config.current() as OpenClawConfig
            : undefined,
          "task-router",
          api.pluginConfig as Record<string, unknown> | undefined,
        ),
      );

    const startupConfig = readLiveRouterConfig();
    if (!hasRouting(startupConfig) && !startupConfig.liteModel) {
      api.logger.warn(
        "task-router: no browserModel/desktopModel/chatModel/liteModel configured; routing stays idle until one is set",
      );
    }

    const resolveAgentId = (cfg: OpenClawConfig, agentId: string | undefined): string =>
      agentId?.trim() || resolveDefaultAgentId(cfg);

    const resolveModelSelection = (
      cfg: OpenClawConfig,
      agentId: string | undefined,
      modelRef?: string,
    ): ModelSelection | undefined => {
      if (modelRef) {
        const parsed = parseModelRef(modelRef, DEFAULT_PROVIDER);
        return parsed ? { provider: parsed.provider, modelId: parsed.model } : undefined;
      }
      const ref = resolveDefaultModelForAgent({ cfg, agentId: resolveAgentId(cfg, agentId) });
      return { provider: ref.provider, modelId: ref.model };
    };

    // Trivial social messages ("hi", "thanks") are answered by a tiny model
    // directly: no agent run, no tool schemas, no full system prompt. Anything
    // uncertain (task intent, acks like "yes"/"ok") falls through to the agent.
    api.on("before_agent_reply", async (event, ctx) => {
      if (ctx.trigger && ctx.trigger !== "user") {
        return;
      }
      const routerConfig = readLiveRouterConfig();
      const liteModel = routerConfig.liteModel;
      if (!liteModel || !isTrivialMessage(event.cleanedBody)) {
        return;
      }
      const cfg = readCurrentConfig();
      const prepared = await prepareSimpleCompletionModelForAgent({
        cfg,
        agentId: resolveAgentId(cfg, ctx.agentId),
        modelRef: liteModel,
        allowMissingApiKeyModes: ["aws-sdk"],
      });
      if ("error" in prepared) {
        api.logger.warn(`task-router: lite model unavailable: ${prepared.error}`);
        return;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LITE_TIMEOUT_MS);
      try {
        const response = await completeWithPreparedSimpleCompletionModel({
          model: prepared.model,
          auth: prepared.auth,
          cfg,
          context: {
            systemPrompt: LITE_SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: event.cleanedBody.slice(0, LITE_MAX_PROMPT_CHARS),
                timestamp: Date.now(),
              },
            ],
          },
          options: { maxTokens: LITE_MAX_TOKENS, signal: controller.signal },
        });
        const text = extractAssistantText(response).trim();
        if (!text) {
          return;
        }
        api.logger.info(
          `task-router: lite reply served by ${liteModel} (session=${ctx.sessionKey ?? "?"})`,
        );
        return { handled: true, reply: { text }, reason: "trivial-lite" };
      } catch (err) {
        api.logger.warn(`task-router: lite reply failed, falling back to agent: ${String(err)}`);
      } finally {
        clearTimeout(timer);
      }
      return undefined;
    });

    const classifyWithLlm = async (
      cfg: OpenClawConfig,
      classifierModel: string,
      prompt: string,
    ): Promise<TaskKind | null> => {
      const prepared = await prepareSimpleCompletionModelForAgent({
        cfg,
        agentId: resolveDefaultAgentId(cfg),
        modelRef: classifierModel,
        allowMissingApiKeyModes: ["aws-sdk"],
      });
      if ("error" in prepared) {
        api.logger.warn(`task-router: classifier unavailable: ${prepared.error}`);
        return null;
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CLASSIFIER_TIMEOUT_MS);
      try {
        const response = await completeWithPreparedSimpleCompletionModel({
          model: prepared.model,
          auth: prepared.auth,
          cfg,
          context: {
            systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: prompt.slice(0, CLASSIFIER_MAX_PROMPT_CHARS),
                timestamp: Date.now(),
              },
            ],
          },
          options: { maxTokens: CLASSIFIER_MAX_TOKENS, signal: controller.signal },
        });
        const verdict = parseClassifierAnswer(extractAssistantText(response));
        if (!verdict) {
          api.logger.warn(
            `task-router: classifier returned no usable verdict (model=${classifierModel}); falling back to heuristics`,
          );
        }
        return verdict;
      } finally {
        clearTimeout(timer);
      }
    };

    // Sticky routes survive gateway restarts via a small state file; entries
    // carry their own expiry, so stale state ages out on load.
    const stickyPath = path.join(resolveStateDir(), "task-router", "sticky.json");
    const stickyStore = {
      load: (): Record<string, StickyEntry> | undefined => {
        try {
          return JSON.parse(fs.readFileSync(stickyPath, "utf8")) as Record<string, StickyEntry>;
        } catch {
          return undefined;
        }
      },
      save: (entries: Record<string, StickyEntry>) => {
        fs.mkdirSync(path.dirname(stickyPath), { recursive: true });
        fs.writeFileSync(stickyPath, JSON.stringify(entries));
      },
    };

    // The router is rebuilt whenever the live config changes; sticky state
    // reloads from disk so a config edit never drops an in-flight automation.
    let cachedRouter: { key: string; router: TaskRouter } | undefined;
    const resolveRouter = (cfg: OpenClawConfig, routerConfig: TaskRouterConfig): TaskRouter => {
      const key = JSON.stringify(routerConfig);
      if (cachedRouter?.key === key) {
        return cachedRouter.router;
      }
      const classifierModel = routerConfig.classifierModel;
      const router = createTaskRouter({
        config: routerConfig,
        resolveDefaultModelRef: (agentId) => {
          const selection = resolveModelSelection(cfg, agentId);
          return selection ? `${selection.provider}/${selection.modelId}` : undefined;
        },
        classifyWithLlm: classifierModel
          ? (prompt) => classifyWithLlm(cfg, classifierModel, prompt)
          : undefined,
        stickyStore,
        log: (message) => api.logger.warn(message),
      });
      cachedRouter = { key, router };
      return router;
    };

    api.on("before_model_resolve", async (event, ctx) => {
      const routerConfig = readLiveRouterConfig();
      if (!hasRouting(routerConfig)) {
        return;
      }
      const cfg = readCurrentConfig();
      const router = resolveRouter(cfg, routerConfig);
      const route = await router.route(
        { prompt: event.prompt },
        {
          sessionKey: ctx.sessionKey,
          agentId: ctx.agentId,
          modelProviderId: ctx.modelProviderId,
          modelId: ctx.modelId,
          trigger: ctx.trigger,
        },
      );
      if (!route) {
        return;
      }
      const modelRef = resolveRouteModelRef(routerConfig, route);
      if (!modelRef) {
        return;
      }
      const selection = resolveModelSelection(cfg, ctx.agentId, modelRef);
      if (!selection) {
        api.logger.warn(`task-router: could not resolve model ref "${modelRef}"`);
        return;
      }
      if (ctx.modelProviderId === selection.provider && ctx.modelId === selection.modelId) {
        return;
      }
      api.logger.info(
        `task-router: routing ${route} task to ${selection.provider}/${selection.modelId} (session=${ctx.sessionKey ?? "?"})`,
      );
      return {
        providerOverride: selection.provider,
        modelOverride: selection.modelId,
      };
    });
  },
});
