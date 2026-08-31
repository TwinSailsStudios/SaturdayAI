import type { Question } from "@contracts";

/**
 * A question as the client is allowed to see it before answering.
 *
 * Correctness, rationales, trap IDs, the explanation and the Desmos read-off
 * are all stripped. The client never holds the answer key: sending the whole
 * item and hiding it in the UI would make every practice question inspectable
 * from devtools, and would make the certainty rating meaningless.
 */
export interface PresentedQuestion {
  id: string;
  section: Question["section"];
  domain: string;
  skill: string;
  difficulty: Question["difficulty"];
  format: Question["format"];
  stimulus: string | null;
  stimulus_data: Question["stimulus_data"];
  prompt: string;
  options: Array<{ id: string; text: string }>;
  /** Kept: knowing whether the tool is worth opening is part of the training. */
  desmos: { recommended: boolean; tier?: number; play?: string; expressions?: string[] } | null;
  estimated_time_seconds: number | null;
  is_clone: boolean;
  clone_rung: Question["clone_rung"];
}

export function present(q: Question): PresentedQuestion {
  return {
    id: q.id,
    section: q.section,
    domain: q.domain,
    skill: q.skill,
    difficulty: q.difficulty,
    format: q.format,
    stimulus: q.stimulus ?? null,
    stimulus_data: q.stimulus_data ?? null,
    prompt: q.prompt,
    options: (q.options ?? []).map((o) => ({ id: o.id, text: o.text })),
    desmos: q.desmos
      ? {
          recommended: q.desmos.recommended,
          tier: q.desmos.tier,
          play: q.desmos.play,
          // Expressions are the setup, not the answer — showing them teaches
          // the play. `read_off` is withheld until review.
          expressions: q.desmos.recommended ? q.desmos.expressions : [],
        }
      : null,
    estimated_time_seconds: q.metadata?.estimated_time_seconds ?? null,
    is_clone: q.clone_of != null,
    clone_rung: q.clone_rung ?? null,
  };
}
