"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Two-letter initials for the avatar (first + last word, or first two letters). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The account button — top-left of the app (replaces the old nav sidebar's identity block).
 * A floating glass pill (avatar + company name) that opens a dropdown: Settings, Team, Log out.
 */
export function UserMenu({ companyName }: { companyName: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="press flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 text-sm outline-none transition-colors hover:bg-muted/70">
        <span className="gloss-ink grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white">
          {initials(companyName)}
        </span>
        <span className="max-w-[150px] truncate font-medium text-foreground">{companyName}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/team")}>
          <Users className="size-4" /> Team
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            window.location.href = "/auth/signout";
          }}
        >
          <LogOut className="size-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
