"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { Approval, LuAction, LuChoices, LuMessage } from "@/lib/data/shared";
import { MODULES, surfaceForPath } from "@/lib/data/registry";
import { DEFAULT_LU_MODEL } from "@/lib/lu-models";
import { CAPABILITIES } from "@/lib/workspace/capabilities";
import type { CapabilityKey } from "@/lib/workspace/capabilities";

/**
 * The one owner conversation, shared by the dock and /sarah (00 §3: three
 * surfaces, one thread). Every org talks to the REAL Lu (/api/lu/chat); the thread
 * starts honest-empty with a greeting.
 *
 * Escalations live here too (drift fix 2026-07-12): the pending badge is
 * approvals + open escalations on EVERY surface — sidebar, launcher, /sarah
 * tab, Home "Needs you" — one number, one meaning.
 */

export interface LuChat {
  id: string;
  title: string;
  messages: LuMessage[];
}

export interface OpenEscalation {
  id: string;
  question: string;
  contactName: string;
  contactId?: string;
  createdAt: string;
}

/**
 * One turn's worth of work Lu kicked off (the cockpit chat↔Engineer wire). When
 * /api/lu/chat returns `tasksCreated`, we record the ids here and the thread WATCHES
 * them unfold (LuBuildTracker polls /api/dock/tasks + /api/dock/artifacts for these ids:
 * queued → building → preview → needs-approval). Scoped to the chat it happened in.
 */
export interface BuildBatch {
  id: string;
  chatId: string;
  at: string; // ISO
  taskIds: string[];
}

/** The dock's cofounder-structured tabs (canvas.md §"the dock"). */
export type DockTab = "home" | "lu" | "company" | "tasks" | "library";

/**
 * A non-blocking clarifying question Lu raised (the orchestrator's `ask_user` tool). It
 * arrives inline on the /api/lu/chat response `actions[]` — there's no pollable store — so
 * we capture it here and the dock's Home surfaces it as a "Needs clarification" item until
 * the owner answers (in the Lu chat) or dismisses it.
 */
export interface Clarification {
  id: string;
  question: string;
  options?: string[];
  at: string; // ISO
}

interface LuState {
  ownerName: string;
  /** the org's chosen name for the assistant (default "Lu") — for conversational copy */
  assistantName: string;
  /** the ACTIVE chat's messages — consumers don't care about the history model */
  messages: LuMessage[];
  /** conversation history for the "New chat ▾" dropdown */
  chats: { id: string; title: string }[];
  activeChatId: string;
  switchChat: (id: string) => void;
  approvals: Approval[];
  escalations: OpenEscalation[];
  actions: LuAction[];
  /** builds Lu dispatched this session — the thread watches these unfold live */
  builds: BuildBatch[];
  /** approvals + open escalations — the one "needs you" number, all surfaces */
  pendingCount: number;
  typing: boolean;
  dockOpen: boolean;
  setDockOpen: (open: boolean) => void;
  openDock: (ctx?: { entity?: string }) => void;
  /** the record the owner was looking at when they asked ("Ask Lu about Dana") */
  contextEntity: string | null;
  /** the department/agent selected on the company canvas — drives the dock's agent view */
  selectedAgent: string | null;
  setSelectedAgent: (id: string | null) => void;
  /** the active dock tab (Home · Lu · Company · Tasks · Library) — lifted so any tab can navigate */
  dockTab: DockTab;
  setDockTab: (tab: DockTab) => void;
  /** the model powering Lu this conversation (dock picker) — posted to /api/lu/chat as modelId */
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  /** clarifying questions Lu raised (ask_user) — surfaced on Home until answered/dismissed */
  clarifications: Clarification[];
  dismissClarification: (id: string) => void;
  /** THE OPEN FRONTIER (roadmap P1): the latest Lu message's unanswered choices — the one
   *  source for the thread's chips AND Home's next-moves. Null when nothing is offered. */
  openChoices: (LuChoices & { messageId: string }) | null;
  sendMessage: (body: string) => void;
  /** Apollo-style "New chat": a fresh conversation; approvals/escalations untouched */
  startNewChat: () => void;
  approve: (id: string, editedPreview?: string) => void;
  decline: (id: string) => void;
  /** stage an answer to an escalation: prefills the composer; the next send resolves it */
  beginEscalationAnswer: (e: OpenEscalation) => void;
  /** prefill the Lu composer with text (Request-changes, canvas hand-offs) — user edits, then sends */
  prefillComposer: (text: string) => void;
  /** composer prefill handshake — composer reads it once, then clears */
  composerPrefill: string | null;
  consumePrefill: () => string | null;
  chipsForCurrentPage: string[];
  currentPageLabel: string | null;
}

const LuContext = React.createContext<LuState | null>(null);

export function useLu(): LuState {
  const ctx = React.useContext(LuContext);
  if (!ctx) throw new Error("useLu must be used inside <LuProvider>");
  return ctx;
}

let idCounter = 0;
const nextId = () => `local_${++idCounter}`;

/** Parse a persisted `Message.meta.choices` payload into LuChoices (defensive), or null. */
function choicesFromMeta(meta: Record<string, unknown> | null | undefined): LuChoices | null {
  const c = meta?.choices;
  if (!c || typeof c !== "object") return null;
  const cc = c as Record<string, unknown>;
  const options = Array.isArray(cc.options)
    ? cc.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")
    : [];
  if (options.length === 0) return null;
  return {
    options,
    ...(typeof cc.question === "string" ? { question: cc.question } : {}),
    ...(typeof cc.recommended === "number" ? { recommended: Math.trunc(cc.recommended) } : {}),
  };
}

export function LuProvider({
  ownerName,
  assistantName = "Lu",
  initialMessages,
  initialApprovals,
  initialActions,
  initialEscalations = [],
  initialPastChats = [],
  children,
}: {
  ownerName: string;
  assistantName?: string;
  initialMessages: LuMessage[];
  initialApprovals: Approval[];
  initialActions: LuAction[];
  initialEscalations?: OpenEscalation[];
  initialPastChats?: LuChat[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [chats, setChats] = React.useState<LuChat[]>(() => [
    {
      id: "chat_main",
      title: initialMessages.find((m) => m.role === "owner")?.body.slice(0, 24) ?? "New chat",
      messages: initialMessages,
    },
    ...initialPastChats,
  ]);
  const [activeChatId, setActiveChatId] = React.useState("chat_main");
  const activeChatIdRef = React.useRef(activeChatId);
  activeChatIdRef.current = activeChatId;
  // always-current view of the threads, so sendMessage can build the transcript
  // to POST without re-creating the callback on every keystroke-driven render.
  const chatsRef = React.useRef(chats);
  chatsRef.current = chats;
  // The model powering Lu (dock picker). A ref mirrors it so sendMessage reads the latest
  // choice without re-creating the callback on every change.
  const [selectedModel, setSelectedModel] = React.useState<string>(DEFAULT_LU_MODEL);
  const selectedModelRef = React.useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const messages = (chats.find((c) => c.id === activeChatId) ?? chats[0]).messages;

  /** append into a specific chat (timers may land after a switch); first owner message titles a "New chat" */
  const appendTo = React.useCallback((chatId: string, msg: LuMessage) => {
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [...c.messages, msg],
              title: c.title === "New chat" && msg.role === "owner" ? msg.body.slice(0, 24) : c.title,
            }
          : c,
      ),
    );
  }, []);
  const [approvals, setApprovals] = React.useState(initialApprovals);
  const [escalations, setEscalations] = React.useState(initialEscalations);
  const [actions, setActions] = React.useState(initialActions);
  const [builds, setBuilds] = React.useState<BuildBatch[]>([]);
  const [typing, setTyping] = React.useState(false);
  // The dock is the primary surface now — expanded by default; collapsing to a rail persists.
  const [dockOpen, setDockOpen] = React.useState(true);
  const [contextEntity, setContextEntity] = React.useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null);
  const [dockTab, setDockTab] = React.useState<DockTab>("lu");
  const [clarifications, setClarifications] = React.useState<Clarification[]>([]);
  const [composerPrefill, setComposerPrefill] = React.useState<string | null>(null);
  const answeringEscalation = React.useRef<OpenEscalation | null>(null);

  // THREAD REHYDRATION (docs/product.md §0): the server persists the whole Lu conversation
  // (Thread/Message rows) but the client used to start every load from a fresh greeting — a
  // reload wiped the visible thread while Lu still remembered. On mount, read the persisted
  // thread once and adopt it as the main chat (only if the owner hasn't typed yet this session).
  const seenServerIds = React.useRef<Set<string>>(new Set());
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    let alive = true;

    type ServerMsg = {
      id: string;
      role: string;
      content: string;
      createdAt?: string;
      meta?: Record<string, unknown> | null;
    };
    const fetchHistory = async (): Promise<ServerMsg[]> => {
      const res = await fetch("/api/lu/history", { cache: "no-store" });
      if (!res.ok) return [];
      const data = (await res.json()) as { messages?: ServerMsg[] };
      return Array.isArray(data.messages) ? data.messages : [];
    };
    const adopt = (msgs: ServerMsg[]) => {
      for (const m of msgs) seenServerIds.current.add(m.id);
      const mapped: LuMessage[] = msgs.map((m) => ({
        id: `srv_${m.id}`,
        at: m.createdAt ?? new Date().toISOString(),
        role: m.role === "user" ? ("owner" as const) : ("lu" as const),
        body: m.content,
        via: "app" as const,
        // Persisted structure (roadmap P1): cards + choice chips survive reload.
        ...(m.meta?.card === "connect" ? { card: "connect" as const } : {}),
        ...(choicesFromMeta(m.meta) ? { choices: choicesFromMeta(m.meta)! } : {}),
      }));
      setChats((cs) =>
        cs.map((c) =>
          c.id === "chat_main" && !c.messages.some((m) => m.role === "owner")
            ? {
                ...c,
                messages: mapped,
                title: mapped.find((x) => x.role === "owner")?.body.slice(0, 24) ?? c.title,
              }
            : c,
        ),
      );
    };

    (async () => {
      try {
        let msgs = await fetchHistory();
        if (!alive) return;
        // LU SPEAKS FIRST (roadmap Chapter 0): an empty thread means the owner has never
        // been greeted — fire the server-side kickoff (idempotent there) and re-read.
        if (msgs.length === 0) {
          try {
            const kick = await fetch("/api/lu/kickoff", { method: "POST" });
            if (kick.ok) msgs = await fetchHistory();
          } catch {
            /* the empty-state copy remains as the fallback */
          }
        }
        if (!alive || msgs.length === 0) return;
        adopt(msgs);
      } catch {
        /* keep the greeting — hydration is best-effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ⌘/ toggles the dock; persist open state across pages.
  React.useEffect(() => {
    // Default expanded; only a previously-collapsed rail ("0") stays collapsed.
    setDockOpen(window.localStorage.getItem("lu_dock_open") !== "0");
  }, []);
  const persistOpen = React.useCallback((open: boolean) => {
    setDockOpen(open);
    window.localStorage.setItem("lu_dock_open", open ? "1" : "0");
  }, []);

  // Phase-2 auto-open: check onboarding-mode ONCE on mount (a single fetch, NOT a poller — so
  // onboarded users never poll this in the background) and open the dock if the org is
  // mid-onboarding, dropping the owner straight into Lu's setup conversation. The open dock's own
  // pollers (ChatTab / LuOnboardingTracker) take it from there.
  const autoOpenedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/dock/onboarding", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { active?: boolean };
        if (alive && data.active) persistOpen(true);
      } catch {
        /* ignore — the owner can still open the dock manually */
      }
    })();
    return () => {
      alive = false;
    };
  }, [persistOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        persistOpen(!dockOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockOpen, persistOpen]);

  // LIVE REPORT-BACK (docs/system.md §2): while the dock is open, gently poll the persisted
  // thread and append NEW system-authored messages (preview ready, published, build failed —
  // written server-side by the journal) into the visible chat. This is how work "reports back"
  // into the conversation without the owner having to ask.
  React.useEffect(() => {
    if (!dockOpen) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/lu/history", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as {
          messages?: {
            id: string;
            role: string;
            content: string;
            createdAt?: string;
            meta?: Record<string, unknown> | null;
          }[];
        };
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        if (!alive) return;
        for (const m of msgs) {
          if (seenServerIds.current.has(m.id)) continue;
          seenServerIds.current.add(m.id);
          // Only merge system report-backs: the owner's turns and Lu's replies are already in
          // the local thread (they were appended optimistically when sent).
          if (m.role === "assistant" && m.meta && m.meta.source === "system") {
            appendTo("chat_main", {
              id: `srv_${m.id}`,
              at: m.createdAt ?? new Date().toISOString(),
              role: "lu",
              body: m.content,
              via: "app",
              ...(m.meta.card === "connect" ? { card: "connect" as const } : {}),
              ...(choicesFromMeta(m.meta) ? { choices: choicesFromMeta(m.meta)! } : {}),
            });
          }
        }
      } catch {
        /* best-effort */
      }
    };
    load();
    const iv = window.setInterval(load, 10_000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [dockOpen, appendTo]);

  // THE HONEST BADGE (docs/product.md §0): the "needs you" number counts SERVER truth —
  // real pending approvals (plan gates, publish gates) polled cheaply even while the dock is
  // closed — instead of a local array that started empty and lied.
  const [serverPendingCount, setServerPendingCount] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/dock/approvals", { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { approvals?: unknown[] };
        if (alive) setServerPendingCount(Array.isArray(data.approvals) ? data.approvals.length : 0);
      } catch {
        /* keep the last count */
      }
    };
    load();
    const iv = window.setInterval(load, 15_000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, []);

  // the entity context is about the page you were on — leaving it clears it
  // (and the canvas selection, which is likewise page-scoped)
  React.useEffect(() => {
    setContextEntity(null);
    setSelectedAgent(null);
  }, [pathname]);

  const sendMessage = React.useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text) return;
      const chatId = activeChatIdRef.current;
      const ownerMsg: LuMessage = { id: nextId(), at: new Date().toISOString(), role: "owner", body: text, via: "app" };
      appendTo(chatId, ownerMsg);

      // answering an escalation? resolve it: Lu relays in her own words.
      const esc = answeringEscalation.current;
      if (esc) {
        answeringEscalation.current = null;
        setEscalations((list) => list.filter((x) => x.id !== esc.id));
        setActions((list) => [
          { id: nextId(), at: new Date().toISOString(), module: "core" as const, summary: `Answered ${esc.contactName}'s question — passed along in Lu's words`, contactId: esc.contactId },
          ...list,
        ]);
        return;
      }

      // Every org shares ONE real assistant: this widget talks to /api/lu/chat, which
      // (server-side, from the session org) drives the REAL Lu orchestrator on apps/api — she
      // decomposes the goal into Task rows and dispatches engineering builds; the dock watches them.
      {
        const prior = chatsRef.current.find((c) => c.id === chatId)?.messages ?? [];
        const thread = [...prior, ownerMsg].map((m) => ({
          role: m.role === "owner" ? ("user" as const) : ("assistant" as const),
          content: m.body,
        }));
        // the model needs a user-first transcript — drop the seeded welcome/greeting.
        while (thread.length && thread[0].role === "assistant") thread.shift();

        setTyping(true);
        fetch("/api/lu/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: thread, modelId: selectedModelRef.current }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(String(res.status));
            // Lu already created the Task rows AND dispatched the Engineer server-side; the
            // response carries the ids so the thread can WATCH the build (don't throw them away).
            return (await res.json()) as { reply?: string; tasksCreated?: string[]; actions?: unknown[] };
          })
          .then((data) => {
            setTyping(false);
            // Structured Lu→UI actions (docs/product.md): show_connect attaches the inline
            // connect FORM to Lu's reply — her answer to "I want to connect X" IS the form.
            const showConnect =
              Array.isArray(data.actions) &&
              data.actions.some(
                (a) => !!a && typeof a === "object" && (a as { type?: unknown }).type === "show_connect",
              );
            // MOVES (roadmap P1): an ask_user with options becomes tappable chips ON the
            // message (the server persisted the same shape in meta — reload agrees).
            const askWithOptions = Array.isArray(data.actions)
              ? (data.actions.find(
                  (a) =>
                    !!a &&
                    typeof a === "object" &&
                    (a as { type?: unknown }).type === "ask_user" &&
                    Array.isArray((a as { options?: unknown }).options) &&
                    ((a as { options?: unknown[] }).options?.length ?? 0) > 0,
                ) as { question: string; options: string[]; recommended?: number } | undefined)
              : undefined;
            const choices: LuChoices | undefined = askWithOptions
              ? {
                  question: askWithOptions.question,
                  options: askWithOptions.options,
                  ...(typeof askWithOptions.recommended === "number"
                    ? { recommended: askWithOptions.recommended }
                    : {}),
                }
              : undefined;
            if (data.reply?.trim()) {
              appendTo(chatId, {
                id: nextId(),
                at: new Date().toISOString(),
                role: "lu",
                body: data.reply.trim(),
                via: "app",
                ...(showConnect ? { card: "connect" as const } : {}),
                ...(choices ? { choices } : {}),
              });
            } else if (showConnect) {
              appendTo(chatId, {
                id: nextId(),
                at: new Date().toISOString(),
                role: "lu",
                body: "Here's the form — paste your tokens and we're set.",
                via: "app",
                card: "connect",
              });
            }
            const taskIds = Array.isArray(data.tasksCreated)
              ? data.tasksCreated.filter((t): t is string => typeof t === "string")
              : [];
            if (taskIds.length > 0) {
              // Record the batch; LuBuildTracker (in the thread) polls the dock for these ids and
              // shows queued → building → preview → needs-approval, ending at PublishApprovals.
              setBuilds((prev) => [...prev, { id: nextId(), chatId, at: new Date().toISOString(), taskIds }]);
            }
            // ask_user WITHOUT options still surfaces on Home as "Needs clarification"
            // (option questions are fully handled by the chips on the message + Home's
            // openChoices — don't double-render them).
            const asks = Array.isArray(data.actions)
              ? data.actions.filter(
                  (a): a is { type: string; question: string; options?: string[] } =>
                    !!a &&
                    typeof a === "object" &&
                    (a as { type?: unknown }).type === "ask_user" &&
                    typeof (a as { question?: unknown }).question === "string" &&
                    !(Array.isArray((a as { options?: unknown }).options) &&
                      ((a as { options?: unknown[] }).options?.length ?? 0) > 0),
                )
              : [];
            if (asks.length > 0) {
              const at = new Date().toISOString();
              setClarifications((prev) => [
                ...asks.map((a) => ({
                  id: nextId(),
                  question: a.question,
                  options: Array.isArray(a.options) ? a.options : undefined,
                  at,
                })),
                ...prev,
              ]);
            }
          })
          .catch(() => {
            setTyping(false);
            appendTo(chatId, {
              id: nextId(),
              at: new Date().toISOString(),
              role: "lu",
              body: "One sec — I couldn't reach my tools just then. Give me a moment and try that again.",
              via: "app",
            });
          });
        return;
      }
    },
    [appendTo],
  );

  const resolveApproval = React.useCallback(
    (id: string, decision: "approved" | "declined", editedPreview?: string) => {
      const target = approvals.find((a) => a.id === id);
      if (!target) return;
      const edited = editedPreview !== undefined && editedPreview.trim() !== target.preview.trim();
      setApprovals((list) => list.filter((a) => a.id !== id));
      if (decision === "approved") {
        setActions((list) => [
          {
            id: nextId(),
            at: new Date().toISOString(),
            module: "core" as const,
            summary: `Sent${edited ? " (with your edits)" : ""}: ${target.summary}`,
            contactId: target.contactId,
          },
          ...list,
        ]);
        toast.success(edited ? "Sent with your edits" : "Sent", {
          description: edited ? editedPreview : target.summary,
        });
      } else {
        toast("Dropped it", { description: `Lu won't send: ${target.summary}` });
      }
    },
    [approvals],
  );

  const startNewChat = React.useCallback(() => {
    const id = `chat_${nextId()}`;
    // Empty by design — no preset Lu message; the chat's empty state carries the prompt.
    setChats((cs) => [{ id, title: "New chat", messages: [] }, ...cs]);
    setActiveChatId(id);
  }, []);

  const beginEscalationAnswer = React.useCallback((e: OpenEscalation) => {
    answeringEscalation.current = e;
    setComposerPrefill(`Answer for ${e.contactName.split(" ")[0]}: `);
  }, []);

  const consumePrefill = React.useCallback(() => {
    if (composerPrefill === null) return null;
    setComposerPrefill(null);
    return composerPrefill;
  }, [composerPrefill]);

  const surface = surfaceForPath(pathname ?? "");
  const chips = surface ? MODULES[surface].chips : MODULES.canvas.chips;

  // The open frontier: the ACTIVE chat's last message, when it's a Lu turn carrying
  // choices — an owner reply (typed or tapped) after it closes the offer.
  const lastMsg = messages.at(-1);
  const openChoices =
    lastMsg && lastMsg.role === "lu" && lastMsg.choices
      ? { ...lastMsg.choices, messageId: lastMsg.id }
      : null;

  const value: LuState = {
    ownerName,
    assistantName,
    messages,
    chats: chats.map((c) => ({ id: c.id, title: c.title })),
    activeChatId,
    switchChat: setActiveChatId,
    approvals,
    escalations,
    actions,
    builds,
    pendingCount: approvals.length + escalations.length + serverPendingCount,
    typing,
    dockOpen,
    setDockOpen: persistOpen,
    openDock: (ctx) => {
      if (ctx?.entity) setContextEntity(ctx.entity);
      persistOpen(true);
    },
    contextEntity,
    selectedAgent,
    setSelectedAgent,
    dockTab,
    setDockTab,
    selectedModel,
    setSelectedModel,
    clarifications,
    dismissClarification: (id) => setClarifications((prev) => prev.filter((c) => c.id !== id)),
    openChoices,
    sendMessage,
    startNewChat,
    approve: (id, editedPreview) => resolveApproval(id, "approved", editedPreview),
    decline: (id) => resolveApproval(id, "declined"),
    beginEscalationAnswer,
    prefillComposer: (text) => setComposerPrefill(text),
    composerPrefill,
    consumePrefill,
    chipsForCurrentPage: chips,
    currentPageLabel: surface ? MODULES[surface].label : null,
  };

  return <LuContext.Provider value={value}>{children}</LuContext.Provider>;
}
