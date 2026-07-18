import { generateText, stepCountIs, type LanguageModel, type ModelMessage, type ToolSet } from "ai";
import { getModel, recommendModel } from "@leadanswered/core";
import type { Store } from "../store/types.js";
import {
  orchestratorTools,
  type OrchestratorAction,
  type OrchestratorContext,
} from "./orchestratorTools.js";
import { meterLlm } from "./metering.js";
import { resolveOrgMemory } from "./orgMemory.js";
import { resolveSituation } from "./situational.js";
import { onboardingTools } from "./onboardingTools.js";
import { getSkill } from "./skills/index.js";

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
    "1) Understand the goal. If something essential is unclear, call ask_user with ONE specific question. It does not block, so keep going with what you know.",
    "2) For anything the Engineer should BUILD (a site, app, tool, integration, or a change), draft a PLAN first: call propose_plan with a short title, a one-line objective, the ordered steps you will take, and acceptance criteria (how the owner will know it is done). This creates the engineering task WITHOUT building yet, writes the plan for the owner to read, and stages a plan approval. Do this INSTEAD of building immediately.",
    "3) After propose_plan, tell the owner you have drafted a plan for them to approve. Do NOT call dispatch_to_engineering yourself: when the owner APPROVES the plan in the dock, the Engineer starts building automatically. If propose_plan reports missing connections, tell the owner to connect their GitHub and Vercel so the build can run once they approve. Only call dispatch_to_engineering directly if the owner EXPLICITLY says to skip the plan and build now.",
    "4) Use list_status to see what is already underway before proposing more.",
    "5) Report back plainly, like a capable chief of staff: what you understood, the plan you drafted, and anything you asked the owner.",
    "Keep replies short and plain, like a capable chief of staff talking to the owner. Never use em-dashes.",
  ].join("\n");
}

/** Onboarding-mode system prompt — a short identity wrapper around the loaded onboarding SKILL. */
function onboardingSystemPrompt(procedure: string): string {
  return [
    "You are Lu, the founder's AI cofounder, onboarding a brand-new company inside their workspace.",
    "Follow the procedure below exactly, one step at a time. Keep replies short and warm. Never use em-dashes.",
    "",
    procedure,
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
  const modelId = input.modelId ?? recommendModel("orchestrator", "text").id;
  const model = deps.model ?? getModel(modelId);
  const ctx: OrchestratorContext = { orgId: input.orgId, tasksCreated: [], actions: [] };
  const allTools = orchestratorTools({ store: deps.store }, ctx);
  // Onboarding-mode (docs/onboarding.md Phase 2): a brand-new org has no ACTIVE department yet.
  // While onboarding, Lu runs the onboarding SKILL and gets only the onboarding toolkit (+ ask_user),
  // so she interviews, decides, and drafts the Business Plan instead of trying to build.
  const departments = await deps.store.listDepartments(input.orgId);
  const onboarding = !departments.some((d) => d.status === "active");
  // Core/long-term memory injection (plan Pillar 3): prepend what Lu knows about this business so
  // she has context from turn one. Best-effort — "" when there is nothing (or on any failure).
  const memory = await resolveOrgMemory(deps.store, input.orgId);
  // The situational block (docs/workflow.md §2): live connections + open tasks + pending
  // approvals + recent journal events, every turn — Lu is never blind to the state of the world.
  const situation = await resolveSituation(deps.store, input.orgId);

  let tools: ToolSet;
  let base: string;
  if (onboarding) {
    const skill = getSkill("onboarding");
    base = skill ? onboardingSystemPrompt(skill.procedure) : systemPrompt();
    tools = { ask_user: allTools.ask_user, ...onboardingTools({ store: deps.store }, { orgId: input.orgId }) };
  } else {
    base = systemPrompt();
    tools = allTools;
  }
  const system = [base, memory, situation].filter(Boolean).join("\n\n");

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
  void meterLlm(deps.store, input.orgId, modelId, result.usage);

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
    void meterLlm(deps.store, input.orgId, modelId, followup.usage);
    reply = followup.text.trim();
  }

  return {
    reply: reply || "On it. I've lined up the work and will report back as the departments make progress.",
    tasksCreated: ctx.tasksCreated ?? [],
    actions: ctx.actions ?? [],
  };
}
