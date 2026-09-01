# 08 — BYOK AI Tutor (Decoupled)

## 1. What "decoupled" means

The tutor runs on the **user's own model API key**. Apex does not resell
inference and does not sit in the middle of the student's key.

| Property | Requirement |
|---|---|
| Key storage | Client-side only, in browser storage, encrypted at rest with a user-derived secret |
| Key transit | Never sent to the Apex backend. Never in a request body, header, query string, or log line to Apex origin |
| Server knowledge | The backend knows *that* a key is configured, never its value |
| Provider calls | Made from the client directly to the provider |
| Failure surface | Provider errors (quota, invalid key, rate limit) are shown to the student as their own, with a link to their provider dashboard |
| Revocation | Clearing the key in settings wipes local storage and disables the tutor immediately |

**Consequence to design around:** the client holds the key, so the client
assembles the tutor prompt. The Student Model slice the tutor sees is therefore
visible to the user in their own browser. Nothing confidential may be placed in
it — no internal scoring constants, no routing thresholds, no unreleased item
content. Ship the system prompt and the error-log slice, nothing more.

If a server-side proxy is later required (for providers that forbid browser-origin
calls), it must be **stateless and non-logging**: it forwards, it does not
persist, and that property needs to be testable in CI rather than asserted in a
privacy page.

## 2. When the tutor is available

| Mode | Tutor |
|---|---|
| Test Sim (in progress) | **Blocked** — architecturally unreachable |
| Test Sim (post-submission review) | Available |
| Targeted Practice (question open, unanswered) | **Blocked** |
| Targeted Practice (after answering) | Available |
| Review / error log | Available |
| Desmos Academy | Available |

The "after answering" gate is deliberate. A tutor available before submission
converts every question into a collaboration and destroys the calibration
signal — the certainty rating would measure the tutor's confidence, not the
student's.

## 2b. Implementation status

Built. The tutor calls `claude-opus-5` from the browser on the student's key,
with structured output validated against
[`schemas/tutor-turn.schema.json`](../schemas/tutor-turn.schema.json). The
system prompt is served from
[`prompts/socratic-tutor.system.md`](../prompts/socratic-tutor.system.md) at
request time, so editing the spec changes the running tutor.

Two properties are enforced in code rather than asked for in the prompt:

* **Availability** — the panel is rendered only inside the review state, which
  is unreachable until an answer is submitted. There is no flag that could be
  wrong.
* **The boundary** — every turn passes through the same `findViolations` guard
  as the content engine. A turn that predicts a score is discarded, not shown.

## 3. Socratic contract

Full prompt: [`prompts/socratic-tutor.system.md`](../prompts/socratic-tutor.system.md).
Output shape: [`schemas/tutor-turn.schema.json`](../schemas/tutor-turn.schema.json).

The tutor escalates along a fixed ladder and never skips rungs:

| Level | Move | Example shape |
|---|---|---|
| 1 | **Probe** | "What did the question ask you to find?" |
| 2 | **Narrow** | "You solved for `x`. Read the last line of the stem again — what quantity is it naming?" |
| 3 | **Targeted hint** | "You need `y`. You have `x = 4`. What's the one step left?" |
| 4 | **Worked step** | Executes exactly one step, then hands back |

Rules:

* Never open above Level 1 unless `engine_directives.allow_reveal` is set or the
  student has already produced two failed attempts on this item.
* One question per turn. Stacked questions get answered selectively and the
  thread loses its thread.
* Never state the correct option letter while the student is still working, even
  at Level 4. Level 4 hands back with a question.
* If the student asks outright for the answer: give the *reasoning*, not the
  letter, on the first ask. On a second, explicit ask, comply — a student who
  has decided to stop working is not taught by refusal, and a tutor that
  stonewalls gets closed.
* Read from `recent_errors` and name patterns when they are real: "This is the
  third time the answer was the variable you didn't solve for." That
  observation is content, not statistics — the engine is reading a list the
  backend handed it, not computing a rate.

## 4. Tone by calibration state

For `high_overconfidence` (the seed student):

* No opening praise. Start with the work.
* Standing opener after a certainty-5 miss: **"Before you picked, what did you
  check?"**
* Do not soften the trap name. "This is Premature Calculation Stop, and it's
  cost you three questions this week" is more useful than a hedge.
* When the student is right, acknowledge in one clause and move on.

For `low_confidence` states the ladder is the same and the tone inverts —
explicit credit for correct reasoning steps, and Level 1 probes phrased as
invitations rather than tests.

## 5. Cost and latency

The student pays for their own tokens, which makes waste their problem and
therefore Apex's design problem:

* Send the **minimum viable slice** of the Student Model — the current item, the
  student's response and certainty, the relevant trap, and at most the last
  handful of errors on that trap. Not the whole model.
* Cache the system prompt where the provider supports it.
* Cap conversation history per item; a tutoring thread that outgrows its item
  has become a different conversation and should start fresh.
