import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

// `analysis` FIRST so the judge reasons before committing to a verdict (generateObject emits fields in
// schema order — deciding the boolean first makes it waffle and contradict its own reasoning).
const VERDICT = z.object({
  analysis: z.string().describe("Reason step by step whether Sarah obeyed the rule; quote any offending text."),
  pass: z.boolean(),
});

/**
 * Grade a transcript against ONE rule using a Sonnet judge. For the fuzzy rules that can't be asserted
 * with `==` — never quote a price, warm human tone, one question at a time, windows-not-slot-spam,
 * never claim booked without a tool, never reveal service-area policy.
 */
export async function judge(transcript: string, rubric: string): Promise<{ pass: boolean; reason: string }> {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: VERDICT,
    system:
      "You are a fair QA grader for an SMS assistant named 'Sarah' who books on-site estimates for a organization. " +
      "You are given a conversation transcript and exactly ONE rule. Judge ONLY Sarah's messages against that rule. " +
      "First write your analysis, THEN decide pass. Be literal about the rule and do not invent extra requirements — " +
      "if the rule is clearly satisfied, pass=true even if the writing isn't perfect.",
    prompt: `RULE:\n${rubric}\n\nTRANSCRIPT:\n${transcript}`,
  });
  return { pass: object.pass, reason: object.analysis };
}
