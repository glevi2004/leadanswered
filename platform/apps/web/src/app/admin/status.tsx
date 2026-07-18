"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AccountStatus } from "@/lib/organizations";
import { accountMeta, type Variant } from "./status-meta";

/** A status chip whose meaning shows in a real tooltip on hover/focus (delay 0). */
function Chip({ label, variant, hint }: { label: string; variant: Variant; hint: string }) {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={<Badge variant={variant}>{label}</Badge>} />
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AccountBadge({ status }: { status: AccountStatus }) {
  const a = accountMeta[status] ?? accountMeta.none;
  return <Chip label={a.label} variant={a.variant} hint={a.hint} />;
}
