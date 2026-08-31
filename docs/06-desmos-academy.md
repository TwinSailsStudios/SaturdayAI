# 06 — Desmos SAT Academy

`[DRAFTED]` — the 5-tier curriculum below is a proposal. Verify each play
against the **in-test Bluebook Desmos build** before shipping; the embedded
calculator is close to the public graphing calculator but should not be assumed
identical feature-for-feature.

## 1. Why this is a pillar and not a feature

The digital Math section allows the Desmos graphing calculator on **every
question**. That converts a large class of items from "can you do the algebra"
into "can you set up a graph in fifteen seconds". Most students never learn the
second skill and leave points on the table on items they could have answered
without algebra at all.

The Academy teaches Desmos as a **triage instrument**, not a crutch. The final
tier is explicitly about when *not* to use it.

## 2. Tier structure

Each tier has: a mastery objective, a set of named **plays**, the failure modes
that block progression, and an exit criterion the backend evaluates.

---

### Tier 1 — Fluency: Entry, Window, Read

**Objective.** Get a correct picture on screen and read values off it without
misreading the axes.

| Play | Trigger | Move |
|---|---|---|
| `T1.GRAPH` | Any function given | Type it as-is; Desmos accepts `y=`, `f(x)=`, and implicit forms |
| `T1.WINDOW` | Curve off-screen or flat | Pinch-zoom, or set explicit bounds in graph settings |
| `T1.READ_POINT` | Need an intercept, zero, vertex, or intersection | Click the curve; grey dots are exact and labelled |
| `T1.TABLE` | Data given as a table | Enter as a table, not as points typed one by one |

**Failure modes.** Reading a gridline as 1 when it is 5 (`MATH_GRAPH_MISREAD`);
typing `y=2x+1` when the item defines `f(x)` and then losing track of which
curve is which.

**Exit.** Extracts a labelled point from an unfamiliar function in under 20
seconds, twice consecutively.

---

### Tier 2 — Substitution: Solving by Graph

**Objective.** Replace algebraic solving with intersection-finding wherever it
is faster.

| Play | Trigger | Move |
|---|---|---|
| `T2.SPLIT` | One-variable equation `L = R` | Graph `y = L` and `y = R`; the x of the intersection is the solution |
| `T2.SYSTEM` | Two linear equations | Graph both; click the intersection |
| `T2.NO_SOLUTION` | "How many solutions?" | Parallel lines → none; identical lines → infinitely many; visible immediately |
| `T2.INEQUALITY` | Inequality or system of inequalities | Type with `<`, `>`; shading appears; the overlap is the solution region |
| `T2.ZEROS` | "Sum/product of the solutions" | Read both zeros, then combine — the reading is the hard part, not the arithmetic |

**Failure modes.** `MATH_PREMATURE_STOP` survives Desmos: the student finds the
intersection and reports `x` when asked for `y`. This tier must explicitly pair
with that trap's `remediation_cue` — **the point is `(x, y)`; read the
coordinate you were asked for.**

**Exit.** Solves a two-linear system and reports the *requested* quantity on
three consecutive items.

---

### Tier 3 — Parameters: Sliders and Families

**Objective.** Turn "for what value of `k`…" from an algebra problem into a
visual search.

| Play | Trigger | Move |
|---|---|---|
| `T3.SLIDER` | An unknown constant in the equation | Type the letter; accept the slider prompt; drag |
| `T3.TANGENCY` | "Exactly one solution" | Slide until the curves touch at one point |
| `T3.COUNT_K` | "For how many values of k…" | Graph the family; count the qualifying positions |
| `T3.FAMILY` | "Which could be the graph of…" | Slide the parameter and watch which feature moves |
| `T3.CONSTRAINT` | Parameter with a stated restriction | Set slider bounds to the restriction, then search |

**Failure modes.** Dragging past the answer without noticing; treating a slider
value as exact when the item wants an exact form (slide to locate, then confirm
algebraically).

**Exit.** Answers a "how many values of `k`" item correctly without algebra.

---

### Tier 4 — Data: Lists, Regressions, Statistics

**Objective.** Own the Problem-Solving and Data Analysis domain mechanically.

| Play | Trigger | Move |
|---|---|---|
| `T4.LINREG` | Scatterplot, "line of best fit" | Table, then `y_1 ~ m x_1 + b`; read `m` and `b` |
| `T4.QUADREG` | Curved trend | `y_1 ~ a x_1^2 + b x_1 + c` |
| `T4.EXPREG` | Growth/decay, constant percent | `y_1 ~ a b^{x_1}`; `b − 1` is the rate |
| `T4.PREDICT` | "Predicted value at x = …" | Define the fitted function, evaluate it |
| `T4.STATS` | Mean, median, quartiles, spread | `mean(L)`, `median(L)`, `stdev(L)`, `quartile(L, 1)` |
| `T4.RESIDUAL` | "Overestimate or underestimate?" | Compare the fitted value to the observed point |

**Failure modes.** Confusing the regression's `b` (intercept) with the
exponential base (`MATH_FORM_MISINTERPRETED`); reporting the growth *factor*
when the item asks for the growth *rate*.

**Exit.** Runs an exponential regression and reports the percent rate correctly.

---

### Tier 5 — Triage: Speed and Restraint

**Objective.** Know within five seconds whether to open Desmos at all.

| Play | Trigger | Move |
|---|---|---|
| `T5.SKIP` | Pure arithmetic, one-step substitution, mental-math item | Do not open Desmos — setup costs more than the solve |
| `T5.VERIFY` | Item already solved by hand, certainty below 4 | Use Desmos as a **checker**, not a solver |
| `T5.GEOMETRY_LIMIT` | Circle/triangle items with no coordinate frame | Desmos rarely wins; use the reference sheet |
| `T5.PRESET` | Recurring structures | Keep the setup minimal: fewer expression lines, fewer misreads |
| `T5.ABANDON` | 30 seconds in with no picture | Bail to elimination; flag for review |

**Failure modes.** The over-adopter, who opens Desmos for `3x = 12` and loses 40
seconds; the under-adopter, who does quadratics by hand under time pressure.

**Exit.** On a mixed set, the student's tool choice matches the reference
triage on 80% of items — **backend-computed**; the engine only labels each
generated item with `desmos.recommended: true | false | optional`.

---

## 3. Engine contract for Desmos

Every generated Math question carries a `desmos` block:

```json
{
  "desmos": {
    "recommended": true,
    "tier": 2,
    "play": "T2.SPLIT",
    "expressions": ["y=2x+7", "y=x^2-5"],
    "read_off": "x-coordinates of both intersection points",
    "time_saved_estimate_seconds": 35,
    "restraint_note": null
  }
}
```

When `recommended` is `false`, `restraint_note` must explain why — this is how
Tier 5 gets taught passively during ordinary practice rather than only inside
the Academy.

## 4. Personalisation from the Student Model

For the seed student (`MATH_PREMATURE_STOP`, `high_overconfidence`):

* Tier 2 is the priority tier — `T2.SYSTEM` plus the read-the-right-coordinate
  cue attacks the top trap directly.
* Desmos coaching is framed as **verification** (`T5.VERIFY`), because a
  confident student's problem is not method, it is the absent check.
* Tier 4 is deferred: PSAT 8/9 weights Problem-Solving and Data Analysis, but
  repairing the active trap outranks new-tier acquisition during Phase 2.
