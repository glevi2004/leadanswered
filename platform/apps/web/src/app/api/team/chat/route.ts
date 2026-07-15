import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs, tool, type ModelMessage } from "ai";
import { z } from "zod";

/**
 * TEAM-GRAPH §3 — the ONE real-AI surface. Lu runs a genuine Claude Haiku
 * conversation to set up the owner's team one person at a time, calling tools
 * to add teammates and wire the hierarchy. The tools don't mutate anything
 * server-side (the member store is the client's OrgProfile) — their args are
 * collected and returned as `actions`, and the client applies them to the graph.
 * Falls back (503 "no_key") when ANTHROPIC_API_KEY is absent so the demo degrades
 * to a scripted flow instead of crashing.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM = `You are Lu, a warm, sharp AI assistant helping a service-business owner set up their team — one person at a time, like you're texting.

For each teammate, learn: their name, their role/title, their CELL PHONE, their EMAIL, and who they report to. Then place them on the org chart. You need the cell and email because you'll text and email each person an invite to join the team — so if the owner hasn't given them, ask.

How to run it:
- Ask for ONE thing at a time. Keep every reply to 1–2 short, natural sentences.
- When the owner names a person and their role, call add_teammate right away (fill title/phone/email/skills as you learn them — call it again with the same name to add more).
- Make sure you get each person's cell number AND email before moving on — that's how you'll invite them. Frame it that way ("what's their cell and email so I can send them an invite?").
- If the owner mentions what someone does or is good at ("Danny does all our metal roofs"), capture it as skills/notes.
- After you know who someone answers to, call set_reports_to (use their names; the owner themself is the top of the org, so "me"/"the owner" means they report to the owner).
- After a person is fully set (name, role, cell, email, manager), briefly confirm you'll send them an invite, then ask if there's anyone else.
- When the owner says that's everyone, call finish and confirm in one warm line that you'll text and email everyone their invite to join.
- Never invent facts the owner didn't give. Don't re-ask for something you already have.

Start by briefly saying you'll set up their team, then ask who's first.`;

type Action =
  | { kind: "add"; name: string; title?: string; phone?: string; email?: string; skills?: string[]; notes?: string }
  | { kind: "reports_to"; teammate: string; manager: string }
  | { kind: "finish" };

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

  const actions: Action[] = [];

  const tools = {
    add_teammate: tool({
      description:
        "Add (or update) a teammate on the org chart. Call as soon as you know their name; pass whatever else you've learned (title, cell phone, email, skills, notes). Call again with the same name to fill in more later.",
      inputSchema: z.object({
        name: z.string().describe("the teammate's name"),
        title: z.string().optional().describe("their role/title, e.g. 'CFO' or 'Lead installer'"),
        phone: z.string().optional().describe("their cell phone number, verbatim"),
        email: z.string().optional().describe("their email address, verbatim"),
        skills: z.array(z.string()).optional().describe("what they do / are good at, e.g. ['metal roofing']"),
        notes: z.string().optional().describe("anything else worth remembering about them"),
      }),
      execute: async ({ name, title, phone, email, skills, notes }) => {
        actions.push({ kind: "add", name, title, phone, email, skills, notes });
        return `Added ${name}${title ? ` (${title})` : ""} to the chart.`;
      },
    }),
    set_reports_to: tool({
      description:
        "Set who a teammate reports to (the hierarchy edge). Use names. If they report to the owner, use manager: 'owner'.",
      inputSchema: z.object({
        teammate: z.string().describe("the teammate's name"),
        manager: z.string().describe("who they report to, by name; use 'owner' for the business owner"),
      }),
      execute: async ({ teammate, manager }) => {
        actions.push({ kind: "reports_to", teammate, manager });
        return `${teammate} now reports to ${manager}.`;
      },
    }),
    finish: tool({
      description: "Call when the owner has finished adding everyone.",
      inputSchema: z.object({}),
      execute: async () => {
        actions.push({ kind: "finish" });
        return "Team setup complete.";
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
    console.error("[team/chat]", err);
    return Response.json({ error: "generation_failed" }, { status: 500 });
  }
}
