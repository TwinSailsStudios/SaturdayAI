/** Mirrors docs/06-desmos-academy.md. The doc is the spec; this is its data. */
export interface Play {
  id: string;
  trigger: string;
  move: string;
}

export interface Tier {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  objective: string;
  plays: Play[];
  failureModes: string;
  exit: string;
}

export const TIERS: Tier[] = [
  {
    tier: 1,
    name: "Fluency: Entry, Window, Read",
    objective:
      "Get a correct picture on screen and read values off it without misreading the axes.",
    plays: [
      { id: "T1.GRAPH", trigger: "Any function given", move: "Type it as-is; y=, f(x)= and implicit forms all work" },
      { id: "T1.WINDOW", trigger: "Curve off-screen or flat", move: "Zoom, or set explicit bounds in graph settings" },
      { id: "T1.READ_POINT", trigger: "Need an intercept, zero, vertex or intersection", move: "Click the curve; grey dots are exact and labelled" },
      { id: "T1.TABLE", trigger: "Data given as a table", move: "Enter as a table, not as typed points" },
    ],
    failureModes: "Reading a gridline as 1 when it is 5; losing track of which curve is which.",
    exit: "Extracts a labelled point from an unfamiliar function in under 20 seconds, twice.",
  },
  {
    tier: 2,
    name: "Substitution: Solving by Graph",
    objective: "Replace algebraic solving with intersection-finding wherever it is faster.",
    plays: [
      { id: "T2.SPLIT", trigger: "One-variable equation L = R", move: "Graph y = L and y = R; the x of the intersection is the solution" },
      { id: "T2.SYSTEM", trigger: "Two linear equations", move: "Graph both; click the intersection" },
      { id: "T2.NO_SOLUTION", trigger: "'How many solutions?'", move: "Parallel → none; identical → infinitely many" },
      { id: "T2.INEQUALITY", trigger: "Inequality or system of inequalities", move: "Type with < or >; the overlap is the solution region" },
      { id: "T2.ZEROS", trigger: "'Sum or product of the solutions'", move: "Read both zeros, then combine" },
    ],
    failureModes:
      "Premature Calculation Stop survives Desmos: the intersection is a point, and students report x when asked for y.",
    exit: "Solves a two-linear system and reports the requested quantity three times running.",
  },
  {
    tier: 3,
    name: "Parameters: Sliders and Families",
    objective: "Turn 'for what value of k…' into a visual search.",
    plays: [
      { id: "T3.SLIDER", trigger: "An unknown constant in the equation", move: "Type the letter; accept the slider; drag" },
      { id: "T3.TANGENCY", trigger: "'Exactly one solution'", move: "Slide until the curves touch at one point" },
      { id: "T3.COUNT_K", trigger: "'For how many values of k…'", move: "Graph the family; count qualifying positions" },
      { id: "T3.FAMILY", trigger: "'Which could be the graph of…'", move: "Slide the parameter, watch which feature moves" },
      { id: "T3.CONSTRAINT", trigger: "Parameter with a stated restriction", move: "Set slider bounds to the restriction, then search" },
    ],
    failureModes: "Dragging past the answer; treating a slider value as exact when an exact form is wanted.",
    exit: "Answers a 'how many values of k' item correctly without algebra.",
  },
  {
    tier: 4,
    name: "Data: Lists, Regressions, Statistics",
    objective: "Own Problem-Solving and Data Analysis mechanically.",
    plays: [
      { id: "T4.LINREG", trigger: "Scatterplot, line of best fit", move: "Table, then y_1 ~ m x_1 + b" },
      { id: "T4.QUADREG", trigger: "Curved trend", move: "y_1 ~ a x_1^2 + b x_1 + c" },
      { id: "T4.EXPREG", trigger: "Growth or decay at a constant percent", move: "y_1 ~ a b^{x_1}; b − 1 is the rate" },
      { id: "T4.PREDICT", trigger: "'Predicted value at x = …'", move: "Define the fitted function, evaluate it" },
      { id: "T4.STATS", trigger: "Mean, median, quartiles, spread", move: "mean(L), median(L), stdev(L), quartile(L, 1)" },
      { id: "T4.RESIDUAL", trigger: "'Overestimate or underestimate?'", move: "Compare fitted value to observed point" },
    ],
    failureModes: "Confusing the regression's b with an exponential base; reporting the growth factor as the rate.",
    exit: "Runs an exponential regression and reports the percent rate correctly.",
  },
  {
    tier: 5,
    name: "Triage: Speed and Restraint",
    objective: "Know within five seconds whether to open Desmos at all.",
    plays: [
      { id: "T5.SKIP", trigger: "Arithmetic or one-step substitution", move: "Don't open it — setup costs more than the solve" },
      { id: "T5.VERIFY", trigger: "Solved by hand, certainty below 4", move: "Use Desmos as a checker, not a solver" },
      { id: "T5.GEOMETRY_LIMIT", trigger: "Circle or triangle with no coordinate frame", move: "Use the reference sheet instead" },
      { id: "T5.PRESET", trigger: "Recurring structures", move: "Keep the setup minimal: fewer lines, fewer misreads" },
      { id: "T5.ABANDON", trigger: "30 seconds in with no picture", move: "Bail to elimination; flag for review" },
    ],
    failureModes:
      "The over-adopter opens Desmos for 3x = 12 and loses 40 seconds; the under-adopter does quadratics by hand under time pressure.",
    exit: "Tool choice matches the reference triage on 80% of a mixed set — backend-computed.",
  },
];
