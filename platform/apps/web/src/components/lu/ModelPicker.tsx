"use client";

import { Check, ChevronDown } from "lucide-react";
import { LU_MODELS } from "@/lib/lu-models";
import { ProviderLogo } from "@/components/icons/provider-logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLu } from "./lu-context";
import { cn } from "@/lib/utils";

/**
 * The Lu model picker — a compact dropdown that sets which model powers the orchestrator
 * this conversation. Each model shows its PROVIDER'S LOGO (Anthropic · OpenAI · Google) so
 * the brand reads at a glance; the trigger shows the active model's logo + label. The choice
 * is held in lu-context (`selectedModel`) and posted to /api/lu/chat as `modelId`, which
 * the api resolves via the core gateway's getModel(id).
 */
export function ModelPicker({ className = "" }: { className?: string }) {
  const { selectedModel, setSelectedModel } = useLu();
  const active = LU_MODELS.find((m) => m.id === selectedModel) ?? LU_MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Model powering Lu"
        title="Model powering Lu"
        className={cn(
          "flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <ProviderLogo provider={active.provider} className="size-3 shrink-0" />
        <span>{active.label}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {LU_MODELS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            className="flex items-start gap-2"
          >
            <ProviderLogo provider={m.provider} className="mt-0.5 size-3.5 shrink-0 text-foreground" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                {m.recommended && (
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    Recommended
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{m.hint}</span>
            </span>
            {m.id === selectedModel && <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
