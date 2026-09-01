import { z } from "zod";

/**
 * Mirrors schemas/tutor-turn.schema.json. Every field is required so the
 * structured-output schema stays strict; optionality is expressed as nullable.
 */
export const TutorTurnSchema = z.object({
  move: z.enum([
    "probe",
    "narrow",
    "hint",
    "worked_step",
    "micro_lesson",
    "confirm",
    "handoff",
  ]),
  escalation_level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  utterance: z.string(),
  trap_named: z.string().nullable(),
  next_expected_student_action: z.enum([
    "answer_probe",
    "retry_item",
    "run_desmos_play",
    "read_micro_lesson",
    "none",
  ]),
  desmos_play: z.string().nullable(),
  reveals_answer: z.boolean(),
});

export type TutorTurn = z.infer<typeof TutorTurnSchema>;
