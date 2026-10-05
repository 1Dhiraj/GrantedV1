# @granted/acpx

Official ACP runtime backend for Granted.

ACPx lets Granted run external coding harnesses through the Agent Client Protocol while Granted still owns sessions, channels, delivery, permissions, and Gateway state.

## Install

```bash
granted plugins install @granted/acpx
```

Restart the Gateway after installing or updating the plugin.

## What it provides

- ACP-backed agent runtime sessions.
- Plugin-owned session and transport management.
- MCP bridge helpers for Granted tools and plugin tools.
- Static runtime assets used by the ACP process bridge.

## Configure

Use the ACP docs for harness-specific setup, permission modes, and model/runtime selection:

- https://docs.openclaw.ai/tools/acp-agents-setup
- https://docs.openclaw.ai/tools/acp-agents

## Package

- Plugin id: `acpx`
- Package: `@granted/acpx`
- Minimum Granted host: `2026.4.25`
