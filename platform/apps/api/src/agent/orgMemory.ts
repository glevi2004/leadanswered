import type { Store } from "../store/types.js";

const MAX_ITEMS = 12;
const MAX_ITEM_CHARS = 500;
const MAX_TOTAL_CHARS = 4000;

/**
 * Build a bounded "what you know about this business" block for Lu's system prompt (plan Pillar 3,
 * Tiers 2/3 — core + long-term memory). Pulls core memory first (+ a little long-term), caps size,
 * and is BEST-EFFORT: any failure returns "" so a memory hiccup never breaks a turn. Mirrors the
 * Engineer's `resolveConnectedContext` injection pattern.
 */
export async function resolveOrgMemory(store: Store, orgId: string): Promise<string> {
  try {
    const [core, long] = await Promise.all([
      store.listMemory(orgId, "core"),
      store.listMemory(orgId, "longterm"),
    ]);
    const items = [...core, ...long].slice(0, MAX_ITEMS);
    if (!items.length) return "";

    let total = 0;
    const lines: string[] = [];
    for (const m of items) {
      const text = m.content.trim().slice(0, MAX_ITEM_CHARS);
      if (!text) continue;
      if (total + text.length > MAX_TOTAL_CHARS) break;
      total += text.length;
      lines.push(`- ${text}`);
    }
    if (!lines.length) return "";
    return `What you know about this business (your memory):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}
