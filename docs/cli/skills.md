---
summary: "CLI reference for `granted skills` (search/install/update/verify/list/info/check/library/workshop)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search ClawHub or install skills from ClawHub, Git, or local directories
  - You need to remove an installed ClawHub skill
  - You want to verify a ClawHub skill with ClawHub
  - You want to debug missing binaries/env/config for skills
title: "Skills"
---

# `granted skills`

Inspect local skills, search ClawHub, install skills from ClawHub/Git/local
directories, verify ClawHub skills, and update ClawHub-tracked installs.

Related:

- Skills system: [Skills](/tools/skills)
- Skill Workshop: [Skill Workshop](/tools/skill-workshop)
- Skills config: [Skills config](/tools/skills-config)
- ClawHub installs: [ClawHub](/clawhub/cli)

## Commands

```bash
granted skills search "calendar"
granted skills search --limit 20 --json
granted skills install @owner/<slug>
granted skills install @owner/<slug> --version <version>
granted skills install skills-sh:<owner>/<repo>/<slug>
granted skills install git:owner/repo
granted skills install git:owner/repo@main
granted skills install ./path/to/skill --as custom-name
granted skills install @owner/<slug> --force
granted skills install @owner/<slug> --force-install
granted skills install @owner/<slug> --acknowledge-install-policy-warning
granted skills install @owner/<slug> --agent <id>
granted skills install @owner/<slug> --global
granted skills update @owner/<slug>
granted skills update @owner/<slug> --force
granted skills update @owner/<slug> --force-install
granted skills update @owner/<slug> --acknowledge-install-policy-warning
granted skills update @owner/<slug> --global
granted skills update --all
granted skills update --all --agent <id>
granted skills update --all --global
granted skills verify @owner/<slug>
granted skills verify @owner/<slug> --json
granted skills verify @owner/<slug> --version <version>
granted skills verify @owner/<slug> --tag <tag>
granted skills verify @owner/<slug> --card
granted skills verify @owner/<slug> --global
granted skills list
granted skills list --eligible
granted skills list --json
granted skills list --verbose
granted skills list --agent <id>
granted skills info <name>
granted skills info <name> --json
granted skills info <name> --agent <id>
granted skills check
granted skills check --agent <id>
granted skills check --json
granted skills curator status
granted skills curator status --json
granted skills workshop propose-create --name "qa-check" --description "QA checklist" --proposal ./PROPOSAL.md
granted skills workshop propose-update qa-check --proposal ./PROPOSAL.md
granted skills workshop list
granted skills workshop inspect <proposal-id>
granted skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
granted skills workshop apply <proposal-id>
granted skills workshop reject <proposal-id> --reason "Not reusable"
granted skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`search`, `update`, and `verify` use ClawHub directly. `install @owner/<slug>`
installs a native ClawHub skill. `install skills-sh:<owner>/<repo>/<slug>` asks
ClawHub to resolve an external listing to its exact synchronized GitHub commit;
OpenClaw does not download from skills.sh. These entries are shown as
**Not scanned by ClawHub**, and that trust state is preserved through updates
and verification. Claimed or ClawHub-scanned skills use `@owner/<slug>`.
`install git:owner/repo[@ref]` clones an unmanaged Git skill, and `install
./path` copies a local skill directory. By default, `install`,
`update`, and `verify` target the active workspace `skills/` directory; with
`--global`, they target the shared managed skills directory. `list`/`info`/`check`
and bare `granted skills` request the selected Gateway's authoritative skill
inventory. A configured remote Gateway or an explicit `OPENCLAW_GATEWAY_URL`
never falls back to client-local skills: missing URLs, connection failures, and
authentication errors remain visible. Only an implicitly selected local Gateway
can fall back to local inventory when it is unavailable. Workspace-backed
commands resolve the target workspace from `--agent <id>`, then the current
working directory when it is inside a configured agent workspace, then the
default agent.

`check` reports missing prerequisites independently of agent exclusion: a skill
excluded by the agent allowlist can also appear under **Missing requirements**.
Disabled skills and skills blocked by the bundled allowlist keep their separate
readiness categories.

Curator `status`, `pin`, `unpin`, and `restore`, plus Workshop `apply`, preserve
the same target boundary. They never read or mutate client-local state after an
explicitly selected Gateway fails; intentional offline behavior remains
available only for an implicitly selected local Gateway.

Git and local directory installs expect `SKILL.md` at the source root. The
install slug comes from `SKILL.md` frontmatter `name` when it is valid, then
the source directory or repository name; use `--as <slug>` to override it.
`--version` is ClawHub-only. Skill installs do not support npm package specs
or zip/archive paths, and `granted skills update` updates ClawHub-tracked
installs only.

Gateway-backed skill dependency installs triggered from onboarding or Skills
settings use the separate `skills.install` request path instead.

When `security.installPolicy` returns `warn` in an interactive terminal,
OpenClaw prints the reason and findings, then asks `type: '<skill>' to install
anyway` (or `update anyway`). If the fully rendered review exceeds 4,000
characters, OpenClaw fails closed before prompting; reduce or coalesce the
policy output first. A matching answer evaluates the staged skill
again before continuing. Declined and non-interactive direct CLI commands stop
before commit; after review, `--acknowledge-install-policy-warning` is the
explicit noninteractive approval for every warning in that command invocation.
Every approved warning is re-evaluated before continuing. Automatic and managed
skill installs cannot use that flag themselves. Use an equivalent direct CLI
command when one exists; otherwise, change `security.installPolicy` to return
`allow` for the reviewed request, then retry the managed flow. Neither `--force`
nor the acknowledgement overrides `block` or a policy failure.

Notes:

| Flag/behavior                    | Description                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search [query...]`              | Optional query; omit it to browse the default ClawHub search feed.                                                                                                                                                                                                                                                                |
| `search --limit <n>`             | Caps returned results.                                                                                                                                                                                                                                                                                                            |
| `install git:owner/repo[@ref]`   | Installs a Git skill. Branch refs may contain slashes, such as `git:owner/repo@feature/foo`.                                                                                                                                                                                                                                      |
| `install ./path/to/skill`        | Installs a local directory whose root contains `SKILL.md`.                                                                                                                                                                                                                                                                        |
| `install --as <slug>`            | Overrides the inferred slug for Git and local directory installs.                                                                                                                                                                                                                                                                 |
| `install --version <version>`    | Applies to native ClawHub skill refs, not `skills-sh:` refs; the mirrored reference already identifies the exact synchronized commit.                                                                                                                                                                                             |
| `install --force`                | Overwrites an existing workspace skill folder for the same slug.                                                                                                                                                                                                                                                                  |
| `update --force`                 | Replaces a tracked skill even when its installed files no longer match recorded install digests. Without it, updates preserve local changes. Pre-digest installs require one forced update before later updates can be verified. Force those skills individually; `--all --force` also replaces skills with detected local edits. |
| `install/update --force-install` | Installs a pending GitHub-backed ClawHub skill before ClawHub's scan completes.                                                                                                                                                                                                                                                   |
| `--global`                       | Targets the shared managed skills directory; cannot combine with `--agent <id>`.                                                                                                                                                                                                                                                  |
| `--agent <id>`                   | Targets one configured agent workspace; overrides current working directory inference.                                                                                                                                                                                                                                            |
| `update @owner/<slug>`           | Updates a single tracked skill. Add `--global` to target the shared managed skills directory instead of the workspace.                                                                                                                                                                                                            |
| `update --all`                   | Updates tracked ClawHub installs in the selected workspace, or the shared managed skills directory with `--global`.                                                                                                                                                                                                               |
| `verify @owner/<slug>`           | Prints ClawHub's `clawhub.skill.verify.v1` JSON envelope by default. `--json` is accepted as the explicit machine-output spelling. Bare slugs are accepted for compatibility when the skill is already installed or unambiguous; owner-qualified refs avoid publisher ambiguity.                                                  |
| `verify` provenance              | When ClawHub returns server-resolved source provenance, verify JSON also includes a commit-pinned `openclaw.verifiedSourceUrl`. Unavailable or self-declared source URLs stay only in the raw provenance envelope and are not promoted.                                                                                           |
| `verify` version selector        | `verify` uses `.clawhub/origin.json` for installed ClawHub skills, so it verifies the installed version against the registry it came from. `--version` and `--tag` override the version selector but keep that installed registry when origin metadata exists.                                                                    |
| `verify --card`                  | Prints the generated Skill Card Markdown instead of JSON. Exits non-zero when ClawHub returns `ok: false` or `decision: "fail"`.                                                                                                                                                                                                  |
| Skill Card fingerprint           | Installed ClawHub bundles can include a generated `skill-card.md`. OpenClaw treats verification as a ClawHub server decision and does not reject an installed skill just because that generated card changes the bundle fingerprint.                                                                                              |
| `check --agent <id>`             | Checks the selected agent's workspace and reports which ready skills are actually visible to that agent's prompt or command surface.                                                                                                                                                                                              |
| `workshop --agent <id>`          | Accepted before or after a Workshop leaf command, for example `workshop --agent <id> list` or `workshop list --agent <id>`. If both are provided, the leaf value wins.                                                                                                                                                            |
| `curator --json`                 | Accepted before or after a Curator leaf command, for example `curator --json status` or `curator status --json`.                                                                                                                                                                                                                  |
| `list`                           | Default action when no subcommand is provided.                                                                                                                                                                                                                                                                                    |
| `list`/`info`/`check` output     | Rendered output goes to stdout. With `--json`, the machine-readable payload stays on stdout for pipes and scripts.                                                                                                                                                                                                                |
| `curator status --json`          | Reports live Workshop skill usage recorded from trusted `skill.used` events and the latest collection and experience review outcomes per workspace.                                                                                                                                                                               |
| `curator pin`/`unpin`/`restore`  | Retired commands remain registered but return an error explaining that weekly collection review manages the skill collection.                                                                                                                                                                                                     |

Community ClawHub skill installs and updates check trust before downloading.
Versioned community archive releases use exact-release trust metadata.
Resolver-backed GitHub skills rely on ClawHub's install resolver to enforce
scan and force-install policy before it returns a pinned commit; use
`--force-install` to install a pending GitHub-backed skill before that scan
completes. Malicious or blocked community releases are refused. Review
outcomes print the exact ClawHub audit overview and details link, then continue.
Official ClawHub skill publishers and bundled OpenClaw skill sources bypass
this release-trust check.

## Remove a ClawHub skill

Use the standalone ClawHub CLI to remove a ClawHub-tracked skill. If the CLI
is not installed, install it explicitly first:

```bash
npm i -g clawhub
clawhub uninstall @owner/my-skill
```

The CLI asks for confirmation before deleting the skill directory and its
`.clawhub/lock.json` entry. Use the installed skill's owner-qualified name or
bare slug, not its original `skills-sh:` reference.

Select the same root where the skill was installed: the agent workspace for an
agent-specific skill, or the OpenClaw state directory for a shared skill
installed with `--global`:

```bash
clawhub --workdir /path/to/agent-workspace uninstall @owner/my-skill
clawhub --workdir ~/.openclaw uninstall @owner/my-skill
```

If `OPENCLAW_STATE_DIR` is set, use that configured state directory for shared
skills instead:

```bash
clawhub --workdir "$OPENCLAW_STATE_DIR" uninstall @owner/my-skill
```

The default [skills watcher](/tools/skills#snapshots-and-refresh) picks up the
removal on the next agent turn. If watching is disabled, start a new session.

## Personal skill library

`granted skills library` manages the identified caller's skills on the selected
Gateway. It uses the same owner-aware service as the Control UI and agent
workflow; it never writes the library database or revision directories on the
CLI host.

```bash
granted skills library --help
```

List your library:

```bash
granted skills library list --scope mine --json
```

Create a private skill from a directory containing `SKILL.md`:

```bash
granted skills library create ./my-skill --slug my-skill
```

Read its stable ID and current revision before editing:

```bash
granted skills library read <skill-id> --json
```

Update only the instructions while preserving supporting files:

```bash
granted skills library update <skill-id> ./SKILL.md --expected-revision <revision-hash>
```

A directory input replaces the complete bundle. A single `SKILL.md` input
preserves the current supporting files; repeat `--delete-file <relative-path>`
to remove files explicitly. Updates compare the revision that was read; a
conflict requires reviewing the newer content, not a force overwrite.
Supporting files are part of the revision, including binary assets and
executable flags.

Import a ZIP privately:

```bash
granted skills library import ./my-skill.zip --slug my-skill
```

Import a ClawHub skill without publishing your library:

```bash
granted skills library import @owner/<slug> --clawhub --slug my-skill
```

`--version <version>` selects a ClawHub version and requires `--clawhub`.
`share`, `unshare`, `transfer`, `enable`, `disable`, `remove`, and `rollback`
take `<skill-id> --expected-revision <hash>`. Rollback also requires
`--revision <retained-hash>`.

Attach an exact revision to an existing session:

```bash
granted skills library attach --session <session-key> --skill-id <skill-id> --revision <revision-hash>
```

`detach` takes the same session and skill ID. Refresh one selected skill:

```bash
granted skills library refresh --session <session-key> --skill-id <skill-id>
```

Omitting `--skill-id` refreshes all selected skills and requires current library
access to each one. It never replaces the selection with the current caller's
library. Each operation reports its effect on the next turn.

Use `list --session <session-key>` to inspect selected revisions and the skills
you can attach, without changing the session. `read --session <session-key>`
also requires `--revision <hash>` and reads only that exact selected revision;
it does not expose other private revisions or grant permission to edit them.

Personal operations require an authenticated Gateway profile. A shared token
or password alone does not identify a person; use the existing workspace
commands when operating a solo Gateway without a profile. An explicitly
selected remote Gateway never falls back to a client-local personal library.

Sharing makes a skill available to teammates but does not grant edit access.
Transfer to team ownership requires administrator authority. Saving affects
new sessions by default; attach or refresh a selection explicitly for an
existing session. Removal preserves already selected revisions. See
[personal library ownership and revisions](/tools/skills#personal-skills-on-a-shared-gateway).

## Skill Workshop

`granted skills workshop` manages pending skill proposals in the selected
workspace. Proposals are not active skills until applied. For proposal
storage, support-file safeguards, Gateway methods, and approval policy, see
[Skill Workshop](/tools/skill-workshop).

```bash
granted skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal ./PROPOSAL.md
granted skills workshop propose-create \
  --name "qa-check" \
  --description "Repeatable QA checklist" \
  --proposal-dir ./qa-check-proposal
granted skills workshop propose-update qa-check --proposal ./PROPOSAL.md
granted skills workshop list
granted skills workshop inspect <proposal-id>
granted skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
granted skills workshop apply <proposal-id>
granted skills workshop reject <proposal-id> --reason "Duplicate"
granted skills workshop quarantine <proposal-id> --reason "Needs security review"
```

`propose-create`, `propose-update`, and `revise` also accept `--goal <text>`
and `--evidence <text>` to record the proposal's motivation and supporting
notes alongside the `--proposal`/`--proposal-dir` content.

## Related

- [CLI reference](/cli)
- [Skills](/tools/skills)
