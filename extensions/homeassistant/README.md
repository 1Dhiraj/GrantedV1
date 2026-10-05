# Home Assistant plugin

Gives the agent one `homeassistant` tool for reading and controlling a Home
Assistant install over its REST API.

## Setup

Create a long-lived access token in Home Assistant (profile → Security → Long-lived
access tokens), then either set environment variables on the gateway:

```bash
export HASS_URL="http://homeassistant.local:8123"
export HASS_TOKEN="<long-lived token>"
```

or configure the plugin:

```json5
{
  plugins: {
    entries: {
      homeassistant: {
        enabled: true,
        config: {
          url: "http://homeassistant.local:8123",
          token: { env: "HASS_TOKEN" },
          timeoutSeconds: 15,
          maxEntities: 200,
        },
      },
    },
  },
}
```

## Actions

| Action          | Arguments                                  | Returns                                                        |
| --------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `list_entities` | `domain?`, `area?`                         | Entity ids, states and friendly names, capped at `maxEntities` |
| `get_state`     | `entity_id`                                | That entity's full state                                       |
| `call_service`  | `domain`, `service`, `entity_id?`, `data?` | The states Home Assistant reports as changed                   |
| `list_services` | `domain?`                                  | Service domains and their service names                        |

Hermes exposed these as four tools (`ha_list_entities`, `ha_get_state`,
`ha_call_service`, `ha_list_services`); here they are one tool with an `action`,
which keeps four schemas out of every prompt.

## What the agent cannot do

Home Assistant has no service-level access control: a token that can switch a lamp
can also call services that run shell commands on the host. The plugin therefore
holds the safety boundary itself.

- **The instance address is operator-owned.** `url` comes from config or the
  environment, never from the model, so the tool cannot be aimed at another host.
- **Names are pattern-checked.** Entity ids must look like `domain.object_id`, and
  domain and service names may only contain lowercase letters, digits and
  underscores — nothing that could walk out of `/api/services/{domain}/{service}`
  into another endpoint.
- **Execution domains are refused:** `shell_command`, `command_line`,
  `python_script`, `pyscript`, `hassio` and `rest_command`. They appear in
  `list_services` marked `blocked: true` so the agent does not plan a call that
  will be refused. If one of them is genuinely needed, the operator runs it.
- **The token never appears in output,** including in connection errors.

## Status

Ported from Hermes Agent's `homeassistant_tool.py`, including its validation rules
and blocked-domain list. The client is covered by unit tests against a fake
transport; it has not yet been exercised against a live Home Assistant instance.
