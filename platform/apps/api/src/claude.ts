import Anthropic from "@anthropic-ai/sdk";
import {
  SARAH_JSON_SCHEMA,
  SarahOutputSchema,
  type SarahOutput,
} from "@leadanswered/core";
import { env } from "./env.js";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** The "Sarah" model: given an assembled system prompt + history, returns structured output. */
export interface SarahAi {
  generate(systemPrompt: string, history: ChatTurn[]): Promise<SarahOutput>;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** Real implementation backed by the Anthropic API with structured outputs (SCOPE §5). */
export class ClaudeAi implements SarahAi {
  async generate(systemPrompt: string, history: ChatTurn[]): Promise<SarahOutput> {
    const req = {
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: history.map((h) => ({ role: h.role, content: h.content })),
      // Structured outputs — constrains the reply to our JSON schema.
      output_config: { format: { type: "json_schema", schema: SARAH_JSON_SCHEMA } },
    };
    // `output_config` may be newer than the installed SDK's types; the SDK forwards it verbatim.
    const response = (await getClient().messages.create(req as never)) as Anthropic.Message;
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return SarahOutputSchema.parse(JSON.parse(text));
  }
}
