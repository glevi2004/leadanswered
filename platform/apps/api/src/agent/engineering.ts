import {
  generateText,
  stepCountIs,
  InvalidToolInputError,
  NoSuchToolError,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { getModel, recommendModel } from "@leadanswered/core";
import type { ArtifactRecord } from "../store/types.js";
import {
  engineeringTools,
  resolveConnectedContext,
  resolveEngineeringDepsForOrg,
  slugify,
  type EngineeringAction,
  type EngineeringContext,
  type EngineeringToolDeps,
} from "./engineeringTools.js";
import { meterLlm } from "./metering.js";
import { postToThread, recordEvent } from "./journal.js";
import { superviseAfterRun } from "./supervise.js";

/**
 * Absolute ceiling on ONE Engineering turn (model latency + every tool step). A hard
 * backstop over the per-step timeouts: if the whole turn somehow exceeds this, generateText
 * aborts and rejects, so the run fails cleanly instead of hanging (docs/cockpit.md Part 1).
 */
const ENGINEERING_TURN_TIMEOUT_MS = Number(process.env.ENGINEERING_TURN_TIMEOUT_MS) || 900_000; // 15 min

/**
 * A thrown error inside a tool's `execute` is CAPTURED by the AI SDK as a `tool-error`
 * content part — `generateText` then resolves normally instead of rejecting. That is why a
 * hung/failed build could leave the run looking "done" and the Task stuck. So after the loop
 * we scan the steps for tool-errors and re-throw, which fails the run cleanly (the throw
 * reaches runEngineering → the worker/dispatch failed-handler marks the Task `failed`).
 * Pure model-call mistakes (bad tool input, unknown tool) are excluded — the model can retry
 * those within the loop; only genuine execution failures (incl. timeouts) are fatal.
 */
function firstFatalToolError(
  steps: ReadonlyArray<{ content: ReadonlyArray<{ type: string; toolName?: string; error?: unknown }> }>,
): { toolName: string; error: unknown } | null {
  for (const step of steps) {
    for (const part of step.content) {
      if (part.type !== "tool-error") continue;
      if (part.error instanceof InvalidToolInputError || part.error instanceof NoSuchToolError) continue;
      return { toolName: part.toolName ?? "unknown", error: part.error };
    }
  }
  return null;
}

/**
 * The ENGINEERING agent (AGENTS-BACKEND §6, ENGINEERING-AGENT §5) — the flagship
 * department agent that builds AND ships real software: marketing/booking sites,
 * internal tools, integrations. Same runtime as the SMS agent (`runner.ts`) and
 * the Lu orchestrator (`orchestrator.ts`): an AI-SDK `generateText` tool-loop
 * bounded by `stepCountIs`, telemetry on, deterministic tool bodies over the
 * ports. It runs on the coding-tier model from the gateway (§5b — Opus).
 *
 * The loop: create_site → run_coding_agent (in an e2b sandbox) → generate_image →
 * open_preview (PR + Vercel preview, task → needs_approval) → request_publish
 * (stages an Approval). It NEVER publishes itself: publishing is `confirmPublish`
 * below — a server action gated on an owner-approved Approval.
 */

/** Deps for a run — the tool deps (Store required, infra ports optional) plus an optional model override. */
export interface EngineeringDeps extends EngineeringToolDeps {
  /** Optional override; defaults to the coding-tier model from the core gateway (§5b). */
  model?: LanguageModel;
}

/** A prior turn of the Engineering conversation. */
export interface EngineeringMessage {
  role: "user" | "assistant";
  content: string;
}

export interface EngineeringInput {
  orgId: string;
  /** The latest instruction (from the owner or from Lu delegating a task). */
  message: string;
  /** Prior turns of this conversation, if any. */
  history?: EngineeringMessage[];
  /** The Task this run executes, if any — flipped to `needs_approval` at the preview/publish gate. */
  taskId?: string;
  /** Optional model id override (e.g. from Task.model / Agent.models) — defaults to the coding-tier pick. */
  modelId?: string;
}

export interface EngineeringResult {
  /** The Engineer's plain-language reply (what it built, the preview link, what it needs next). */
  reply: string;
  /** Artifacts produced this run (agent_session, pr_diff, site_preview, image). */
  artifacts: ArtifactRecord[];
  /** Side-effects for the dock (site created, preview ready, approval needed). */
  actions: EngineeringAction[];
}

/** The Engineer's system prompt — build + ship, use the sandbox, preview for approval, never over-claim. */
function systemPrompt(): string {
  return [
    "You are the Engineer, the engineering department agent of an AI operating system for a service business. You build and ship real software: marketing and booking sites, internal tools, and integrations. You do real infrastructure work, not suggestions.",
    "How you work, every time:",
    "1) If there is no repo yet for what you are building, call create_site to stand up a repo from a starter template. BUT if the task is about an EXISTING project (listed under PROJECTS below when any exist), do NOT create_site — go straight to run_coding_agent with that project's repoFullName, and use its siteId for open_preview.",
    "2) Call run_coding_agent to make the actual changes. It spins up an isolated sandbox, clones the repo, runs a coding agent (Claude Code or Codex) with your instructions, then commits and pushes the build branch. Give it a clear, specific prompt describing exactly what to build or change.",
    "3) If the site needs imagery, call generate_image and reference the returned artifact when you wire it in.",
    "4) When the work is on a branch, call open_preview to open a pull request and get a live preview deployment. The preview URL and the diff are saved as artifacts for the owner to review.",
    "5) Call verify_acceptance to check the build against the plan's acceptance criteria. If it does NOT pass, fix the returned 'unmet' items by calling run_coding_agent again with those specific fixes, then call verify_acceptance again. Repeat until it passes or you have tried a couple of times.",
    "6) Only once verify_acceptance passes, and the owner wants to go live, call request_publish. This does NOT publish; it stages an approval for the owner.",
    "Hard rules:",
    "- Do not call request_publish until verify_acceptance passes.",
    "- Never say a site is live or published unless it has actually been published through an approved publish. Opening a preview is NOT publishing.",
    "- Prefer one preview the owner can approve over guessing. Surface the preview link and ask for a yes before anything goes to production.",
    "- Work only inside the sandbox and the scoped repo; keep secrets there.",
    "Keep replies short and plain, like a senior engineer updating a founder: what you built, the preview link, and what you need next. Never use em-dashes.",
  ].join("\n");
}

/**
 * Run one Engineering turn. The model reasons over the conversation, calls the
 * deterministic port-backed tools (which create the repo, drive the sandbox,
 * open the preview, and stage the publish approval), and returns a reply plus the
 * artifacts + actions produced — read off the shared `ctx` after the loop (the
 * orchestrator collector pattern).
 */
export async function runEngineering(
  deps: EngineeringDeps,
  input: EngineeringInput,
): Promise<EngineeringResult> {
  const modelId = input.modelId ?? recommendModel("coding", "text").id;
  const model = deps.model ?? getModel(modelId);
  const ctx: EngineeringContext = {
    orgId: input.orgId,
    taskId: input.taskId,
    artifacts: [],
    actions: [],
  };
  // BYO connect: bind Git + Deploy to THIS org's own connection tokens (env fallback).
  const runDeps = await resolveEngineeringDepsForOrg(deps, input.orgId);
  const tools = engineeringTools(runDeps, ctx);
  // Working-set context injection (docs/cockpit.md Part E): resolve the resources the owner
  // wired to the Engineer on the canvas (reads-edges → notes/files/sites) and prepend a bounded
  // "Connected context" block. Best-effort — returns "" (no-op) if nothing is connected or it fails.
  const connected = await resolveConnectedContext(deps.store, input.orgId);
  // Ladder step 2: the Engineer KNOWS the org's existing projects — tasks about one of them
  // build INTO it (no create_site), and open_preview gets its real siteId.
  const orgSites = await deps.store.listSites(input.orgId).catch(() => []);
  const projectsBlock =
    orgSites.length > 0
      ? [
          "PROJECTS (this org's existing repos/sites — for a task about one of these, SKIP create_site and use its repoFullName + siteId directly):",
          ...orgSites.map(
            (s) =>
              `- siteId=${s.id} repo=${s.repoFullName ?? "?"} kind=${s.kind} status=${s.status}${s.vercelProjectId ? " vercel=linked" : ""}`,
          ),
        ].join("\n")
      : "";
  const system = [systemPrompt(), connected, projectsBlock].filter(Boolean).join("\n\n");

  const messages = [
    ...(input.history ?? []),
    { role: "user" as const, content: input.message },
  ] as ModelMessage[];

  // Langfuse trace context: attribute the build to the org, tag it for filtering.
  const meta = {
    userId: input.orgId,
    tags: ["lu-engineering"],
    organizationId: input.orgId,
    ...(input.taskId ? { taskId: input.taskId } : {}),
  };

  // Agent status (docs/workflow.md §1 row hygiene): the Engineer shows `working` for the
  // duration of the run, `idle` after — so rosters and the canvas stop lying.
  const engineerAgent = await deps.store
    .getAgentByDepartment(input.orgId, "engineering")
    .catch(() => null);
  if (engineerAgent) {
    void deps.store.updateAgent(engineerAgent.id, { status: "working" }).catch(() => {});
  }

  try {
    const result = await generateText({
      model,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(10), // bound the build loop (create → code → image → preview → publish)
      timeout: { totalMs: ENGINEERING_TURN_TIMEOUT_MS }, // ultimate ceiling — the turn can never hang
      experimental_telemetry: { isEnabled: true, functionId: "lu-engineering-turn", metadata: meta },
    });
    void meterLlm(deps.store, input.orgId, modelId, result.usage, { taskId: input.taskId });

    // Fail clean: a tool that threw (e.g. a coding-step TIMEOUT) was swallowed into a tool-error
    // part, so re-throw here to end the run and let the Task go to `failed`.
    const fatal = firstFatalToolError(result.steps);
    if (fatal) {
      const detail = fatal.error instanceof Error ? fatal.error.message : String(fatal.error);
      throw new Error(`Engineering run failed at ${fatal.toolName}: ${detail}`);
    }

    let reply = result.text.trim();
    // Like runner.ts / orchestrator.ts: a turn that ends on a tool call (e.g. open_preview)
    // can leave no closing text. Force a short reply from the tool results so the Engineer
    // always reports back what it did.
    if (!reply) {
      const followup = await generateText({
        model,
        system,
        messages: [...messages, ...result.response.messages],
        tools,
        toolChoice: "none",
        timeout: { totalMs: 120_000 }, // a plain closing reply — keep it short and bounded
        experimental_telemetry: { isEnabled: true, functionId: "lu-engineering-closing", metadata: meta },
      });
      void meterLlm(deps.store, input.orgId, modelId, followup.usage, { taskId: input.taskId });
      reply = followup.text.trim();
    }

    return {
      reply: reply || "Done for now. I've saved the artifacts and will report back as the build progresses.",
      artifacts: ctx.artifacts ?? [],
      actions: ctx.actions ?? [],
    };
  } finally {
    if (engineerAgent) {
      void deps.store.updateAgent(engineerAgent.id, { status: "idle" }).catch(() => {});
    }
  }
}

/** The outcome of an approved publish. */
export interface ConfirmPublishResult {
  siteId: string;
  domain: string;
  url: string;
}

/**
 * Publish an approved site to production (AGENTS-BACKEND §6 rung v0 step 4). This
 * is the gated action `request_publish` staged — NOT a model tool. It runs only
 * after the owner approves the Approval, from the server (the dock's Publish
 * button / the approval-resolution handler). It merges the PR, promotes the build
 * to Vercel production, attaches `{slug}.lu.computer`, marks the Site live, and
 * resolves the Approval. It reads the PR number + sha off the Site's latest
 * preview Deployment (recorded by `open_preview`).
 */
export async function confirmPublish(
  deps: EngineeringToolDeps,
  { siteId, approvalId }: { siteId: string; approvalId: string },
): Promise<ConfirmPublishResult> {
  const site = await deps.store.getSite(siteId);
  if (!site) throw new Error(`confirmPublish: site ${siteId} not found`);
  if (!site.repoFullName) throw new Error(`confirmPublish: site ${siteId} has no repo`);
  if (!site.vercelProjectId) throw new Error(`confirmPublish: site ${siteId} has no Vercel project`);

  // BYO connect: publish through the site owner's OWN Git + Vercel connection (env fallback).
  const d = await resolveEngineeringDepsForOrg(deps, site.orgId);

  // The preview Deployment open_preview recorded carries the PR number + sha to publish.
  const deployments = await d.store.listDeployments(siteId);
  const preview = [...deployments].reverse().find((x) => x.env === "preview" && x.prNumber != null);
  if (!preview || preview.prNumber == null) {
    throw new Error(`confirmPublish: no preview PR recorded for site ${siteId}`);
  }

  // 1) Merge the PR.
  await d.git.mergePR(site.repoFullName, preview.prNumber);
  // 2) Promote the reviewed build to production.
  const prod = await d.deploy.promoteToProd(site.vercelProjectId, preview.sha ?? "");
  // 3) Domain (BYO honesty, harness-spec §"reliability"): `{slug}.lu.computer` only makes sense
  // on the PLATFORM's Vercel (where the wildcard lives). On a customer's own Vercel (BYO
  // connection present) we don't assume our domain — the live URL is their Vercel production
  // URL, and a custom domain is a later, owner-driven step. Attach is best-effort either way:
  // a failed domain attach must never fail an approved publish.
  const byoVercel = Boolean((await d.store.getVercelConnection(site.orgId).catch(() => null))?.accessToken);
  let domain = prod.url.replace(/^https?:\/\//, "");
  if (!byoVercel) {
    const luDomain = `${slugify(site.repoFullName.split("/").pop() ?? siteId)}.lu.computer`;
    try {
      await d.deploy.addDomain(site.vercelProjectId, luDomain);
      domain = luDomain;
    } catch (err) {
      console.error(`[confirmPublish] domain attach failed (continuing with the Vercel URL):`, err);
    }
  }
  // 4) Mark the Site live + record the production Deployment.
  await d.store.updateSite(siteId, { status: "live", domain });
  await d.store.addDeployment({
    siteId,
    env: "production",
    url: prod.url,
    sha: preview.sha,
    prNumber: preview.prNumber,
    status: "READY",
  });
  // 5) Resolve the Approval — and close the loop (docs/workflow.md §1/§3): the task goes
  // to `done` (previously nothing ever wrote `done`), the journal records `published`,
  // and Lu's thread gets the report-back.
  const approval = await d.store.resolveApproval(approvalId, "approved", "owner");
  if (approval.taskId) {
    await d.store
      .updateTaskStatus(approval.taskId, "done")
      .catch((e) => console.error(`[confirmPublish] could not mark task done:`, e));
  }
  const liveUrl = `https://${domain}`;
  await recordEvent(d.store, {
    orgId: site.orgId,
    taskId: approval.taskId ?? null,
    kind: "published",
    message: `Published: ${site.repoFullName} → ${domain}`,
    payload: { siteId, domain, url: liveUrl },
  });
  await postToThread(d.store, site.orgId, `It's live: ${liveUrl}. The PR is merged and production is promoted.`, {
    kind: "published",
    taskId: approval.taskId ?? undefined,
    url: liveUrl,
  });
  // Supervision: a published child may complete its parent's cascade.
  if (approval.taskId) await superviseAfterRun(d.store, site.orgId, approval.taskId, "ok");

  return { siteId, domain, url: prod.url };
}
