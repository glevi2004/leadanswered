import { generateText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import { getModel, recommendModel } from "@leadanswered/core";
import type { Store } from "../store/types.js";
import {
  orchestratorTools,
  type OrchestratorAction,
  type OrchestratorContext,
} from "./orchestratorTools.js";

/**
 * Lu the ORCHESTRATOR (AGENTS-BACKEND §3) — the one planning brain of the Lu
 * Computer. She is NOT a department worker: given the owner's goal she
 * understands it, asks clarifying questions (non-blocking `ask_user`), decomposes
 * it into `create_task`s, delegates each to the department that owns it, and
 * reports back. Same runtime as the SMS agent (`runner.ts`): an AI-SDK
 * `generateText` tool-loop bounded by `stepCountIs`, telemetry on. She runs on a
 * stronger model than the department turns — the orchestration-tier pick from the
 * core model gateway (§5b).
 */

/** Deps the orchestrator needs — the Store port, plus an optional model override (mirrors AgentDeps). */
export interface OrchestratorDeps {
  store: Store;
  /** Optional override; defaults to the orchestration-tier model from the core gateway (§5b). */
  model?: LanguageModel;
}

/** A prior turn of the Lu-dock conversation. */
export interface OrchestratorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OrchestratorInput {
  orgId: string;
  /** The owner's latest message. */
  message: string;
  /** Prior turns of this Lu conversation, if any. */
  history?: OrchestratorMessage[];
  /** Optional model id (from the dock model picker) — overrides the default orchestration-tier pick. */
  modelId?: string;
}

export interface OrchestratorResult {
  /** Lu's plain-language reply to the owner (what she understood + delegated + asked). */
  reply: string;
  /** Ids of the tasks she created this turn. */
  tasksCreated: string[];
  /** Non-blocking questions she surfaced for the owner (AskUserQuestion in the dock). */
  actions: OrchestratorAction[];
}

/** Lu-as-conductor system prompt — she plans + delegates, she never does the work herself. */
function systemPrompt(): string {
  return [
    "You are Lu, the conductor of an AI-native computer. The owner talks to you and you turn their goals into real work done by agents that have real machines: a cloud sandbox, their GitHub, their Vercel, a database.",
    "You do NOT do the work yourself and you never claim to have done it. You understand the goal, break it into Tasks, and hand each piece to the agent that owns it.",
    "WHAT IS REAL TODAY: the Engineer. She builds and ships software (websites, web apps, internal tools, scripts, integrations) by writing code in a cloud sandbox and deploying it to the owner's OWN GitHub and Vercel, plus Supabase when it needs a database. This is your main capability, so route anything buildable to engineering.",
    "The other departments (support, operations, finance, legal, design, marketing, sales) are on the roadmap and NOT operational yet. Do NOT pretend they can do work, and never bring up CRM, inboxes, calendars, scheduling, invoicing, contracts, leads, or campaigns as if they exist. If the owner asks for one of those, say plainly that department is not live yet, then offer what the Engineer CAN build toward it (for example: I can have the Engineer build you a booking page, a simple CRM app, or an invoicing tool).",
    "CONNECTIONS mean the owner's OWN accounts you build into: their GitHub, Vercel, and Supabase. When they ask whether you have their connections, or before you dispatch a build, call check_connections and tell them exactly what is connected and what is missing. GitHub AND Vercel are both required before a build can run. Connections are never CRM, contacts, email, or calendars.",
    "Each turn:",
    "1) Understand the goal. If something essential is unclear, call ask_user with ONE specific question. It does not block, so keep planning with what you know.",
    "2) Decompose into concrete, buildable tasks and call create_task for each (department engineering for anything the Engineer builds). Prefer a few well-scoped tasks over one vague one.",
    "3) Use list_status to see what is already underway before adding more.",
    "4) To actually START a build, call dispatch_to_engineering with the engineering task id. You never build anything yourself; the Engineer only runs when you dispatch it. If it returns not_connected, tell the owner to connect their GitHub and Vercel, then retry once they have.",
    "5) Report back plainly: what you understood, the tasks you created, what you dispatched, and anything you asked the owner.",
    "Keep replies short and plain, like a capable chief of staff talking to the owner. Never use em-dashes.",
  ].join("\n");
}

/**
 * Run one orchestrator turn. The model reasons over the conversation, calls the
 * deterministic Store-backed tools (which create/route tasks + record questions),
 * and returns a reply plus the ids of tasks created and any questions raised —
 * read off the shared `ctx` after the loop (the ownerTools collector pattern).
 */
export async function runOrchestrator(
  deps: OrchestratorDeps,
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  const model =
    deps.model ?? getModel(input.modelId ?? recommendModel("orchestrator", "text").id);
  const ctx: OrchestratorContext = { orgId: input.orgId, tasksCreated: [], actions: [] };
  const tools = orchestratorTools({ store: deps.store }, ctx);
  const system = systemPrompt();

  const messages = [
    ...(input.history ?? []),
    { role: "user" as const, content: input.message },
  ] as ModelMessage[];

  // Langfuse trace context: attribute the turn to the organization, tag it for filtering.
  const meta = {
    userId: input.orgId,
    tags: ["lu-orchestrator"],
    organizationId: input.orgId,
  };

  const result = await generateText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(8), // bound the plan→delegate loop per turn
    experimental_telemetry: { isEnabled: true, functionId: "lu-orchestrator-turn", metadata: meta },
  });

  let reply = result.text.trim();
  // Like runner.ts: a turn that ends on a tool call (e.g. create_task) can leave
  // no closing text. Force a short reply from the tool results so Lu always
  // reports back what she did.
  if (!reply) {
    const followup = await generateText({
      model,
      system,
      messages: [...messages, ...result.response.messages],
      tools,
      toolChoice: "none",
      experimental_telemetry: { isEnabled: true, functionId: "lu-orchestrator-closing", metadata: meta },
    });
    reply = followup.text.trim();
  }

  return {
    reply: reply || "On it. I've lined up the work and will report back as the departments make progress.",
    tasksCreated: ctx.tasksCreated ?? [],
    actions: ctx.actions ?? [],
  };
}
