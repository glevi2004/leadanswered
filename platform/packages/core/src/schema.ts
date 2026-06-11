import { z } from "zod";
import type { ExtractionFields } from "./conversation.js";

/**
 * Structured output the "Sarah" model must return every turn (SCOPE §5). The AI
 * extracts fields and phrases a reply; CODE makes the binding decisions from
 * `extracted`. `proposed_action` is an advisory hint only.
 *
 * Fields are non-nullable strings (with "" / "unknown" for absent values) — the
 * most broadly-supported shape for JSON-schema structured outputs.
 */
export const SarahExtractedSchema = z.object({
  project_type: z.string(),
  service_town: z.string(),
  service_zip: z.string(),
  full_address: z.string(),
  is_decision_maker: z.enum(["yes", "no", "unknown"]),
  chosen_slot: z.string(),
});

export const SarahOutputSchema = z.object({
  reply: z.string(),
  extracted: SarahExtractedSchema,
  proposed_action: z.enum([
    "none",
    "qualify",
    "propose_slots",
    "book",
    "disqualify",
  ]),
});

export type SarahExtracted = z.infer<typeof SarahExtractedSchema>;
export type SarahOutput = z.infer<typeof SarahOutputSchema>;

/** JSON Schema handed to the Claude API `output_config.format` (mirrors the zod schema). */
export const SARAH_JSON_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    extracted: {
      type: "object",
      properties: {
        project_type: { type: "string" },
        service_town: { type: "string" },
        service_zip: { type: "string" },
        full_address: { type: "string" },
        is_decision_maker: { type: "string", enum: ["yes", "no", "unknown"] },
        chosen_slot: { type: "string" },
      },
      required: [
        "project_type",
        "service_town",
        "service_zip",
        "full_address",
        "is_decision_maker",
        "chosen_slot",
      ],
      additionalProperties: false,
    },
    proposed_action: {
      type: "string",
      enum: ["none", "qualify", "propose_slots", "book", "disqualify"],
    },
  },
  required: ["reply", "extracted", "proposed_action"],
  additionalProperties: false,
} as const;

/** Convert the AI's string-based extraction into typed gathered fields. */
export function extractionToFields(e: SarahExtracted): ExtractionFields {
  const s = (v: string) => (v && v.trim() !== "" ? v.trim() : null);
  return {
    projectType: s(e.project_type),
    serviceTown: s(e.service_town),
    serviceZip: s(e.service_zip),
    fullAddress: s(e.full_address),
    isDecisionMaker:
      e.is_decision_maker === "yes"
        ? true
        : e.is_decision_maker === "no"
          ? false
          : null,
    chosenSlot: s(e.chosen_slot),
  };
}
