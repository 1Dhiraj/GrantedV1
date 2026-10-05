---
name: peer-review
description: "Re-check completed work as a skeptic before reporting it done: verify the effect, find what was skipped, give a verdict."
prompt-listing: search
metadata:
  {
    "openclaw":
      {
        "emoji": "🔬",
        "tags":
          [
            "review",
            "critic",
            "verification",
            "quality",
            "self-check",
            "audit",
            "double check",
            "before reporting done",
          ],
      },
  }
---

# Peer Review

Take a piece of finished work and try to find what is wrong with it, before the
user does.

This is deliberately a separate pass. The run that did the work is the worst
judge of it: it already believes the plan was good, it remembers intending each
step, and intending a step feels almost exactly like having done one. A reviewer
who starts from "this is probably wrong, where?" finds things the author cannot.

The question is never "does this look right?" It is **"what would I have to go
and look at to know?"** — and then going and looking.

## When to Use

- Before reporting a multi-step task complete.
- After any run where something was retried, recovered, or worked around.
- When the user asks "are you sure?" or "did that actually work?"
- Before anything irreversible: sending, publishing, deleting, paying.
- When a subagent reports success and nothing has checked it.

Don't use for: trivial single-step work whose result is already visible in the
reply, or code review specifically (`github-code-review` and
`requesting-code-review` are better shaped for that).

## Procedure

### 1. Recover the actual goal

Read back what the user asked for, in their words, not the restatement the work
has been running on. Goals drift: a request to "clean up the config" becomes
"delete the stale keys" becomes "delete three keys I was confident about."

Write the original ask and the delivered scope side by side.

Done when any narrowing between the two is named explicitly.

### 2. Check the effect, not the report

For each claimed step, find the evidence outside the conversation:

| Claim                              | What to look at                                       |
| ---------------------------------- | ----------------------------------------------------- |
| wrote/edited a file                | read it back, check the content is what was intended  |
| ran a command                      | the exit code and output, not the intention to run it |
| created a job, config, or schedule | list it from the system that owns it                  |
| sent a message                     | the send result, not the composed text                |
| fixed a bug                        | the failing case, re-run                              |
| installed something                | ask the thing whether it is there                     |

A step with no evidence available is **unverified**, which is a distinct result
from passed or failed and gets reported as its own thing.

Done when every claimed step is marked verified, unverified, or failed.

### 3. Hunt for the silent skip

The dangerous failure is not the step that errored — that one is visible. It is
the step that was quietly dropped, or satisfied in name only.

Ask specifically:

- Was anything in the request not addressed at all?
- Did a retry or fallback change what was actually produced?
- Did a step "succeed" by writing a placeholder, an empty result, or a default?
- Did a loop exit early on a budget, a timeout, or a cap?
- Was an error caught and swallowed somewhere along the way?

A timeout that wrote fallback content and logged nothing looks exactly like
success from the inside. Look for that shape on purpose.

Done when each question has an answer backed by something you checked.

### 4. Check the blast radius

Confirm nothing was touched that should not have been. List what changed, and
for anything outside the requested scope, say why it changed.

Done when the set of changes is known and each one is accounted for.

### 5. Give a verdict

One of exactly these, with no softening:

- **Done** — every step verified, scope matches the request.
- **Done with gaps** — the goal is met; these specific things are unverified.
- **Not done** — the goal is not met. Say what is missing.
- **Cannot tell** — verification was not possible. Say what would make it
  possible.

Then list the defects, worst first, each with what you checked and what you
found.

Done when the verdict is one of the four and the defects are specific enough to
act on.

## Reporting Rules

- Report what you checked, not what you assume. "I read the file back and it
  contains X" beats "the file was written correctly."
- "Unverified" is a real verdict and is not a failure. Pretending it is verified
  is the failure.
- Never upgrade a verdict because the work was difficult or nearly right.
- Finding nothing wrong is a legitimate outcome — but only report it after
  actually looking. A review that always passes is not a review.
- If reviewing your own work, state that. A self-review is weaker evidence than
  an independent one and the user should know which they are getting.
