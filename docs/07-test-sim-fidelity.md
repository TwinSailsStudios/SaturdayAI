# 07 — Test Sim: Bluebook-Mirror Fidelity

`[DRAFTED]` — requirements derived from the digital suite structure in
[`02-assessment-blueprints.md`](./02-assessment-blueprints.md). Verify against a
live Bluebook practice test before release.

## 1. The rule that defines the pillar

**During a simulation, the client makes zero calls to the AI engine.** Not for
hints, not for explanations, not for Desmos suggestions, not for encouragement.
The engine is architecturally unreachable from the sim surface — enforced at the
API layer, not by UI state, so a client bug cannot leak a tutor into a timed
module.

Everything shown during a sim is pre-generated and already in the bank. Review
content is fetched only **after** the section is submitted.

## 2. Timing

| Requirement | Detail |
|---|---|
| Un-pauseable | No pause control. Closing the tab does not stop the clock. |
| Per-module | Timer resets at each module boundary; unused time does not carry |
| Hidden by default | Clock is hideable, matching Bluebook; a 5-minute warning appears regardless |
| Auto-advance | At `00:00` the module submits itself and moves on |
| No back-navigation | Once a module is submitted it is closed permanently |
| Break | 10 minutes between sections, with its own countdown; skippable, not extendable |

Timing is **server-authoritative**. The client renders a countdown; the server
holds module start time and rejects responses received after expiry plus a small
network grace. A client clock is a cheat surface and a support burden.

## 3. UI parity

| Element | Requirement |
|---|---|
| Split screen | Passage/stimulus left, question right, draggable divider (RW and Math with figures) |
| Mark for Review | Per-question flag, visible in the question navigator |
| Question navigator | Grid showing answered / unanswered / flagged |
| Option eliminator | Strike-through toggle per option (ABC crossout) |
| Annotation | Highlight passage text and attach a note |
| Desmos calculator | Embedded, available for the **entire** Math section |
| Reference sheet | Available throughout Math |
| Zoom / font | Accessibility controls that do not break the split layout |

## 4. Adaptivity

* Module 1 is a fixed mixed-difficulty form.
* At Module 1 submission, the **backend** applies a deterministic threshold and
  routes to `module_2_lower` or `module_2_upper`. The threshold is a documented
  constant, versioned, and reproducible — never a model call.
* RW and Math route independently.
* The student is never told which form they received. The score report never
  names it either.

## 5. Item sourcing

Sim forms are assembled from the **bank**, not generated live. Assembly is a
backend job that satisfies the blueprint constraints:

* Domain counts within the target shares (§4/§5 of the blueprints doc).
* Difficulty mix appropriate to `module_target`.
* SPR items last in each Math module, at roughly 25% of the module.
* No item the student has seen in the last N days (backend policy).
* Every item has passed the validation gate and, ideally, has response data.

**Generated items should not debut in a simulation.** A sim is the measurement
instrument; an unvalidated item corrupts the measurement. Route new items
through Targeted Practice first, then promote to the sim pool once they have
behaved.

## 6. After submission

The sim ends and the engine becomes reachable again. Post-sim, the engine may:

* Explain any item, trap-first, per
  [`04-cognitive-trap-taxonomy.md`](./04-cognitive-trap-taxonomy.md) §4.
* Generate clones for every trap that fired.
* Emit `engine_signals` for the backend's roadmap policy.

It still may not produce a score, a projection, or a percentile — those come
from the backend's conversion tables, which are the only thing that makes a
practice score comparable to a real one.
