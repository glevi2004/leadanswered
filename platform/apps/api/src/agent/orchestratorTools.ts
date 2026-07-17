import { tool } from "ai";
import { z } from "zod";
import type { Store } from "../store/types.js";
import { dispatchBuild } from "./dispatch.js";
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

/** A non-blocking question Lu surfaced for the owner (rendered as an AskUserQuestion in the Lu dock). */
export interface OrchestratorAction {
  type: "ask_user";
  question: string;
  options?: string[];
}

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
        "Check which of the owner's OWN accounts are connected: their GitHub, Vercel, and Supabase. Use this whenever the owner asks whether you have their connections, and before dispatching a build so you can tell them exactly what is missing. GitHub AND Vercel are BOTH required to build and deploy a site; Supabase is only needed for a database-backed app. Report the result plainly.",
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

    list_status: tool({
      description:
        "Get the current state of the org's work: total tasks with counts by status and by department, plus the roster of agents. Read this before planning so you don't duplicate work already underway, and when reporting progress back to the owner.",
      inputSchema: z.object({}),
      execute: async () => {
        const [tasks, agents] = await Promise.all([
          deps.store.listTasks(ctx.orgId),
          deps.store.listAgents(ctx.orgId),
        ]);
        return {
          totalTasks: tasks.length,
          byStatus: countBy(tasks, (t) => t.status),
          byDepartment: countBy(tasks, (t) => t.departmentKey),
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
        return { asked: true as const, question };
      },
    }),
  };
}
