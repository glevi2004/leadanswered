import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { env } from "../env.js";

/**
 * The single provider swap point (SCOPE §3). Reads AI_PROVIDER / AI_MODEL and
 * returns a Vercel AI SDK LanguageModel. This is the ONLY file that imports a
 * provider SDK — switching to OpenAI later is a one-line branch:
 *   import { openai } from "@ai-sdk/openai";  // then add the case below
 * The provider SDK reads its own API key from the environment
 * (ANTHROPIC_API_KEY / OPENAI_API_KEY).
 */
export function getModel(): LanguageModel {
  switch (env.AI_PROVIDER) {
    case "anthropic":
      return anthropic(env.AI_MODEL);
    // case "openai": return openai(env.AI_MODEL); // install @ai-sdk/openai to enable
    default:
      throw new Error(
        `Unsupported AI_PROVIDER "${env.AI_PROVIDER}". Supported: anthropic (openai is swap-ready).`,
      );
  }
}
