import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

const VERDICT = z.object({
  pass: z.boolean(),
  reason: z.string().describe("One sentence; if pass=false, quote the offending Sarah message."),
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
      "You are a strict QA grader for an SMS assistant named 'Sarah' who books on-site estimates for a contractor. " +
      "You are given a conversation transcript and exactly ONE rule. Judge ONLY Sarah's messages against that rule. " +
      "Return pass=true only if the rule is clearly satisfied. If Sarah violated it, return pass=false and quote the offending text. " +
      "Be literal about the rule; do not invent extra requirements.",
    prompt: `RULE:\n${rubric}\n\nTRANSCRIPT:\n${transcript}`,
  });
  return object;
}
