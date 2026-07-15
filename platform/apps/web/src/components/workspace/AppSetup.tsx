"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { AgentId, AgentPreset } from "@/lib/workspace/agent-presets";
import { getAgentPreset } from "@/lib/workspace/agent-presets";
import { AgentComingToLife } from "@/components/workspace/AppSetupPanel";
import { SarahIcon } from "@/components/icons/sarah";
import { Button } from "@/components/ui/button";
import { patchOnboardedProfile } from "@/lib/org-cookie";
import type { ModuleStatus } from "@/lib/data/shared";

/**
 * The Lu-guided, two-panel agent HIRE — the same class as TeamSetup, not a card
 * wizard. Lu chats on the LEFT (a real Claude Haiku conversation via
 * /api/agent-setup/chat) and the RIGHT panel is the coworker coming to life as
 * she settles their leash + voice. Her tool calls come back as `actions`;
 * `set_choice` fills the live `config`, `finish` hires the agent (flips its
 * module live) and heads to its detail surface. Degrades to a manual
 * "Bring on board" button when the chat can't run (no API key).
 */

type Chat = { role: "user" | "assistant"; content: string };
type Action = { kind: "set_choice"; field: "leash" | "voice"; value: string } | { kind: "finish" };
type Config = { leash?: string; voice?: string };

export function AgentHire({
  agentId,
  onDone,
  onCancel,
}: {
  agentId: AgentId;
  /** called after the agent is hired (module flipped live) — navigate to its detail */
  onDone?: (id: AgentId) => void;
  onCancel?: () => void;
}) {
  const preset = getAgentPreset(agentId) as AgentPreset;

  const opener = React.useMemo(
    () =>
      `Let's get ${preset.label} on your team. First — how much rope should I have: ${preset.leashOptions
        .map((o) => o.label.toLowerCase())
        .join(", or ")}?`,
    [preset],
  );

  const [messages, setMessages] = React.useState<Chat[]>([{ role: "assistant", content: opener }]);
  const [config, setConfig] = React.useState<Config>({});
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [hiring, setHiring] = React.useState(false);
  const threadRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, hiring]);

  /** Flip the agent's module live, then head to its detail surface. */
  const hire = React.useCallback(
    (closer?: string) => {
      if (hiring) return;
      setHiring(true);
      if (closer) setMessages((m) => [...m, { role: "assistant", content: closer }]);
      patchOnboardedProfile({
        modules: { [agentId]: "live" } as Partial<Record<AgentId, ModuleStatus>>,
      });
      window.setTimeout(() => onDone?.(agentId), closer ? 1200 : 600);
    },
    [agentId, hiring, onDone],
  );

  const send = async () => {
    const text = input.trim();
    if (!text || busy || hiring) return;
    setInput("");
    const shown: Chat[] = [...messages, { role: "user", content: text }];
    setMessages(shown);
    setBusy(true);
    try {
      // drop the seeded opener (index 0) so the transcript starts with a user turn
      const res = await fetch("/api/agent-setup/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent: agentId, messages: shown.slice(1) }),
      });
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "In-app chat's still warming up — tap “Bring on board” and I'll get them started for you.",
          },
        ]);
        return;
      }
      const { reply, actions } = (await res.json()) as { reply: string; actions: Action[] };
      if (actions?.length) {
        setConfig((prev) => {
          const next = { ...prev };
          for (const a of actions) {
            if (a.kind === "set_choice" && (a.field === "leash" || a.field === "voice")) next[a.field] = a.value;
          }
          return next;
        });
      }
      if (reply) setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (actions?.some((a) => a.kind === "finish")) hire(); // reply already carried the closing line
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I hit a snag — mind saying that once more?" }]);
    } finally {
      setBusy(false);
    }
  };

  const finishLine = `Done — ${preset.label} is on the team. I'll take it from here.`;

  return (
    <div className="flex h-full min-h-[34rem] gap-4">
      {/* left — Lu */}
      <div className="flex w-full max-w-sm shrink-0 flex-col overflow-hidden rounded-3xl border bg-card">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <SarahIcon className="size-5" />
          <span className="text-sm font-semibold">Lu</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" /> hiring {preset.label}
          </span>
        </header>

        <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {m.content}
              </p>
            ) : (
              <div key={i} className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                  {m.content}
                </span>
              </div>
            ),
          )}
          {busy && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Lu&rsquo;s thinking…
            </p>
          )}
          {hiring && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Bringing {preset.label} on board…
            </p>
          )}
        </div>

        <div className="border-t px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              placeholder={`Tell Lu how you want ${preset.label.toLowerCase()}…`}
              disabled={hiring}
              className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring disabled:opacity-60"
            />
            <Button type="submit" size="sm" className="h-9" disabled={busy || hiring || !input.trim()}>
              Send
            </Button>
          </form>
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              disabled={hiring}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Not now
            </button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => hire(finishLine)} disabled={busy || hiring}>
              Bring on board <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* right — the agent coming to life */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border">
        <AgentComingToLife preset={preset} config={config} />
      </div>
    </div>
  );
}
