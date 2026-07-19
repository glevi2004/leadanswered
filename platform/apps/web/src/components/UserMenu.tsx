"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SettingsIcon, SignOutIcon, TeamIcon } from "@/components/icons/nav-icons";
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

const ITEMS = [
  { key: "settings", label: "Settings", Icon: SettingsIcon, href: "/settings" },
  { key: "team", label: "Team", Icon: TeamIcon, href: "/team" },
] as const;

/**
 * The account button — top-left of the app (replaces the old nav sidebar's identity block).
 * Avatar + company name → a dropdown of Settings, Team, Log out with the old nav icons (static).
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
        {ITEMS.map((it) => (
          <DropdownMenuItem
            key={it.key}
            className="gap-2.5 [&>svg]:size-[18px]"
            onClick={() => router.push(it.href)}
          >
            <it.Icon state="idle" />
            {it.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2.5 [&>svg]:size-[18px]"
          onClick={() => {
            window.location.href = "/auth/signout";
          }}
        >
          <SignOutIcon state="idle" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
