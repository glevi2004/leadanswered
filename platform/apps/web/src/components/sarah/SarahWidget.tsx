"use client";

import Link from "next/link";
import { ChevronDown, Maximize2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSarah } from "./sarah-context";
import { SarahThread } from "./SarahThread";
import { SarahComposer } from "./SarahComposer";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { SarahIcon } from "@/components/icons/sarah";

/**
 * The global Sarah widget (00 §3): Apollo-style launcher, bottom-right on every
 * page. Same thread as SMS and /sarah. Hidden on /sarah itself — that page IS
 * the full-screen version.
 */
export function SarahWidget() {
  const { widgetOpen, setWidgetOpen, pendingCount, approvals, messages, typing } = useSarah();
  const pathname = usePathname();
  if (pathname?.startsWith("/sarah")) return null;

  return (
    <>
      {widgetOpen && (
        <div
          className="widget-in fixed inset-x-3 bottom-20 z-50 flex flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-[0_12px_48px_rgba(16,24,40,0.22)] [--bubble-surface:var(--card)] sm:inset-x-auto sm:right-5 sm:w-[380px]"
          style={{ maxHeight: "min(640px, calc(100dvh - 7rem))", height: "min(640px, calc(100dvh - 7rem))" }}
        >
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="btn-glow flex size-7 items-center justify-center rounded-full">
                <SarahIcon className="size-3.5" />
              </span>
              <span className="text-sm font-semibold">Sarah</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" /> online
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <Link
                href="/sarah"
                aria-label="Open the full Sarah page"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setWidgetOpen(false)}
              >
                <Maximize2 className="size-4" />
              </Link>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setWidgetOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {approvals.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {approvals.map((a) => (
                  <ApprovalCard key={a.id} approval={a} compact />
                ))}
              </div>
            )}
            <SarahThread messages={messages} typing={typing} />
            <Link
              href="/sarah"
              className="mt-3 block text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => setWidgetOpen(false)}
            >
              See everything →
            </Link>
          </div>

          <div className="shrink-0 border-t px-3 py-2.5">
            <SarahComposer showContext />
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={widgetOpen ? "Close Sarah" : "Ask Sarah (⌘/)"}
        onClick={() => setWidgetOpen(!widgetOpen)}
        className="btn-glow fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full"
      >
        {widgetOpen ? (
          <ChevronDown className="size-6" />
        ) : (
          // Intercom-style mark: a white speech bubble — circle with one sharp corner.
          <span aria-hidden className="block size-6 rounded-full rounded-br-none bg-white" />
        )}
        {pendingCount > 0 && !widgetOpen && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white ring-2 ring-background">
            {pendingCount}
          </span>
        )}
      </button>
    </>
  );
}
