What this project is
We are building Granted, a TypeScript-based computer-use agent intended to work toward your goal:
An affordable AI harness that can perform broad computer tasks like a human—using browsers, desktop apps, files, terminals, APIs and communication tools—with verification, recovery and cheaper models.

The source material is:

- Your 8–9 month fork: D:\Dhiraj\Startup_products\openclaw
- Latest upstream code: D:\Dhiraj\Startup_products\openclaw\openclaw
- Hermes Agent: D:\Dhiraj\Startup_products\openclaw\hermes-agent
- Combined target repository: D:\Dhiraj\Startup_products\granted
  We selected TypeScript as the final technology stack. Hermes is being used as a feature and architecture reference; the final product is not intended to depend on a Python bridge.
  What we have completed
  Core merge
  Granted currently uses the latest OpenClaw foundation as its base:
- TypeScript agent runtime
- Gateway and session system
- Plugin architecture
- Model/provider system
- Tool execution
- Memory and skills
- Scheduling and cron
- Multi-agent support
- Messaging channels
- Control UI
- Authentication and configuration
- Voice and media infrastructure
  Features ported from your older Granted fork
  We selectively brought over the strongest parts of your previous work:
- Desktop automation plugin
- Task routing
- Piper voice
- Kokoro voice
- Postcondition verification
- Agent honesty gates
- Self-healing behavior
- Unapplied-change detection
- Spend limits
- Economy-model routing
- Rate-limit fallback behavior
- Prompt-cache savings tracking
- Expressive Microsoft speech
- World Stage / living agent map UI
- Granted-specific lifecycle and launcher work
  Hermes-related work
  We created Hermes migration support that can import and translate supported Hermes state:
- Model configuration
- Provider configuration
- MCP server definitions
- Workspace files
- SOUL.md
- AGENTS.md
- Memory files
- Skills
- Skill configuration
- Supported authentication credentials
- Relevant environment settings
- Migration preview and backup behavior
- Unsupported Hermes state is archived for manual review instead of being blindly executed
  This means Hermes can contribute its useful configuration, skills and knowledge to Granted.
  However, migration support is not yet the same as complete Hermes runtime parity. That remains work to do.
  Computer-use reliability work
  We added an important reliability layer around computer actions:
- Computer-action effect detection
- Confirmed/suspected-no-op/unverifiable outcomes
- Post-action observation support
- Completion verification
- Bounded self-healing
- Failed-action recovery
- Protection against blind repeated retries
- Escalation recommendations when an action does not produce the expected result
- Diagnostics for action type, effect, route, delivery mode and escalation
  This is the foundation for the “write → run → verify → retry → remember” loop.
  Model and cost work
  Granted now includes:
- Economy-model routing for simpler work
- NVIDIA DeepSeek V4 Pro provider support
- Provider-level spending limits
- Global spending limits
- Rate-limit handling
- Provider fallback infrastructure
- Prompt-cache savings reporting
- Separation between full agent models and cheaper utility/economy models
  NVIDIA DeepSeek was tested for basic inference. It worked, but initial latency was high. We have not yet proven its performance on long computer tasks.
  UI
  The codebase contains management screens for:
- Chat
- Agents
- Tasks
- Workboard
- Providers
- Usage
- Skills
- Skill Workshop
- Memory import
- Cron
- Sessions
- Plugins
- Channels
- Devices
- Logs
- Configuration
- World Stage
- Wake-word/talk-mode behavior
  The UI exists in the repository, but the entire end-to-end product experience still needs systematic testing with a live backend.
  Branding and repository
  We changed the project’s own identity toward Granted:
- Package name
- CLI command
- Workspace scope
- Plugin manifests
- Main source identifiers
- UI product name
- Launcher lifecycle
- Configuration identity
- Current state directory and environment naming
  There is still cleanup remaining in inherited compatibility surfaces, documentation, filenames and legacy references.
  The repository setup includes:
- Development branch: main
- Clean publishing branch: publish
- GitHub repository: https://github.com/1Dhiraj/GrantedV1.git
- The publishing process was designed to keep the public repository focused on your Granted history instead of exposing the entire inherited upstream history.
  What is not complete yet

1. Complete Hermes feature parity
   We have imported Hermes-compatible data and ported selected ideas, but we have not yet completed a formal feature-by-feature comparison of:

- Hermes tools
- Hermes planning behavior
- Hermes memory behavior
- Hermes MCP lifecycle behavior
- Hermes skill behavior
- Hermes approval and safety behavior
- Hermes session handling
- Hermes terminal/browser workflows
- Hermes background-task behavior
- Hermes provider/model behavior
- Hermes trajectory and learning behavior
  We still need to decide for every capability whether to:
- Port it directly
- Rebuild it in native TypeScript
- Replace it with a stronger Granted implementation
- Exclude it intentionally because it is unsafe, redundant or not valuable

2. Broad computer-task reliability
   The reliability mechanisms exist, but we have not yet proven that Granted can consistently complete tasks such as:

- Multi-step browser workflows
- Filling forms
- Working across multiple browser tabs
- Desktop application interaction
- File organization
- Spreadsheet operations
- Terminal development tasks
- Research and summarization
- Email/calendar workflows
- Authentication and approval flows
- Long-running tasks
- Recovery after application changes
- Recovery after model mistakes
- Tasks requiring several applications together
  The biggest missing piece is a repeatable benchmark suite.

3. Cost and latency proof
   We added the mechanisms for cheaper execution, but we have not yet measured:

- Cost per successful task
- Cost including retries
- Cost of failed tasks
- NVIDIA latency by task type
- Cheap-model versus strong-model success rate
- When escalation to a stronger model is worthwhile
- Whether local models can handle simple tasks
- Whether the routing policy actually reduces total cost

4. Complete validation
   Targeted tests have passed for much of the recent work, but the complete release bar still needs to be established:

- Full typecheck
- Full build
- Full relevant test suite
- Formatting validation
- Plugin validation
- UI validation
- Install and upgrade validation
- Live model task validation
- Computer-use smoke tests
  Some earlier validation was blocked by:
- Mistral SDK type errors outside the recent changes
- Windows native formatting-tool restrictions
- Environment/resource limitations
- The risk of launching real Chrome during broad UI test runs
  The full UI browser suite must remain targeted because it launches real browser instances.

5. Full Granted branding cleanup
   The project’s own identity is mostly migrated, but there are still inherited references in places such as:

- Compatibility aliases
- Documentation
- Filenames
- Legacy migration code
- Historical configuration names
- Inherited notices and attribution
  Some legacy names must remain for compatibility or legal reasons. The upstream copyright attribution in the license must not be removed.

6. Product-level UI integration
   Individual screens exist, but we still need to verify that the UI correctly controls the combined backend for:

- Provider setup
- Agent creation
- Task creation
- Skill creation
- Model selection
- Cost limits
- Computer-use permissions
- Task history
- Recovery visibility
- Diagnostics
- Memory import
- Hermes migration
- Long-running task status
  What we are going to do next
  The remaining work should proceed in this order.
  Phase 1: Stabilize the current combined codebase
- Resolve typecheck/build blockers
- Finish the remaining identity cleanup
- Verify all recent computer-use changes
- Confirm the current branch and remote state
- Ensure the Granted repository can install and start cleanly
- Avoid broad browser tests that repeatedly launch Chrome
  Phase 2: Create the three-source feature matrix
  We will build a real inventory with columns like:
  Capability Older Granted Latest base Hermes Granted status Action
  Browser automation Yes Yes Yes Partially unified Strengthen
  Skills Yes Yes Yes Present Compare and improve
  MCP Yes Yes Yes Migration supported Validate parity
  Memory Yes Yes Yes Present/importable Unify
  Desktop control Yes Partial Yes Ported Benchmark
  Task recovery Custom Base Hermes ideas Granted-native Benchmark
  Cost routing Custom Partial Partial Added Measure

This will prevent us from assuming that “present somewhere” means “fully merged and working.”
Phase 3: Build the computer-task benchmark
We will start with a controlled task set:

- Browser navigation and form completion
- File creation and editing
- Terminal coding task
- Spreadsheet task
- Multi-application task
- Research task
- Email/calendar-style task
- Recovery after a failed action
- Recovery after a changed UI
- Permission-required task
  Every task will record:
- Success or failure
- Number of actions
- Number of retries
- Number of observations
- Model used
- Latency
- Token usage
- Estimated cost
- Escalations
- Safety/approval events
  Phase 4: Improve the execution loop
  The target loop is:
  Understand goal
  ↓
  Plan
  ↓
  Choose cheapest capable model
  ↓
  Act
  ↓
  Observe
  ↓
  Verify postcondition
  ↓
  Recover or continue
  ↓
  Record trajectory
  ↓
  Improve future execution
  The remaining work is to make this loop operate consistently across all tool types, not only computer actions.
  Phase 5: Native Hermes feature reconstruction
  After the feature matrix and benchmark expose gaps, we will rebuild the highest-value Hermes capabilities directly in TypeScript, especially:
- Better planning
- Stronger skill learning
- Task memory
- Trajectory-based improvement
- MCP lifecycle support
- Long-running task management
- Better approval and recovery flows
- Agent configuration/building
- Daily summaries and task follow-up
- More reliable background execution
  Phase 6: Cost optimization
  We will make model selection task-aware:
- Cheap local or hosted model for classification, extraction and simple actions
- NVIDIA DeepSeek for stronger reasoning when latency is acceptable
- Strong fallback only when the task is stuck or high-risk
- Deterministic tools for known operations
- Cached context and reusable skills
- Retry budgets
- Spend limits
- Early escalation when repeated actions are ineffective
  The important metric will be cost per successfully completed task, not only cost per API call.
  Phase 7: Product hardening
  Finally:
- Full install flow
- Upgrade/migration flow
- Provider onboarding
- Permission model
- Security review
- UI integration
- Telemetry and diagnostics
- Benchmark regression tests
- Release packaging
- GitHub publication
- Real user testing
  Current honest status
  The project is beyond a simple fork and has a substantial Granted foundation.
  The most accurate description is:
  Granted is currently a TypeScript agent platform combining the latest base runtime, selected capabilities from your older project, Hermes migration support, cost controls, and a new computer-action verification/recovery layer. It is not yet a fully proven general-purpose computer operator or a complete native Hermes replacement.

The next milestone should be:
A clean, installable Granted build that completes a measured set of real computer tasks with recorded success rate, latency, recovery behavior and cost.

Also, because an NVIDIA API credential was previously pasted in chat, it should be rotated if it was a real active key. The code should read the replacement from NVIDIA_API_KEY; the secret itself should not be committed to the repository.
