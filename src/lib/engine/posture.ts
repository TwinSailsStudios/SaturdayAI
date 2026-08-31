import type { RoadmapPhase } from "@contracts";

/**
 * Phase → generation posture (docs/09-apex-loop.md §3). This is the table the
 * engine actually consumes, and the backend applies it when building a request
 * so the posture is a property of the plan rather than of a model's mood.
 */
export interface Posture {
  label: string;
  scaffolding: "none" | "low" | "medium" | "high";
  cloneDensity: "none" | "low" | "high";
  explanation: "deferred" | "short" | "medium" | "long";
  difficultySpread: string;
  tone: string;
  desmosEmphasis: string;
}

export const POSTURE: Record<RoadmapPhase, Posture> = {
  diagnose: {
    label: "Diagnose",
    scaffolding: "none",
    cloneDensity: "none",
    explanation: "deferred",
    difficultySpread: "Full range, blueprint-proportional",
    tone: "Neutral, non-leading",
    desmosEmphasis: "Neutral labels only",
  },
  repair: {
    label: "Repair",
    scaffolding: "high",
    cloneDensity: "high",
    explanation: "long",
    difficultySpread: "Narrow, centred on the trap's home difficulty",
    tone: "Direct, behavioural",
    desmosEmphasis: "Tier matched to the active trap",
  },
  build: {
    label: "Build",
    scaffolding: "medium",
    cloneDensity: "low",
    explanation: "medium",
    difficultySpread: "Moderate spread, skill-adjacent",
    tone: "Instructional",
    desmosEmphasis: "Tier acquisition (3–4)",
  },
  sharpen: {
    label: "Sharpen",
    scaffolding: "low",
    cloneDensity: "low",
    explanation: "short",
    difficultySpread: "Wide, weighted hard",
    tone: "Brisk, timed framing",
    desmosEmphasis: "Tier 5 restraint",
  },
  simulate: {
    label: "Simulate",
    scaffolding: "none",
    cloneDensity: "none",
    explanation: "deferred",
    difficultySpread: "Blueprint-exact",
    tone: "Test-day neutral",
    desmosEmphasis: "Verification only",
  },
};

/**
 * Session sizing from training_availability. A set that consumes the whole
 * window and leaves the review unread has failed, so we budget roughly a third
 * of the session for review. See docs/09 §3.
 */
export function setSize(minutesPerDay: number, avgSecondsPerItem = 70): number {
  const workingSeconds = minutesPerDay * 60 * 0.66;
  return Math.max(4, Math.min(12, Math.round(workingSeconds / avgSecondsPerItem)));
}
