---
summary: "Generated inventory of OpenClaw plugins shipped in core, published externally, or kept source-only"
read_when:
  - You are deciding whether a plugin ships in the core npm package or installs separately
  - You are updating bundled plugin package metadata or release automation
  - You need the canonical internal vs external plugin list
title: "Plugin inventory"
---

# Plugin inventory

This page is generated from top-level `extensions/*/granted.plugin.json`
manifests and the root npm package `files` exclusions. Optional `package.json`
metadata enriches package and distribution details. Regenerate it with:

```bash
pnpm plugins:inventory:gen
```

## Definitions

- **Core npm package:** built into the `openclaw` npm package and available without a separate plugin install.
- **Official external package:** OpenClaw-maintained plugin omitted from the core npm package, kept in this official inventory, and installed on demand through ClawHub and/or npm.
- **Source checkout only:** repo-local plugin omitted from published npm artifacts and not advertised as an installable package.

Source checkouts are different from npm installs: after `pnpm install`, bundled
plugins load from `extensions/<id>` so local edits and package-local workspace
dependencies are available.

## Install a plugin

Use the install route in each entry to decide whether install is needed. Plugins
that say `included in OpenClaw` are already present in the core package.
Official external packages need one install, then a Gateway restart.

For example, Discord is an official external package:

```bash
openclaw plugins install @granted/discord
openclaw gateway restart
openclaw plugins inspect discord --runtime --json
```

During the launch cutover, ordinary bare package specs still install from npm.
Use `clawhub:@granted/discord` or `npm:@granted/discord` when you need an
explicit source. After install, follow the plugin's setup doc, such as
[Discord](/channels/discord), to add credentials and channel config. See
[Manage plugins](/plugins/manage-plugins) for update, uninstall, and publishing
commands.

Each entry lists the package, distribution route, and description.

## Core npm package

59 plugins

- **[a2a](/plugins/reference/a2a)** (`@granted/a2a`) - included in OpenClaw. A2A v1.0 Agent-to-Agent protocol channel plugin.

- **[active-memory](/plugins/reference/active-memory)** (`openclaw`) - included in OpenClaw. Runs bounded pre-reply memory retrieval and implements per-agent Remember across conversations for eligible private conversations.

- **[admin-http-rpc](/plugins/reference/admin-http-rpc)** (`@granted/admin-http-rpc`) - included in OpenClaw. OpenClaw admin HTTP RPC endpoint.

- **[alibaba](/plugins/reference/alibaba)** (`@granted/alibaba-provider`) - included in OpenClaw. Adds video generation provider support.

- **[anthropic](/plugins/reference/anthropic)** (`@granted/anthropic-provider`) - included in OpenClaw. Anthropic models, Claude CLI, and native Claude session catalog.

- **[azure-speech](/plugins/reference/azure-speech)** (`@granted/azure-speech`) - included in OpenClaw. Azure AI Speech text-to-speech (MP3, native Ogg/Opus voice notes, PCM telephony).

- **[beam](/plugins/reference/beam)** (`@granted/beam`) - included in OpenClaw. Read-only coding-session Beam receiver.

- **[bonjour](/plugins/reference/bonjour)** (`@granted/bonjour`) - included in OpenClaw. Advertise the local OpenClaw gateway over Bonjour/mDNS.

- **[browser](/plugins/reference/browser)** (`@granted/browser-plugin`) - included in OpenClaw. Adds agent-callable tools.

- **[canvas](/plugins/reference/canvas)** (`@granted/canvas-plugin`) - included in OpenClaw. Presents hosted widget documents on paired macOS panels.

- **[clawrouter](/plugins/reference/clawrouter)** (`@granted/clawrouter`) - included in OpenClaw. Adds ClawRouter model provider support to OpenClaw.

- **[copilot-proxy](/plugins/reference/copilot-proxy)** (`@granted/copilot-proxy`) - included in OpenClaw. Adds Copilot Proxy model provider support to OpenClaw.

- **[crabbox](/plugins/reference/crabbox)** (`@granted/crabbox-provider`) - included in OpenClaw. Cloud worker provider backed by the Crabbox CLI.

- **[cua-computer](/plugins/reference/cua-computer)** (`@granted/cua-computer`) - included in OpenClaw. Experimental CUA Driver computer control for macOS, Windows, and Linux node hosts.

- **[deepgram](/plugins/reference/deepgram)** (`@granted/deepgram-provider`) - included in OpenClaw. Adds media understanding provider support. Adds realtime transcription provider support.

- **[device-pair](/plugins/reference/device-pair)** (`openclaw`) - included in OpenClaw. Generate setup codes and approve device pairing requests.

- **[document-extract](/plugins/reference/document-extract)** (`@granted/document-extract-plugin`) - included in OpenClaw. Extract text and fallback page images from local document attachments.

- **[elevenlabs](/plugins/reference/elevenlabs)** (`@granted/elevenlabs-speech`) - included in OpenClaw. Adds media understanding provider support. Adds realtime transcription provider support. Adds text-to-speech provider support.

- **[fal](/plugins/reference/fal)** (`@granted/fal-provider`) - included in OpenClaw. Adds fal model provider support to OpenClaw.

- **[file-transfer](/plugins/reference/file-transfer)** (`@granted/file-transfer`) - included in OpenClaw. Fetch, list, and write files on paired nodes via dedicated node commands. Bypasses bash stdout truncation by using base64 over node.invoke for binaries up to 16 MB.

- **[geolocation](/plugins/reference/geolocation)** (`@granted/geolocation-plugin`) - included in OpenClaw. Resolves client IP addresses to a coarse city using a locally cached IP-geolocation database.

- **[github-copilot](/plugins/reference/github-copilot)** (`@granted/github-copilot-provider`) - included in OpenClaw. Adds GitHub Copilot model provider support to OpenClaw.

- **[google](/plugins/reference/google)** (`@granted/google-plugin`) - included in OpenClaw. Adds Google, Google Gemini CLI, Google Vertex model provider support to OpenClaw.

- **[huggingface](/plugins/reference/huggingface)** (`@granted/huggingface-provider`) - included in OpenClaw. Adds Hugging Face model provider support to OpenClaw.

- **[imap](/plugins/reference/imap)** (`@granted/imap`) - included in OpenClaw. Watch IMAP mailboxes and dispatch authenticated incoming email to isolated agent sessions.

- **[linux-node](/plugins/reference/linux-node)** (`@granted/linux-node`) - included in OpenClaw. Desktop notifications, camera capture, and location for Linux node hosts.

- **[litellm](/plugins/reference/litellm)** (`@granted/litellm-provider`) - included in OpenClaw. Adds LiteLLM model provider support to OpenClaw.

- **[llm-task](/plugins/reference/llm-task)** (`@granted/llm-task`) - included in OpenClaw. Generic JSON-only LLM tool for structured tasks callable from workflows.

- **[lmstudio](/plugins/reference/lmstudio)** (`@granted/lmstudio-provider`) - included in OpenClaw. Adds LM Studio model provider support to OpenClaw.

- **[logbook](/plugins/reference/logbook)** (`@granted/logbook`) - included in OpenClaw. Automatic work journal: captures periodic screen snapshots from a paired node and turns them into a reviewable timeline of your day.

- **[memory-core](/plugins/reference/memory-core)** (`@granted/memory-core`) - included in OpenClaw. Adds agent-callable tools.

- **[memory-wiki](/plugins/reference/memory-wiki)** (`@granted/memory-wiki`) - included in OpenClaw. Persistent wiki compiler and Obsidian-friendly knowledge vault for OpenClaw.

- **[microsoft](/plugins/reference/microsoft)** (`@granted/microsoft-speech`) - included in OpenClaw. Adds text-to-speech provider support.

- **[microsoft-foundry](/plugins/reference/microsoft-foundry)** (`@granted/microsoft-foundry`) - included in OpenClaw. Adds Microsoft Foundry model provider support to OpenClaw.

- **[migrate-claude](/plugins/reference/migrate-claude)** (`@granted/migrate-claude`) - included in OpenClaw. Imports Claude Code and Claude Desktop instructions, MCP servers, skills, and safe configuration into OpenClaw.

- **[migrate-hermes](/plugins/reference/migrate-hermes)** (`@granted/migrate-hermes`) - included in OpenClaw. Imports Hermes configuration, memories, skills, and supported credentials into OpenClaw.

- **[minimax](/plugins/reference/minimax)** (`@granted/minimax-provider`) - included in OpenClaw. Adds MiniMax, MiniMax Portal model provider support to OpenClaw.

- **[nvidia](/plugins/reference/nvidia)** (`@granted/nvidia-provider`) - included in OpenClaw. Adds NVIDIA model provider support to OpenClaw.

- **[oc-path](/plugins/reference/oc-path)** (`@granted/oc-path`) - included in OpenClaw. Adds the openclaw path CLI for oc:// workspace file addressing.

- **[ollama](/plugins/reference/ollama)** (`@granted/ollama-provider`) - included in OpenClaw. Adds Ollama, Ollama Cloud model provider support to OpenClaw.

- **[onepassword](/plugins/reference/onepassword)** (`@granted/onepassword`) - included in OpenClaw. 1Password SecretRef resolver and curated agent broker with approval policy and SQLite audit history.

- **[openai](/plugins/reference/openai)** (`@granted/openai-provider`) - included in OpenClaw. Adds OpenAI model provider support to OpenClaw.

- **[opencode-go](/plugins/reference/opencode-go)** (`@granted/opencode-go-provider`) - included in OpenClaw. Adds OpenCode Go model provider support to OpenClaw.

- **[openrouter](/plugins/reference/openrouter)** (`@granted/openrouter-provider`) - included in OpenClaw. Adds OpenRouter model provider support to OpenClaw.

- **[policy](/plugins/reference/policy)** (`@granted/policy`) - included in OpenClaw. Adds policy-backed doctor checks for workspace conformance.

- **[reef](/plugins/reference/reef)** (`@granted/reef`) - included in OpenClaw. Guarded end-to-end encrypted claw channel.

- **[runway](/plugins/reference/runway)** (`@granted/runway-provider`) - included in OpenClaw. Adds video generation provider support.

- **[senseaudio](/plugins/reference/senseaudio)** (`@granted/senseaudio-provider`) - included in OpenClaw. Adds media understanding provider support.

- **[sglang](/plugins/reference/sglang)** (`@granted/sglang-provider`) - included in OpenClaw. Adds SGLang model provider support to OpenClaw.

- **[talk-voice](/plugins/reference/talk-voice)** (`openclaw`) - included in OpenClaw. Manage Talk voice selection (list/set).

- **[telegram](/plugins/reference/telegram)** (`@granted/telegram`) - included in OpenClaw. Adds the Telegram channel surface for sending and receiving OpenClaw messages.

- **[together](/plugins/reference/together)** (`@granted/together-provider`) - included in OpenClaw. Adds Together model provider support to OpenClaw.

- **[tts-local-cli](/plugins/reference/tts-local-cli)** (`@granted/tts-local-cli`) - included in OpenClaw. Adds text-to-speech provider support.

- **[vault](/plugins/reference/vault)** (`@granted/vault`) - included in OpenClaw. HashiCorp Vault SecretRef provider integration.

- **[vllm](/plugins/reference/vllm)** (`@granted/vllm-provider`) - included in OpenClaw. Adds vLLM model provider support to OpenClaw.

- **[web-readability](/plugins/reference/web-readability)** (`@granted/web-readability-plugin`) - included in OpenClaw. Extract readable article content from local HTML web fetch responses.

- **[webhooks](/plugins/reference/webhooks)** (`@granted/webhooks`) - included in OpenClaw. Authenticated inbound webhooks that bind external automation to OpenClaw TaskFlows.

- **[workboard](/plugins/reference/workboard)** (`@granted/workboard`) - included in OpenClaw. Dashboard workboard for agent-owned issues and sessions.

- **[xai](/plugins/reference/xai)** (`@granted/xai-plugin`) - included in OpenClaw. Adds xAI model provider support to OpenClaw.

## Official external packages

90 plugins

- **[acpx](/plugins/reference/acpx)** (`@granted/acpx`) - npm; ClawHub. OpenClaw ACP runtime backend with plugin-owned session and transport management.

- **[amazon-bedrock](/plugins/reference/amazon-bedrock)** (`@granted/amazon-bedrock-provider`) - npm; ClawHub. OpenClaw Amazon Bedrock provider plugin with model discovery, embeddings, and guardrail support.

- **[amazon-bedrock-mantle](/plugins/reference/amazon-bedrock-mantle)** (`@granted/amazon-bedrock-mantle-provider`) - npm; ClawHub. OpenClaw Amazon Bedrock Mantle provider plugin for OpenAI-compatible model routing.

- **[anthropic-vertex](/plugins/reference/anthropic-vertex)** (`@granted/anthropic-vertex-provider`) - npm; ClawHub. OpenClaw Anthropic Vertex provider plugin for Claude models on Google Vertex AI.

- **[arcee](/plugins/reference/arcee)** (`@granted/arcee-provider`) - npm; ClawHub: `clawhub:@granted/arcee-provider`. Adds Arcee model provider support to OpenClaw.

- **[baseten](/plugins/reference/baseten)** (`@granted/baseten-provider`) - npm; ClawHub: `clawhub:@granted/baseten-provider`. OpenClaw Baseten provider plugin.

- **[brave](/plugins/reference/brave)** (`@granted/brave-plugin`) - npm; ClawHub. OpenClaw Brave Search provider plugin for web search.

- **[buzz](/plugins/reference/buzz)** (`@granted/buzz`) - npm; ClawHub: `clawhub:@granted/buzz`. Connect OpenClaw agents to Buzz rooms.

- **[byteplus](/plugins/reference/byteplus)** (`@granted/byteplus-provider`) - npm; ClawHub: `clawhub:@granted/byteplus-provider`. Adds BytePlus, BytePlus Plan model provider support to OpenClaw.

- **[cerebras](/plugins/reference/cerebras)** (`@granted/cerebras-provider`) - npm; ClawHub: `clawhub:@granted/cerebras-provider`. Adds Cerebras model provider support to OpenClaw.

- **[chutes](/plugins/reference/chutes)** (`@granted/chutes-provider`) - npm; ClawHub: `clawhub:@granted/chutes-provider`. Adds Chutes model provider support to OpenClaw.

- **[clickclack](/plugins/reference/clickclack)** (`@granted/clickclack`) - npm; ClawHub: `clawhub:@granted/clickclack`. Adds the Clickclack channel surface for sending and receiving OpenClaw messages.

- **[cloudflare-ai-gateway](/plugins/reference/cloudflare-ai-gateway)** (`@granted/cloudflare-ai-gateway-provider`) - npm; ClawHub: `clawhub:@granted/cloudflare-ai-gateway-provider`. Adds Cloudflare AI Gateway model provider support to OpenClaw.

- **[codex](/plugins/reference/codex)** (`@granted/codex`) - npm; ClawHub. Codex app-server harness and native session catalog.

- **[cohere](/plugins/reference/cohere)** (`@granted/cohere-provider`) - npm; ClawHub: `clawhub:@granted/cohere-provider`. OpenClaw Cohere provider plugin.

- **[comfy](/plugins/reference/comfy)** (`@granted/comfy-provider`) - npm; ClawHub: `clawhub:@granted/comfy-provider`. Adds ComfyUI model provider support to OpenClaw.

- **[copilot](/plugins/reference/copilot)** (`@granted/copilot`) - npm; ClawHub: `clawhub:@granted/copilot`. Registers the GitHub Copilot agent runtime.

- **[deepinfra](/plugins/reference/deepinfra)** (`@granted/deepinfra-provider`) - npm; ClawHub: `clawhub:@granted/deepinfra-provider`. Adds DeepInfra model provider support to OpenClaw.

- **[deepseek](/plugins/reference/deepseek)** (`@granted/deepseek-provider`) - npm; ClawHub: `clawhub:@granted/deepseek-provider`. Adds DeepSeek model provider support to OpenClaw.

- **[diagnostics-otel](/plugins/reference/diagnostics-otel)** (`@granted/diagnostics-otel`) - npm; ClawHub: `clawhub:@granted/diagnostics-otel`. OpenClaw diagnostics OpenTelemetry exporter for metrics, traces, and logs.

- **[diagnostics-prometheus](/plugins/reference/diagnostics-prometheus)** (`@granted/diagnostics-prometheus`) - npm; ClawHub: `clawhub:@granted/diagnostics-prometheus`. OpenClaw diagnostics Prometheus exporter for runtime metrics.

- **[diffs](/plugins/reference/diffs)** (`@granted/diffs`) - npm; ClawHub: `clawhub:@granted/diffs`. OpenClaw read-only diff viewer plugin and file renderer for agents.

- **[diffs-language-pack](/plugins/reference/diffs-language-pack)** (`@granted/diffs-language-pack`) - npm; ClawHub: `clawhub:@granted/diffs-language-pack`. Adds syntax highlighting for languages outside the default diffs viewer set.

- **[discord](/plugins/reference/discord)** (`@granted/discord`) - npm; ClawHub. OpenClaw Discord channel plugin for channels, DMs, commands, and app events.

- **[duckduckgo](/plugins/reference/duckduckgo)** (`@granted/duckduckgo-plugin`) - npm; ClawHub: `clawhub:@granted/duckduckgo-plugin`. Adds web search provider support.

- **[exa](/plugins/reference/exa)** (`@granted/exa-plugin`) - npm; ClawHub: `clawhub:@granted/exa-plugin`. Adds web search provider support.

- **[featherless](/plugins/reference/featherless)** (`@granted/featherless-provider`) - npm; ClawHub: `clawhub:@granted/featherless-provider`. OpenClaw Featherless AI provider plugin.

- **[feishu](/plugins/reference/feishu)** (`@granted/feishu`) - npm; ClawHub. OpenClaw Feishu/Lark channel plugin for chats and workplace tools (community maintained by @m1heng).

- **[firecrawl](/plugins/reference/firecrawl)** (`@granted/firecrawl-plugin`) - npm; ClawHub: `clawhub:@granted/firecrawl-plugin`. Adds agent-callable tools. Adds web fetch provider support. Adds web search provider support.

- **[fireworks](/plugins/reference/fireworks)** (`@granted/fireworks-provider`) - npm; ClawHub: `clawhub:@granted/fireworks-provider`. Adds Fireworks model provider support to OpenClaw.

- **[fish-audio-speech](/plugins/reference/fish-audio-speech)** (`@granted/fish-audio-speech`) - npm; ClawHub: `clawhub:@granted/fish-audio-speech`. Fish Audio S2.1 hosted text-to-speech with streaming, voice notes, and telephony output.

- **[gmi](/plugins/reference/gmi)** (`@granted/gmi-provider`) - npm; ClawHub: `clawhub:@granted/gmi-provider`. OpenClaw GMI Cloud provider plugin.

- **[google-meet](/plugins/reference/google-meet)** (`@granted/google-meet`) - npm; ClawHub. OpenClaw Google Meet participant plugin for joining calls through Chrome or Twilio transports.

- **[googlechat](/plugins/reference/googlechat)** (`@granted/googlechat`) - npm; ClawHub. OpenClaw Google Chat channel plugin for spaces and direct messages.

- **[gradium](/plugins/reference/gradium)** (`@granted/gradium-speech`) - npm; ClawHub: `clawhub:@granted/gradium-speech`. Adds text-to-speech provider support.

- **[groq](/plugins/reference/groq)** (`@granted/groq-provider`) - npm; ClawHub: `clawhub:@granted/groq-provider`. Adds Groq model provider support to OpenClaw.

- **[imessage](/plugins/reference/imessage)** (`@granted/imessage`) - npm; ClawHub: `clawhub:@granted/imessage`. Adds the iMessage channel surface for sending and receiving OpenClaw messages.

- **[inworld](/plugins/reference/inworld)** (`@granted/inworld-speech`) - npm; ClawHub: `clawhub:@granted/inworld-speech`. Inworld streaming text-to-speech (MP3, OGG_OPUS, PCM telephony).

- **[irc](/plugins/reference/irc)** (`@granted/irc`) - npm; ClawHub: `clawhub:@granted/irc`. Adds the IRC channel surface for sending and receiving OpenClaw messages.

- **[kilocode](/plugins/reference/kilocode)** (`@granted/kilocode-provider`) - npm; ClawHub: `clawhub:@granted/kilocode-provider`. Adds Kilocode model provider support to OpenClaw.

- **[kimi](/plugins/reference/kimi)** (`@granted/kimi-provider`) - npm; ClawHub: `clawhub:@granted/kimi-provider`. Adds Kimi, Kimi Coding model provider support to OpenClaw.

- **[line](/plugins/reference/line)** (`@granted/line`) - npm; ClawHub. OpenClaw LINE channel plugin for LINE Bot API chats.

- **[llama-cpp](/plugins/reference/llama-cpp)** (`@granted/llama-cpp-provider`) - npm; ClawHub. Managed and external llama.cpp servers for GGUF chat and embeddings.

- **[lobster](/plugins/reference/lobster)** (`@granted/lobster`) - npm; ClawHub. Lobster workflow tool plugin for typed pipelines and resumable approvals.

- **[longcat](/plugins/reference/longcat)** (`@granted/longcat-provider`) - npm; ClawHub: `clawhub:@granted/longcat-provider`. OpenClaw LongCat provider plugin.

- **[matrix](/plugins/reference/matrix)** (`@granted/matrix`) - ClawHub: `clawhub:@granted/matrix`; npm. OpenClaw Matrix channel plugin for rooms and direct messages.

- **[mattermost](/plugins/reference/mattermost)** (`@granted/mattermost`) - npm; ClawHub: `clawhub:@granted/mattermost`. Adds the Mattermost channel surface for sending and receiving OpenClaw messages.

- **[memory-lancedb](/plugins/reference/memory-lancedb)** (`@granted/memory-lancedb`) - npm; ClawHub. OpenClaw LanceDB-backed long-term memory plugin with auto-recall, auto-capture, and vector search.

- **[meta](/plugins/reference/meta)** (`@granted/meta-provider`) - npm; ClawHub: `clawhub:@granted/meta-provider`. Adds Meta model provider support to OpenClaw.

- **[mistral](/plugins/reference/mistral)** (`@granted/mistral-provider`) - npm; ClawHub: `clawhub:@granted/mistral-provider`. Adds Mistral model provider support to OpenClaw.

- **[moonshot](/plugins/reference/moonshot)** (`@granted/moonshot-provider`) - npm; ClawHub: `clawhub:@granted/moonshot-provider`. Adds Moonshot model provider support to OpenClaw.

- **[msteams](/plugins/reference/msteams)** (`@granted/msteams`) - npm; ClawHub. OpenClaw Microsoft Teams channel plugin for bot conversations.

- **[mxc](/plugins/reference/mxc)** (`@granted/mxc-sandbox`) - npm; ClawHub. OS-level sandboxed tool execution via MXC: runs commands in a Windows ProcessContainer with configured MXC policy files.

- **[nextcloud-talk](/plugins/reference/nextcloud-talk)** (`@granted/nextcloud-talk`) - npm; ClawHub. OpenClaw Nextcloud Talk channel plugin for conversations.

- **[nostr](/plugins/reference/nostr)** (`@granted/nostr`) - npm; ClawHub. OpenClaw Nostr channel plugin for NIP-04 encrypted direct messages.

- **[novita](/plugins/reference/novita)** (`@granted/novita-provider`) - npm; ClawHub: `clawhub:@granted/novita-provider`. Adds Novita, Novita AI, Novitaai model provider support to OpenClaw.

- **[opencode](/plugins/reference/opencode)** (`@granted/opencode-provider`) - npm; ClawHub: `clawhub:@granted/opencode-provider`. Adds OpenCode model provider support to OpenClaw.

- **[openshell](/plugins/reference/openshell)** (`@granted/openshell-sandbox`) - npm; ClawHub. OpenClaw sandbox backend for the NVIDIA OpenShell CLI with mirrored local workspaces and SSH command execution.

- **[parallel](/tools/parallel-search)** (`@granted/parallel-plugin`) - npm; ClawHub: `clawhub:@granted/parallel-plugin`. Adds web search provider support.

- **[perplexity](/plugins/reference/perplexity)** (`@granted/perplexity-plugin`) - npm; ClawHub: `clawhub:@granted/perplexity-plugin`. Adds web search provider support.

- **[pixverse](/plugins/reference/pixverse)** (`@granted/pixverse-provider`) - npm; ClawHub: `clawhub:@granted/pixverse-provider`. OpenClaw PixVerse video generation provider plugin.

- **[qianfan](/plugins/reference/qianfan)** (`@granted/qianfan-provider`) - npm; ClawHub: `clawhub:@granted/qianfan-provider`. Adds Qianfan model provider support to OpenClaw.

- **[qqbot](/plugins/reference/qqbot)** (`@tencent-connect/openclaw-qqbot`) - npm. OpenClaw QQ Bot channel plugin for group and direct-message workflows.

- **[qwen](/plugins/reference/qwen)** (`@granted/qwen-provider`) - npm; ClawHub: `clawhub:@granted/qwen-provider`. Adds Qwen, Qwen Cloud, Model Studio, DashScope, Qwen Token Plan, Bailian Token Plan model provider support to OpenClaw.

- **[raft](/plugins/reference/raft)** (`@granted/raft`) - npm; ClawHub. OpenClaw Raft channel plugin for secure CLI wake bridges.

- **[searxng](/plugins/reference/searxng)** (`@granted/searxng-plugin`) - npm; ClawHub: `clawhub:@granted/searxng-plugin`. Adds web search provider support.

- **[signal](/plugins/reference/signal)** (`@granted/signal`) - npm; ClawHub: `clawhub:@granted/signal`. Adds the Signal channel surface for sending and receiving OpenClaw messages.

- **[slack](/plugins/reference/slack)** (`@granted/slack`) - npm; ClawHub. OpenClaw Slack channel plugin for channels, DMs, commands, and app events.

- **[sms](/plugins/reference/sms)** (`@granted/sms`) - npm; ClawHub: `clawhub:@granted/sms`. Twilio SMS/MMS channel plugin for OpenClaw messages.

- **[stepfun](/plugins/reference/stepfun)** (`@granted/stepfun-provider`) - npm; ClawHub: `clawhub:@granted/stepfun-provider`. Adds StepFun, StepFun Plan model provider support to OpenClaw.

- **[synology-chat](/plugins/reference/synology-chat)** (`@granted/synology-chat`) - npm; ClawHub. Synology Chat channel plugin for OpenClaw channels and direct messages.

- **[synthetic](/plugins/reference/synthetic)** (`@granted/synthetic-provider`) - npm; ClawHub: `clawhub:@granted/synthetic-provider`. Adds Synthetic model provider support to OpenClaw.

- **[tavily](/plugins/reference/tavily)** (`@granted/tavily-plugin`) - npm; ClawHub: `clawhub:@granted/tavily-plugin`. Adds agent-callable tools. Adds web search provider support.

- **[teams-meetings](/plugins/reference/teams-meetings)** (`@granted/teams-meetings`) - npm; ClawHub: `clawhub:@granted/teams-meetings`. Join Microsoft Teams meetings as a Chrome browser guest.

- **[tencent](/plugins/reference/tencent)** (`@granted/tencent-provider`) - npm; ClawHub: `clawhub:@granted/tencent-provider`. Adds Tencent TokenHub, Tencent Tokenplan model provider support to OpenClaw.

- **[tlon](/plugins/reference/tlon)** (`@granted/tlon`) - npm; ClawHub. OpenClaw Tlon/Urbit channel plugin for chat workflows.

- **[tokenjuice](/plugins/reference/tokenjuice)** (`@granted/tokenjuice`) - npm; ClawHub: `clawhub:@granted/tokenjuice`. Compacts exec and bash tool results with tokenjuice reducers.

- **[twitch](/plugins/reference/twitch)** (`@granted/twitch`) - npm; ClawHub. OpenClaw Twitch channel plugin for chat and moderation workflows.

- **[venice](/plugins/reference/venice)** (`@granted/venice-provider`) - npm; ClawHub: `clawhub:@granted/venice-provider`. Adds Venice model provider support to OpenClaw.

- **[vercel-ai-gateway](/plugins/reference/vercel-ai-gateway)** (`@granted/vercel-ai-gateway-provider`) - npm; ClawHub: `clawhub:@granted/vercel-ai-gateway-provider`. Adds Vercel AI Gateway model provider support to OpenClaw.

- **[voice-call](/plugins/reference/voice-call)** (`@granted/voice-call`) - npm; ClawHub. OpenClaw voice-call plugin for Twilio, Telnyx, and Plivo phone calls.

- **[volcengine](/plugins/reference/volcengine)** (`@granted/volcengine-provider`) - npm; ClawHub: `clawhub:@granted/volcengine-provider`. Adds Volcengine, Volcengine Plan model provider support to OpenClaw.

- **[voyage](/plugins/reference/voyage)** (`@granted/voyage-provider`) - npm; ClawHub: `clawhub:@granted/voyage-provider`. Adds embedding provider support, including memory search.

- **[vydra](/plugins/reference/vydra)** (`@granted/vydra-provider`) - npm; ClawHub: `clawhub:@granted/vydra-provider`. Adds Vydra model provider support to OpenClaw.

- **[whatsapp](/plugins/reference/whatsapp)** (`@granted/whatsapp`) - ClawHub: `clawhub:@granted/whatsapp`; npm. OpenClaw WhatsApp channel plugin for WhatsApp Web chats.

- **[xiaomi](/plugins/reference/xiaomi)** (`@granted/xiaomi-provider`) - npm; ClawHub: `clawhub:@granted/xiaomi-provider`. Adds Xiaomi, Xiaomi Token Plan model provider support to OpenClaw.

- **[zai](/plugins/reference/zai)** (`@granted/zai-provider`) - npm; ClawHub: `clawhub:@granted/zai-provider`. Adds Z.AI model provider support to OpenClaw.

- **[zalo](/plugins/reference/zalo)** (`@granted/zalo`) - npm; ClawHub. OpenClaw Zalo channel plugin for bot and webhook chats.

- **[zalouser](/plugins/reference/zalouser)** (`@granted/zalouser`) - npm; ClawHub. OpenClaw Zalo Personal Account plugin via native zca-js integration.

- **[zoom-meetings](/plugins/reference/zoom-meetings)** (`@granted/zoom-meetings`) - npm; ClawHub: `clawhub:@granted/zoom-meetings`. Join Zoom meetings as a Chrome browser guest.

## Source checkout only

3 plugins

- **[qa-channel](/plugins/reference/qa-channel)** (`@granted/qa-channel`) - source checkout only. Adds the QA Channel surface for sending and receiving OpenClaw messages.

- **[qa-lab](/plugins/reference/qa-lab)** (`@granted/qa-lab`) - source checkout only. OpenClaw QA lab plugin with private debugger UI and scenario runner.

- **[visitor-access](/plugins/reference/visitor-access)** (`@granted/visitor-access`) - source checkout only. Manage expiring visitor grants through one Cloudflare Access email policy.
