import { tool } from "ai";
import { z } from "zod";
import type { Store } from "../store/types.js";
import { dispatchBuild } from "./dispatch.js";
import { recordEvent } from "./journal.js";
import { notifySlackApproval } from "../channels/slack.js";
import { orgHasConnections, connectionStatus } from "../connect/status.js";
import { usageThisPeriod } from "../billing/usage.js";

/**
 * The eight departments Lu delegates to (AGENTS-BACKEND §3). A task's
 * `departmentKey` is constrained to this set so Lu can only route work to a real
 * department.
 */
export const DEPARTMENTS = [
  "support",
  "operations",
  "finance",
  "legal",
  "engineering",
  "design",
  "marketing",
  "sales",
] as const;

/** Dependencies the orchestrator tools need — just the Store port (matches the buildTools subset). */
export interface OrchestratorToolDeps {
  store: Store;
}

/**
 * A structured Lu→UI action riding the turn's response (docs/workflow.md — the chat renders
 * these as real UI, not text): a non-blocking question (option buttons), or the connect form
 * rendered inline as part of Lu's reply.
 */
export type OrchestratorAction =
  | { type: "ask_user"; question: string; options?: string[] }
  | { type: "show_connect" };

/**
 * Per-run context + collectors shared across tool calls (the ownerTools `draft`
 * pattern). `orgId` scopes every read/write; `tasksCreated` + `actions` are
 * populated by the tools and read back by `runOrchestrator` after the loop. Both
 * collectors are optional on input and defaulted here, so callers may pass just
 * `{ orgId }`.
 */
export interface OrchestratorContext {
  orgId: string;
  /** Collector — `create_task` pushes each new task id here. */
  tasksCreated?: string[];
  /** Collector — `ask_user` pushes a prompt here (mirrors the web team-chat `actions[]`). */
  actions?: OrchestratorAction[];
}

/** Tally items by a string key — for the list_status status/department breakdowns. */
function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Lu the ORCHESTRATOR's toolkit (AGENTS-BACKEND §3). Same discipline as the SMS
 * agent's tools: the model CHOOSES tools; every side-effect is deterministic CODE
 * over the Store port, and the RESULT is authoritative. Lu delegates — none of
 * these tools do a department's actual work; they create/route tasks, read
 * status, and (non-blocking) ask the owner.
 */
export function orchestratorTools(deps: OrchestratorToolDeps, ctx: OrchestratorContext) {
  const tasksCreated = (ctx.tasksCreated ??= []);
  const actions = (ctx.actions ??= []);

  return {
    create_task: tool({
      description:
        "Create a task for one of the eight departments to carry out. This is how you decompose the owner's goal into concrete units of work and DELEGATE — you never do the work yourself. Choose the department that OWNS the work, give it a short imperative title, and a body the department agent can act on (the goal, constraints, and any facts you've gathered). Prefer a few well-scoped tasks over one vague one.",
      inputSchema: z.object({
        departmentKey: z
          .enum(DEPARTMENTS)
          .describe("Which department owns this task"),
        title: z.string().describe("Short imperative title, e.g. 'Draft the homepage copy'"),
        body: z
          .string()
          .describe("What the department agent needs in order to do it — goal, constraints, and any facts you gathered"),
      }),
      execute: async ({ departmentKey, title, body }) => {
        const task = await deps.store.createTask({
          orgId: ctx.orgId,
          departmentKey,
          title,
          body,
          status: "agent_can_do",
          assignedBy: "lu",
        });
        tasksCreated.push(task.id);
        return { taskId: task.id };
      },
    }),

    assign_to_department: tool({
      description:
        "Move an existing task to a different department when it belongs elsewhere. Pass the taskId (from create_task or list_status) and the department to move it to.",
      inputSchema: z.object({
        taskId: z.string().describe("The task to reassign"),
        departmentKey: z.enum(DEPARTMENTS).describe("The department to move it to"),
      }),
      execute: async ({ taskId, departmentKey }) => {
        const existing = await deps.store.getTask(taskId);
        if (!existing || existing.orgId !== ctx.orgId) {
          return { ok: false as const, reason: "task_not_found" };
        }
        const task = await deps.store.updateTask(taskId, { departmentKey });
        return { ok: true as const, taskId: task.id, departmentKey: task.departmentKey };
      },
    }),

    check_connections: tool({
      description:
        "Check which of the owner's OWN accounts are connected: their GitHub, Vercel, and Supabase. Use this whenever the owner asks whether you have their connections, and before dispatching a build so you can tell them exactly what is missing. GitHub AND Vercel are BOTH required to build and deploy a site; Supabase is only needed for a database-backed app. Report the result plainly. If something is missing and the owner should connect it NOW, follow up with show_connect_form.",
      inputSchema: z.object({}),
      execute: async () => {
        const s = await connectionStatus(deps.store, ctx.orgId);
        return {
          github: s.github,
          vercel: s.vercel,
          supabase: s.supabase,
          readyToBuild: s.github && s.vercel,
          missing: [!s.github ? "GitHub" : null, !s.vercel ? "Vercel" : null].filter(Boolean),
        };
      },
    }),

    show_connect_form: tool({
      description:
        "Show the owner the CONNECT FORM right here in the chat (GitHub · Vercel · Supabase, token paste). Call this whenever the owner wants to connect an account, or a build is blocked on a missing connection — the form renders as part of your reply, so NEVER describe manual steps or point them at a settings page. Returns the current status; accompany it with ONE short line (e.g. \"Here's the form — paste your GitHub token and we're set.\").",
      inputSchema: z.object({}),
      execute: async () => {
        const s = await connectionStatus(deps.store, ctx.orgId);
        actions.push({ type: "show_connect" });
        return {
          shown: true as const,
          github: s.github,
          vercel: s.vercel,
          supabase: s.supabase,
          readyToBuild: s.github && s.vercel,
        };
      },
    }),

    dispatch_to_engineering: tool({
      description:
        "Start the Engineering agent BUILDING an engineering task now. Call this right after create_task (departmentKey 'engineering') to actually kick off the build: the Engineer stands up a repo, writes the code in a sandbox, opens a preview, and stages a publish approval for the owner. Pass the taskId you just created. You never build anything yourself — the Engineer only runs when you dispatch it. The build runs in the background; the owner watches it in the dock. Only dispatch engineering tasks.",
      inputSchema: z.object({
        taskId: z.string().describe("The engineering task to build (from create_task)"),
      }),
      execute: async ({ taskId }) => {
        const task = await deps.store.getTask(taskId);
        if (!task || task.orgId !== ctx.orgId) {
          return { ok: false as const, reason: "task_not_found" };
        }
        if (task.departmentKey !== "engineering") {
          return { ok: false as const, reason: "not_an_engineering_task" };
        }
        // BYO connect gate: don't dispatch until the org connected its OWN GitHub + Vercel
        // (docs/byo-connect.md). Lu should tell the owner to connect, then retry.
        if (!(await orgHasConnections(deps.store, ctx.orgId))) {
          return { ok: false as const, reason: "not_connected" as const };
        }
        // Usage-bucket gate (plan Pillar 2): don't start a build once the org is over its compute
        // bucket and has NOT opted into overage. Lu should tell the owner they're out of compute.
        const usage = await usageThisPeriod(deps.store, ctx.orgId);
        if (usage.overBucket && !usage.overageOptIn) {
          return { ok: false as const, reason: "not_enough_credit" as const };
        }
        await dispatchBuild(
          { store: deps.store },
          { orgId: ctx.orgId, taskId: task.id, message: task.body?.trim() || task.title },
        );
        return { ok: true as const, taskId: task.id, dispatched: true };
      },
    }),

    propose_plan: tool({
      description:
        "Draft a PLAN for an engineering build and put it in front of the owner to APPROVE before anything is built. Use this for any 'build me X / make me Y / add / change' request INSTEAD of dispatching immediately. Give a short title, a one-line objective, the ordered steps the Engineer will take, and acceptance criteria (how the owner will know it is done). This creates the engineering task (NOT building yet), writes the plan as a doc the owner can read, and stages a plan approval. When the owner approves it in the dock, the Engineer starts building automatically — you do NOT dispatch it yourself. Tell the owner you have drafted a plan for their approval, and note any missing connections.",
      inputSchema: z.object({
        title: z.string().describe("Short name for what you are building, e.g. 'Marketing site'"),
        objective: z.string().describe("One line: what this delivers for the owner"),
        steps: z.array(z.string()).describe("The ordered approach the Engineer will take (3-7 concrete steps)"),
        acceptance: z
          .array(z.string())
          .describe("How we will know it is done: testable criteria (pages, flows, checks)"),
      }),
      execute: async ({ title, objective, steps, acceptance }) => {
        const task = await deps.store.createTask({
          orgId: ctx.orgId,
          departmentKey: "engineering",
          title,
          body: objective,
          status: "agent_can_do", // planned but NOT dispatched — the plan gate holds it
          acceptance, // the Outcome tier lives ON the task (harness-spec §2 P2)
          assignedBy: "lu",
        });
        await deps.store.addArtifact({
          orgId: ctx.orgId,
          taskId: task.id,
          kind: "doc",
          title: `Plan — ${title}`,
          payload: { type: "plan", objective, steps, acceptance },
        });
        const approval = await deps.store.createApproval({
          orgId: ctx.orgId,
          taskId: task.id,
          action: "approve_plan",
        });
        tasksCreated.push(task.id);
        await recordEvent(deps.store, {
          orgId: ctx.orgId,
          taskId: task.id,
          kind: "plan_proposed",
          message: `Plan proposed: ${title}`,
          payload: { objective, steps, acceptance },
        });
        // Slack (ladder step 4): the plan gate as buttons in the channel.
        void notifySlackApproval(ctx.orgId, "approve_plan", title, approval.id);
        const s = await connectionStatus(deps.store, ctx.orgId);
        return {
          ok: true as const,
          taskId: task.id,
          approvalId: approval.id,
          planned: true,
          readyToBuild: s.github && s.vercel,
          missingConnections: [!s.github ? "GitHub" : null, !s.vercel ? "Vercel" : null].filter(Boolean),
        };
      },
    }),

    spawn_agent: tool({
      description:
        "Split a BIG approved goal into ORDERED sub-tasks under a parent task, each run by its own agent in sequence. Call once per sub-task, in the order they must run, passing the parent taskId (usually the approved plan's task). The first sub-task starts building immediately; each later one waits for the one before it (the system supervises the cascade: it dispatches the next sub-task when one finishes, pauses everything and asks the owner if one fails, and completes the parent when all are done — reporting progress into the chat as it goes). Use this for multi-part builds (e.g. site + admin panel + API); for a single build just use propose_plan. Engineering sub-tasks only for now.",
      inputSchema: z.object({
        parentTaskId: z.string().describe("The parent task this sub-task belongs to (from propose_plan/create_task)"),
        title: z.string().describe("Short imperative title for this sub-task"),
        body: z.string().describe("What this sub-task's agent must do — self-contained instructions"),
        acceptance: z
          .array(z.string())
          .optional()
          .describe("Testable criteria for THIS sub-task (verified before its publish)"),
      }),
      execute: async ({ parentTaskId, title, body, acceptance }) => {
        const parent = await deps.store.getTask(parentTaskId);
        if (!parent || parent.orgId !== ctx.orgId) {
          return { ok: false as const, reason: "task_not_found" as const };
        }
        const siblings = (await deps.store.listTasks(ctx.orgId)).filter(
          (t) => t.parentTaskId === parentTaskId,
        );
        // Ordered cascade: only the FIRST unfinished sub-task runs; later ones queue at
        // needs_earlier and the supervisor (agent/supervise.ts) advances them in turn.
        const mustWait = siblings.some((t) => t.status !== "done" && t.status !== "failed");
        const child = await deps.store.createTask({
          orgId: ctx.orgId,
          departmentKey: "engineering",
          title,
          body,
          acceptance,
          parentTaskId,
          status: mustWait ? "needs_earlier" : "agent_can_do",
          assignedBy: "lu",
        });
        tasksCreated.push(child.id);
        await recordEvent(deps.store, {
          orgId: ctx.orgId,
          taskId: child.id,
          kind: "agent_spawned",
          message: `Spawned sub-task "${title}" under "${parent.title}"${mustWait ? " (queued)" : ""}`,
          payload: { parentTaskId },
        });
        if (mustWait) {
          return { ok: true as const, taskId: child.id, queued: true as const };
        }
        // First runnable sub-task — same gates as dispatch_to_engineering, then go.
        if (!(await orgHasConnections(deps.store, ctx.orgId))) {
          return { ok: true as const, taskId: child.id, queued: true as const, reason: "not_connected" as const };
        }
        const usage = await usageThisPeriod(deps.store, ctx.orgId);
        if (usage.overBucket && !usage.overageOptIn) {
          return { ok: true as const, taskId: child.id, queued: true as const, reason: "not_enough_credit" as const };
        }
        await deps.store.updateTaskStatus(parentTaskId, "in_progress").catch(() => {});
        await dispatchBuild(
          { store: deps.store },
          { orgId: ctx.orgId, taskId: child.id, message: body.trim() || title },
        );
        return { ok: true as const, taskId: child.id, queued: false as const, dispatched: true as const };
      },
    }),

    list_status: tool({
      description:
        "Get the current state of the org's work: the open tasks themselves (id, title, status, department), pending approvals, recent events, counts, and the roster of agents. Read this before planning so you don't duplicate work already underway, and when reporting progress back to the owner — cite the specific tasks, not just numbers.",
      inputSchema: z.object({}),
      execute: async () => {
        const [tasks, agents, approvals, events] = await Promise.all([
          deps.store.listTasks(ctx.orgId),
          deps.store.listAgents(ctx.orgId),
          deps.store.listPendingApprovals(ctx.orgId).catch(() => []),
          deps.store.listAgentEvents(ctx.orgId, 10).catch(() => []),
        ]);
        const open = tasks.filter((t) => t.status !== "done" && t.status !== "failed");
        return {
          totalTasks: tasks.length,
          byStatus: countBy(tasks, (t) => t.status),
          byDepartment: countBy(tasks, (t) => t.departmentKey),
          openTasks: open.slice(0, 15).map((t) => ({
            taskId: t.id,
            title: t.title,
            status: t.status,
            departmentKey: t.departmentKey,
          })),
          pendingApprovals: approvals.map((a) => ({
            approvalId: a.id,
            action: a.action,
            taskId: a.taskId,
          })),
          recentEvents: events.map((e) => ({ kind: e.kind, message: e.message, at: e.createdAt })),
          agents: agents.map((a) => ({
            name: a.name,
            departmentKey: a.departmentKey,
            role: a.role,
            status: a.status,
          })),
        };
      },
    }),

    ask_user: tool({
      description:
        "Ask the owner a clarifying question when you genuinely need a decision or a missing fact before you can plan or delegate. This does NOT block — it records the question for the owner to answer next. Keep going with whatever you can do without the answer, and tell them what you asked. Ask ONE specific question at a time.",
      inputSchema: z.object({
        question: z.string().describe("The single, specific question for the owner"),
        options: z
          .array(z.string())
          .optional()
          .describe("2-5 suggested answers, if it's a choice — rendered as buttons in the Lu dock"),
      }),
      execute: async ({ question, options }) => {
        actions.push({ type: "ask_user", question, ...(options ? { options } : {}) });
        await recordEvent(deps.store, {
          orgId: ctx.orgId,
          kind: "question_asked",
          message: question,
          payload: options ? { options } : undefined,
        });
        return { asked: true as const, question };
      },
    }),
  };
}
