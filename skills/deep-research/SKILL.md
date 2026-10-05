---
name: deep-research
description: "Research a question across sources and produce a cited report; every claim traceable to a page actually fetched."
prompt-listing: search
metadata:
  {
    "openclaw":
      {
        "emoji": "🔍",
        "tags":
          [
            "research",
            "web search",
            "sources",
            "citations",
            "comparison",
            "market research",
            "literature review",
            "due diligence",
            "fact checking",
          ],
      },
  }
---

# Deep Research

Answer a question that needs several sources, and hand back a report where every
claim points at a page that was actually fetched in this run.

The failure mode this exists to prevent is a confident report assembled from
memory with plausible-looking citations attached afterwards. A model knows a
great deal about the world and almost none of it with a date on it. So the rule
here is the same one the rest of Granted runs on: **a claim with no fetched
source is not a finding — it is a guess, and it gets labelled as one.**

## When to Use

- "Research X and tell me what you find."
- "Compare these options and recommend one."
- "What is the current state of Y?"
- "Is this claim true?"
- Any question where being out of date or wrong would cost the user something.

Don't use for: a fact the user can check faster themselves, anything answerable
from the repository or their own files (read those directly), or writing up
research already done (that is just writing).

## Procedure

### 1. Fix the question and the budget

Restate the question in one sentence and get it confirmed if it is ambiguous.
Decide before searching: how many sources is enough, and what would change the
answer. Write both down.

A question like "is this library maintained?" needs three sources and ten
minutes. "Which vendor should we sign with?" needs a dozen and an hour. Deciding
afterwards is how research runs forever.

Done when the question is one sentence and the budget is a number.

### 2. Plan the threads

Break the question into 3-6 sub-questions that could each be answered
separately. State them. These are what you search for — searching the whole
question at once returns summaries of summaries.

For a comparison, one thread per option plus one for how others chose.
For a state-of-the-art question, one for the current consensus and one
deliberately looking for who disagrees.

Done when the sub-questions are listed and visibly cover the question.

### 3. Search and fetch

For each thread: `web_search` to find candidates, then `web_fetch` to read the
ones worth reading. **Searching is not reading.** A search result snippet is an
advertisement for a page, not evidence from it; never cite one.

Prefer, in order: primary sources (the spec, the filing, the repository, the
paper), the organisation's own current documentation, then reporting that names
its sources. Treat undated pages as undated — say so rather than assuming
recency.

Fetch at least two independent sources for any claim that matters. Two pages
that both copy the same press release are one source.

Done when every thread has been searched and its best candidates fetched.

### 4. Separate what you found from what you knew

Sort every statement you intend to make into:

- **Found** — a page fetched in this run supports it. Keep the URL.
- **Known** — you believe it, nothing fetched here supports it.
- **Contested** — sources disagree. Keep both URLs.

This is the step that does the work. Do it explicitly, as a list, before
writing anything. Anything that cannot be sorted does not go in the report.

Done when every intended claim sits in exactly one bucket.

### 5. Look for the disconfirming source

Spend at least one search trying to find out why the emerging answer is wrong.
If the first five sources agree, that is as likely to be one source repeated
five times as it is a consensus.

Record what you looked for and whether you found it. "Searched for criticism of
X, found none in five results" is itself a finding worth reporting.

Done when a deliberate attempt to break the answer has been made and recorded.

### 6. Report

Structure:

1. **Answer** — two or three sentences. The actual answer, not a preamble.
2. **What the sources say** — the findings, each with its link.
3. **What I could not establish** — the Known and Contested buckets, plainly
   labelled. Do not quietly drop them; a gap the user knows about is useful and
   a gap they discover later is not.
4. **Sources** — every page fetched, with its date where the page states one.

Mark Known claims inline as unverified. Never present one as a finding, and
never attach a citation to a claim the citation does not actually support.

Done when a reader can check any claim by following one link.

## Reporting Rules

- Cite only pages fetched in this run.
- A paywalled or failed fetch is a failed fetch. Say so; do not substitute what
  you remember the page says.
- If the budget runs out before the question is answered, report what was found
  and say what is still open. A partial answer that is honest about its edges is
  worth more than a complete-looking one that is not.
- Quote exactly when the wording matters; paraphrase otherwise, and never
  paraphrase a number.
- If the answer turns on something the user knows and you do not, stop and ask
  rather than researching around it.
