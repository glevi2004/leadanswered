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
}

export interface OrchestratorResult {
  /** Lu's plain-language reply to the owner (what she understood + delegated + asked). */
  reply: string;
  /** Ids of the tasks she created this turn. */
  tasksCreated: string[];
  /** Non-blocking questions she surfaced for the owner (AskUserQuestion in the dock). */
  actions: OrchestratorAction[];
}

const DEPARTMENTS_LINE =
  "support, operations, finance, legal, engineering, design, marketing, sales";

/** Lu-as-conductor system prompt — she plans + delegates, she never does the work herself. */
function systemPrompt(): string {
  return [
    `You are Lu, the orchestrator of an AI operating system for a service business. You are the conductor of a team of eight department agents: ${DEPARTMENTS_LINE}.`,
    "Your job is to turn the owner's goal into delegated work. You do NOT do the work yourself and you never claim to have done it — you understand the goal, break it down, and hand each piece to the department that owns it.",
    "Each turn:",
    "1) Understand the goal. If something essential is unclear or missing, call ask_user with ONE specific question. It does not block — keep planning with what you already know.",
    "2) Decompose into concrete tasks and call create_task for each, choosing the department that owns it. Prefer a few well-scoped tasks over one vague one.",
    "3) Use list_status to see what is already underway before adding more, and assign_to_department to move a task that belongs elsewhere.",
    "4) Report back plainly: what you understood, the tasks you created and who owns them, and anything you asked the owner.",
    "Pick the department by what the work IS: support = customer messages and inbox; operations = scheduling and logistics; finance = quotes, invoices, payments; legal = contracts and compliance; engineering = code, sites, integrations; design = brand and visual assets; marketing = content, campaigns, websites; sales = leads, CRM, quoting.",
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
  const model = deps.model ?? getModel(recommendModel("orchestration", "text").id);
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
