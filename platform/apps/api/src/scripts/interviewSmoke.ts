import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config());

import type { Request, Response } from "express";
import { MemoryStore } from "../store/memoryStore.js";
import { createLuRoute } from "../routes/agents.js";

/**
 * P2 multi-turn smoke — walk a REAL interview through the REAL route handler
 * (thread persistence → history hydration with re-attached questions → orchestrator →
 * meta.choices persistence), simulating the owner tapping the question card's
 * recommended option each turn (plus one free-text "Other" answer). What treeSmoke
 * can't see: whether the tree stays coherent ACROSS turns — no re-asks, questions that
 * follow from the answers, read-backs, convergence.
 */

const TURNS = Number(process.env.SMOKE_TURNS ?? 8);

function fakeRes() {
  const r = {
    code: 200 as number,
    body: undefined as unknown,
    status(c: number) {
      r.code = c;
      return r;
    },
    json(b: unknown) {
      r.body = b;
      return r;
    },
  };
  return r;
}

const store = new MemoryStore();
const handler = createLuRoute({ store });
const orgId = "smoke_interview";

const opener =
  "I'm building an AI tool that helps landlords answer tenant maintenance requests automatically. Nothing built yet, I've talked to a few landlord friends about it.";

let next: string = opener;

for (let t = 1; t <= TURNS; t++) {
  console.log(`\n━━━ TURN ${t} ━━━`);
  console.log(`OWNER: ${next}`);
  const res = fakeRes();
  await handler({ body: { orgId, message: next } } as Request, res as unknown as Response);
  if (res.code !== 200) {
    console.error("ROUTE FAILED:", res.code, res.body);
    break;
  }
  const data = res.body as {
    reply: string;
    actions: Array<{ type: string; question?: string; options?: string[]; recommended?: number }>;
  };
  console.log(`LU: ${data.reply}`);
  const ask = data.actions.find((a) => a.type === "ask_user" && (a.options?.length ?? 0) > 0);
  if (ask) {
    console.log(
      `CARD: ${ask.question} → [${(ask.options ?? [])
        .map((o, i) => (ask.recommended === i ? `⭐${o}` : o))
        .join(" | ")}]`,
    );
    // Turn 3: answer via "Other" (free text) instead of tapping, like a real owner would.
    if (t === 3) {
      next = "Honestly the riskiest part is whether property managers will trust an AI to talk to tenants at all.";
    } else {
      next = ask.options?.[ask.recommended ?? 0] ?? ask.options?.[0] ?? "yes";
    }
  } else {
    // No card — converging (finalize) or a read-back. Nudge forward.
    next = "Sounds right, go ahead.";
  }
}

// What the interview captured — the growing Business Context draft + gates.
const arts = await store.listArtifacts({ orgId });
const ctxDoc = arts
  .filter((a) => a.kind === "doc" && (a.payload as { type?: string } | null)?.type === "business_context")
  .at(-1);
const approvals = await store.listPendingApprovals(orgId);
console.log(`\n━━━ END STATE ━━━`);
console.log("captured fields:", (ctxDoc?.payload as { fields?: Record<string, string> } | null)?.fields ?? {});
console.log("draft?", (ctxDoc?.payload as { draft?: boolean } | null)?.draft);
console.log("pending approvals:", approvals.map((a) => a.action));
