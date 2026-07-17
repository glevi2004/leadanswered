"use client";

import { LU_MODELS } from "@/lib/lu-models";
import { useSarah } from "./sarah-context";

/**
 * The Lu model picker — a compact dropdown that sets which model powers the orchestrator
 * this conversation. The choice is held in sarah-context (`selectedModel`) and posted to
 * /api/lu/chat as `modelId`, which the api resolves via the core gateway's getModel(id).
 */
export function ModelPicker({ className = "" }: { className?: string }) {
  const { selectedModel, setSelectedModel } = useSarah();
  return (
    <select
      aria-label="Model powering Lu"
      title="Model powering Lu"
      value={selectedModel}
      onChange={(e) => setSelectedModel(e.target.value)}
      className={`rounded-md border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
    >
      {LU_MODELS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
          {m.recommended ? " · recommended" : ""}
        </option>
      ))}
    </select>
  );
}
