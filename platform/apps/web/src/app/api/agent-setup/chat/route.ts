import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { getAgentPreset } from "@/lib/workspace/agent-presets";

/**
 * The Agents hire flow's ONE real-AI surface (mirrors /api/team/chat). Lu runs a
 * genuine Claude Haiku conversation to bring a coworker onto the team — settling
 * just two things: their LEASH (how much rope she has) and their VOICE (the tone
 * she writes in). Tools don't mutate anything server-side (the install store is
 * the client's OrgProfile) — args are collected and returned as `actions`, and
 * the client applies them (fills the live panel, then flips the module live).
 * Falls back (503 "no_key") when ANTHROPIC_API_KEY is absent so the demo degrades
 * to the manual "Bring on board" button instead of crashing.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

type Action = { kind: "set_choice"; field: "leash" | "voice"; value: string } | { kind: "finish" };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "no_key" }, { status: 503 });
  }

  let agent: string;
  let messages: ModelMessage[];
  try {
    ({ agent, messages } = (await req.json()) as { agent: string; messages: ModelMessage[] });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const preset = getAgentPreset(agent);
  if (!preset) return Response.json({ error: "unknown_agent" }, { status: 400 });

  const leashList = preset.leashOptions.map((o) => `"${o.value}" (${o.label})`).join(", ");

  const SYSTEM = `You are Lu, a warm, sharp AI assistant helping a service-business owner hire you as their ${preset.label} — like you're texting. ${preset.label}: ${preset.blurb}

You're settling just TWO things before you come on board:
1. LEASH — how much rope you have. The options are: ${leashList}. When the owner tells you, call set_choice with field "leash" and value set to the option token (e.g. "${preset.leashOptions[0].value}").
2. VOICE — the tone you'll write in (a short vibe, guided by: ${preset.voiceHint}). When the owner tells you, call set_choice with field "voice" and value set to a short descriptor of the tone (e.g. "warm and brief").

How to run it:
- Ask for ONE thing at a time, starting with the leash. Keep every reply to 1–2 short, natural sentences.
- Call set_choice the moment the owner settles a thing — don't wait.
- If the owner is happy to let you pick, choose a sensible default and set it.
- Once BOTH leash and voice are set, call finish and confirm in one warm line that you're on the team and ready to go.
- Never invent facts the owner didn't give. Don't re-ask for something you already have.`;

  const actions: Action[] = [];

  const tools = {
    set_choice: tool({
      description:
        "Record one of the two settings for this hire. field is 'leash' (value = one of the leash option tokens) or 'voice' (value = a short tone descriptor). Call as soon as the owner settles it.",
      inputSchema: z.object({
        field: z.enum(["leash", "voice"]).describe("which setting is being recorded"),
        value: z.string().describe("the chosen value — a leash option token, or a short voice/tone descriptor"),
      }),
      execute: async ({ field, value }) => {
        actions.push({ kind: "set_choice", field, value });
        return `Set ${field} to ${value}.`;
      },
    }),
    finish: tool({
      description: "Call when both leash and voice are settled and the agent is ready to come on board.",
      inputSchema: z.object({}),
      execute: async () => {
        actions.push({ kind: "finish" });
        return `${preset.label} is on the team.`;
      },
    }),
  };

  try {
    const result = await generateText({
      model: anthropic(process.env.AI_MODEL || "claude-haiku-4-5"),
      system: SYSTEM,
      messages,
      tools,
      stopWhen: stepCountIs(6),
    });
    return Response.json({ reply: result.text, actions });
  } catch (err) {
    console.error("[agent-setup/chat]", err);
    return Response.json({ error: "generation_failed" }, { status: 500 });
  }
}
