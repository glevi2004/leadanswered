import { anthropic } from "@ai-sdk/anthropic";
import { generateText, type ModelMessage } from "ai";

/**
 * The New org's ONE real assistant. The global Lu widget/dock/`/sarah` talks to this —
 * a plain, warm Claude Haiku conversation (no tools, no "install"): Lu is the operating
 * layer over the fixed workspace (Customers · Schedule · Money · Team · Agents · Sites).
 * Falls back to a scripted line (503 "no_key") when ANTHROPIC_API_KEY is absent.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are Lu, the AI assistant and operating layer for a small service business — like you're texting the owner. Warm, sharp, concise (1–3 short sentences).

The owner's workspace has a fixed set of surfaces you help them run:
- Customers — the people they serve (leads, jobs, history)
- Schedule — their calendar and jobs
- Money — quotes, invoices, and who owes them
- Team — their crew (people and AI agents on one org chart)
- Agents — AI workers they can hire (a Receptionist that answers the line, plus Follow-ups, Reviews, Content)
- Sites — their websites

Help them get things done, answer questions about their business, and when it fits, point them to the right surface ("that lives in Money", "hire the Follow-ups agent under Agents"). Never invent data you don't have; if they ask about specific numbers, tell them where to look. Don't offer to "install apps" — the workspace is already set up.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "no_key" }, { status: 503 });
  }

  let messages: ModelMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: ModelMessage[] });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await generateText({
      model: anthropic(process.env.AI_MODEL || "claude-haiku-4-5"),
      system: SYSTEM,
      messages,
    });
    return Response.json({ reply: result.text });
  } catch (err) {
    console.error("[lu/chat]", err);
    return Response.json({ error: "generation_failed" }, { status: 500 });
  }
}
