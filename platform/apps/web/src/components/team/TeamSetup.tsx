"use client";

import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import type { Member } from "@/lib/data/team/types";
import { TeamGraph } from "@/components/team/TeamGraph";
import { LuIcon } from "@/components/icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * TEAM-GRAPH — the two-panel team setup: Lu chats on the left (a REAL Claude
 * Haiku conversation via /api/team/chat), the org graph grows on the right as
 * she adds people. Same component in onboarding (last step) and the Team page.
 * The AI's tool calls come back as `actions`; we apply them to the member list.
 */

type Chat = { role: "user" | "assistant"; content: string };
type Action =
  | { kind: "add"; name: string; title?: string; phone?: string; email?: string; skills?: string[]; notes?: string }
  | { kind: "reports_to"; teammate: string; manager: string }
  | { kind: "finish" };

const nowIso = () => new Date().toISOString();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const firstName = (s: string) => s.trim().split(/\s+/)[0] || "there";

function ownerMember(ownerName: string): Member {
  return {
    id: "owner",
    name: ownerName || "You",
    phone: "",
    roleKey: "owner",
    smsStatus: "active",
    appAccess: "active",
    notifications: [],
    lastActiveAt: nowIso(),
    createdAt: nowIso(),
  };
}

/** Apply the AI's tool actions to the member list (adds first, then the report-to edges). */
function reduceMembers(prev: Member[], actions: Action[], ownerName: string): Member[] {
  let next = [...prev];
  const isOwnerRef = (name: string) =>
    ["me", "myself", "owner", "i", "the owner", ownerName.trim().toLowerCase()].includes(name.trim().toLowerCase());

  for (const a of actions) {
    if (a.kind !== "add") continue;
    const learned = {
      ...(a.title ? { title: a.title } : {}),
      ...(a.skills?.length ? { skills: a.skills } : {}),
      ...(a.notes ? { summary: a.notes } : {}),
      source: "told" as const,
    };
    const existing = next.find((m) => m.name.toLowerCase() === a.name.toLowerCase());
    if (existing) {
      next = next.map((m) =>
        m.id === existing.id
          ? { ...m, phone: a.phone || m.phone, email: a.email || m.email, learned: { ...m.learned, ...learned } }
          : m,
      );
    } else {
      next.push({
        id: `mem_${slug(a.name)}_${next.length}`,
        name: a.name,
        phone: a.phone ?? "",
        email: a.email,
        roleKey: "crew",
        smsStatus: "pending_hello",
        appAccess: "none",
        notifications: [],
        createdAt: nowIso(),
        reportsTo: "owner",
        learned,
      });
    }
  }

  const findId = (name: string) => (isOwnerRef(name) ? "owner" : next.find((m) => m.name.toLowerCase() === name.trim().toLowerCase())?.id);
  for (const a of actions) {
    if (a.kind !== "reports_to") continue;
    const tId = findId(a.teammate);
    const mId = findId(a.manager);
    if (tId && mId && tId !== mId) next = next.map((m) => (m.id === tId ? { ...m, reportsTo: mId } : m));
  }
  return next;
}

export function TeamSetup({
  ownerName,
  initialMembers = [],
  onMembersChange,
  onDone,
  onSkip,
  skipLabel = "Skip for now",
  doneLabel = "Done",
  className,
}: {
  ownerName: string;
  initialMembers?: Member[];
  onMembersChange?: (members: Member[]) => void;
  onDone?: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  doneLabel?: string;
  className?: string;
}) {
  const [members, setMembers] = React.useState<Member[]>(() =>
    initialMembers.some((m) => m.roleKey === "owner") ? initialMembers : [ownerMember(ownerName), ...initialMembers],
  );
  const [messages, setMessages] = React.useState<Chat[]>([
    { role: "assistant", content: `Let's set up your team, ${firstName(ownerName)}. Who's first — their name and what they do?` },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const threadRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => { onMembersChange?.(members); }, [members]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const shown: Chat[] = [...messages, { role: "user", content: text }];
    setMessages(shown);
    setBusy(true);
    try {
      // drop the seeded opener (index 0) so the transcript starts with a user turn
      const res = await fetch("/api/team/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: shown.slice(1) }),
      });
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: "In-app chat's still warming up — you can add people from the Team table for now." }]);
        return;
      }
      const { reply, actions } = (await res.json()) as { reply: string; actions: Action[] };
      if (actions?.length) setMembers((prev) => reduceMembers(prev, actions, ownerName));
      if (reply) setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (actions?.some((a) => a.kind === "finish")) onDone?.();
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I hit a snag — mind saying that once more?" }]);
    } finally {
      setBusy(false);
    }
  };

  const teammateCount = members.filter((m) => m.roleKey !== "owner").length;

  // Finishing: Lu confirms she'll invite everyone, then we move on.
  const handleDone = () => {
    if (busy) return;
    const teammates = members.filter((m) => m.roleKey !== "owner");
    if (teammates.length > 0) {
      const who = teammates.length === 1 ? teammates[0].name.split(/\s+/)[0] : `all ${teammates.length}`;
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `On it — I'll text and email ${who} an invite to join your team. Setting up your workspace now…` },
      ]);
      window.setTimeout(() => onDone?.(), 1600);
    } else {
      onDone?.();
    }
  };

  return (
    <div className={cn("flex min-h-0 gap-4", className)}>
      {/* left — Lu */}
      <div className="flex w-full max-w-sm shrink-0 flex-col overflow-hidden rounded-3xl border bg-card">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <LuIcon className="size-5" />
          <span className="text-sm font-semibold">Lu</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" /> building your team
          </span>
        </header>
        <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((m, i) =>
            m.role === "assistant" ? (
              <p key={i} className="text-sm leading-relaxed text-foreground">{m.content}</p>
            ) : (
              <div key={i} className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">{m.content}</span>
              </div>
            ),
          )}
          {busy && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Lu's thinking…
            </p>
          )}
        </div>
        <div className="border-t px-3 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              placeholder="Tell Lu about someone…"
              className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <Button type="submit" size="sm" className="h-9" disabled={busy || !input.trim()}>Send</Button>
          </form>
          {(onSkip || onDone) && (
            <div className="mt-2 flex items-center justify-between">
              {onSkip ? (
                <button type="button" onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">{skipLabel}</button>
              ) : <span />}
              {onDone && (
                <Button size="sm" variant={teammateCount > 0 ? "default" : "outline"} className="h-8 gap-1.5" onClick={handleDone} disabled={busy}>
                  {doneLabel} <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* right — the graph canvas grows here */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-3xl border bg-background">
        <TeamGraph members={members} />
      </div>
    </div>
  );
}
