import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config());

import { MemoryStore } from "../store/memoryStore.js";
import { runOrchestrator } from "../agent/orchestrator.js";

/**
 * P2 smoke — drive ONE scoping turn for three personas against the real model with an
 * in-memory store (no DB writes), and print what the tree does: the reply, the chips
 * (ask_user options + recommended), and any fields recorded. The three personas MUST get
 * visibly different interviews (Wing A vs Wing B vs Wing C).
 */

const PERSONAS: Array<{ name: string; message: string }> = [
  {
    name: "WING A — new SaaS founder",
    message:
      "I'm building an AI tool that helps landlords answer tenant maintenance requests automatically. Nothing built yet, I've talked to a few landlord friends about it.",
  },
  {
    name: "WING B — running agency owner",
    message:
      "I run a 12-person marketing agency, we've been going 8 years. Revenue is fine but flat, and honestly I'm drowning — everything goes through me. I want to grow but I can't take on more.",
  },
  {
    name: "WING C — build me X",
    message: "I just need a website for my pottery studio. Nothing fancy, a page with my classes and a way to book.",
  },
];

for (const p of PERSONAS) {
  const store = new MemoryStore();
  console.log(`\n━━━ ${p.name} ━━━`);
  console.log(`owner: ${p.message}\n`);
  try {
    const result = await runOrchestrator({ store }, { orgId: `smoke_${Date.now()}`, message: p.message, history: [] });
    console.log(`LU: ${result.reply}\n`);
    for (const a of result.actions) {
      if (a.type === "ask_user") {
        console.log(
          `CHIPS: ${a.question} → [${(a.options ?? []).map((o, i) => (a.recommended === i ? `⭐${o}` : o)).join(" | ")}]`,
        );
      }
    }
  } catch (err) {
    console.error("TURN FAILED:", err);
  }
}
