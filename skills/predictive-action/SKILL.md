---
name: predictive-action
description: "Prepare work before it is asked for — drafts, gathered context, pre-flight for a meeting — without acting on the user's behalf."
prompt-listing: search
metadata:
  {
    "openclaw":
      {
        "emoji": "🔮",
        "tags":
          [
            "proactive",
            "anticipate",
            "pre-draft",
            "pre-flight",
            "preparation",
            "heartbeat",
            "ahead of time",
          ],
      },
  }
---

# Predictive Action

Do the preparation for something the user is about to need, so it is ready when
they get there.

There is one line that makes this useful instead of alarming, and it is sharp:
**prepare, never commit.** Draft the reply, do not send it. Open the documents,
do not edit them. Gather the numbers, do not act on them. Everything this skill
produces must be something the user can ignore at no cost.

An assistant that guesses wrong and prepared something is mildly wasteful. One
that guesses wrong and _did_ something has to be supervised forever, which is
the opposite of the point.

## When to Use

- A heartbeat or scheduled tick, which is the main path.
- A known event is approaching: a meeting, a deadline, a recurring task.
- A long task just finished and an obvious next step follows.
- The user is partway through something they do regularly.

Don't use for: anything irreversible, anything that reaches another person,
anything costing money, or guessing at a task with no concrete signal. No signal
means do nothing — doing nothing is the correct and common outcome.

## Procedure

### 1. Find a real signal

A prediction needs something concrete to stand on:

| Signal                 | What it supports preparing              |
| ---------------------- | --------------------------------------- |
| calendar event soon    | the documents, notes, and links for it  |
| recurring task due     | last run's output and this run's inputs |
| long job just finished | the summary, the obvious next step      |
| deadline approaching   | current state versus what is required   |
| recorded preference    | the format the user always wants        |

A vague sense that the user "might want" something is not a signal. If you
cannot name the signal in one sentence, stop here. Stopping is the default.

Done when the signal is named, or the run ends with nothing done.

### 2. Decide what is genuinely useful

Ask what the user would otherwise spend the first ten minutes doing, and do that
part. Finding and opening the right four things is useful. Guessing their
opinion is not.

Prefer gathering over generating. A correct set of materials beats a draft built
on assumptions.

Done when the intended preparation is stated in one sentence.

### 3. Check the line

Before doing it, confirm all of these:

- Nothing is sent, published, committed, paid, or deleted.
- Nothing reaches another person.
- If the prediction is wrong, the user loses nothing but the ignoring of it.
- Nothing is overwritten — new material goes somewhere new.

If any fails, do not do it. Prepare the smaller version that passes, or nothing.

Done when all four hold.

### 4. Prepare it

Do the work. Keep it bounded — this is speculative, and a speculative task
should not consume the budget of a real one. Put the output somewhere the user
will find it, clearly marked as prepared ahead rather than requested.

Done when the material exists and is labelled.

### 5. Offer once, quietly

Tell the user what is ready, in one line, through whatever channel is least
interrupting. Then stop.

**Do not repeat it.** If the offer is ignored, that is an answer. An assistant
that nudges twice is one the user turns off, and an assistant that is turned off
prepares nothing at all.

Done when one notice has been sent.

### 6. Learn from being ignored

Note whether the preparation was used. Over time this is the only honest measure
of whether the prediction was any good.

If a kind of preparation is repeatedly ignored, stop doing that kind. Record it
(see `pattern-learning`). Being consistently unhelpful on a schedule is worse
than silence.

Done when the outcome is recorded.

## Reporting Rules

- Always say the work was prepared in advance, and on what signal. The user
  should never wonder why something appeared.
- Never imply the user asked for it.
- If the signal was a guess, say it was a guess.
- One notice per prepared item. Never a reminder about a notice.
- When in doubt, do nothing. The cost of a missed preparation is small and
  recoverable; the cost of an assistant that acts unbidden is trust, and that
  does not come back.
