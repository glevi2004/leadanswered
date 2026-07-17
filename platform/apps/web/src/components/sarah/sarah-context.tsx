"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { Approval, SarahAction, SarahMessage } from "@/lib/data/shared";
import { MODULES, surfaceForPath } from "@/lib/data/registry";
import { DEFAULT_LU_MODEL } from "@/lib/lu-models";
import { CAPABILITIES } from "@/lib/workspace/capabilities";
import type { CapabilityKey } from "@/lib/workspace/capabilities";

/**
 * The one owner conversation, shared by the widget and /sarah (00 §3: three
 * surfaces, one thread). Every org talks to the REAL Lu (/api/lu/chat); the thread
 * starts honest-empty with a greeting.
 *
 * Escalations live here too (drift fix 2026-07-12): the pending badge is
 * approvals + open escalations on EVERY surface — sidebar, launcher, /sarah
 * tab, Home "Needs you" — one number, one meaning.
 */

export interface SarahChat {
  id: string;
  title: string;
  messages: SarahMessage[];
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

interface SarahState {
  ownerName: string;
  /** the org's chosen name for the assistant (default "Lu") — for conversational copy */
  assistantName: string;
  /** the ACTIVE chat's messages — consumers don't care about the history model */
  messages: SarahMessage[];
  /** conversation history for the "New chat ▾" dropdown */
  chats: { id: string; title: string }[];
  activeChatId: string;
  switchChat: (id: string) => void;
  approvals: Approval[];
  escalations: OpenEscalation[];
  actions: SarahAction[];
  /** builds Lu dispatched this session — the thread watches these unfold live */
  builds: BuildBatch[];
  /** approvals + open escalations — the one "needs you" number, all surfaces */
  pendingCount: number;
  typing: boolean;
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  /** Apollo-style display: full-height docked panel (default) or floating corner card */
  widgetMode: "docked" | "floating";
  setWidgetMode: (mode: "docked" | "floating") => void;
  openWidget: (ctx?: { entity?: string }) => void;
  /** the record the owner was looking at when they asked ("Ask Sarah about Dana") */
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
  sendMessage: (body: string) => void;
  /** Apollo-style "New chat": a fresh conversation; approvals/escalations untouched */
  startNewChat: () => void;
  approve: (id: string, editedPreview?: string) => void;
  decline: (id: string) => void;
  /** stage an answer to an escalation: prefills the composer; the next send resolves it */
  beginEscalationAnswer: (e: OpenEscalation) => void;
  /** composer prefill handshake — composer reads it once, then clears */
  composerPrefill: string | null;
  consumePrefill: () => string | null;
  chipsForCurrentPage: string[];
  currentPageLabel: string | null;
}

const SarahContext = React.createContext<SarahState | null>(null);

export function useSarah(): SarahState {
  const ctx = React.useContext(SarahContext);
  if (!ctx) throw new Error("useSarah must be used inside <SarahProvider>");
  return ctx;
}

let idCounter = 0;
const nextId = () => `local_${++idCounter}`;

export function SarahProvider({
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
  initialMessages: SarahMessage[];
  initialApprovals: Approval[];
  initialActions: SarahAction[];
  initialEscalations?: OpenEscalation[];
  initialPastChats?: SarahChat[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [chats, setChats] = React.useState<SarahChat[]>(() => [
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
  const appendTo = React.useCallback((chatId: string, msg: SarahMessage) => {
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
  const [widgetOpen, setWidgetOpen] = React.useState(false);
  const [widgetMode, setWidgetMode] = React.useState<"docked" | "floating">("docked");
  const [contextEntity, setContextEntity] = React.useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null);
  const [dockTab, setDockTab] = React.useState<DockTab>("lu");
  const [clarifications, setClarifications] = React.useState<Clarification[]>([]);
  const [composerPrefill, setComposerPrefill] = React.useState<string | null>(null);
  const answeringEscalation = React.useRef<OpenEscalation | null>(null);

  // ⌘/ toggles the widget; persist open state across pages.
  React.useEffect(() => {
    setWidgetOpen(window.localStorage.getItem("sarah_widget_open") === "1");
    if (window.localStorage.getItem("sarah_widget_mode") === "floating") setWidgetMode("floating");
  }, []);
  const persistMode = React.useCallback((mode: "docked" | "floating") => {
    setWidgetMode(mode);
    window.localStorage.setItem("sarah_widget_mode", mode);
  }, []);
  const persistOpen = React.useCallback((open: boolean) => {
    setWidgetOpen(open);
    window.localStorage.setItem("sarah_widget_open", open ? "1" : "0");
  }, []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        persistOpen(!widgetOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [widgetOpen, persistOpen]);

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
      const ownerMsg: SarahMessage = { id: nextId(), at: new Date().toISOString(), role: "owner", body: text, via: "app" };
      appendTo(chatId, ownerMsg);

      // answering an escalation? resolve it: Sarah relays in her own words.
      const esc = answeringEscalation.current;
      if (esc) {
        answeringEscalation.current = null;
        setEscalations((list) => list.filter((x) => x.id !== esc.id));
        setActions((list) => [
          { id: nextId(), at: new Date().toISOString(), module: "core" as const, summary: `Answered ${esc.contactName}'s question — passed along in Sarah's words`, contactId: esc.contactId },
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
            if (data.reply?.trim()) {
              appendTo(chatId, { id: nextId(), at: new Date().toISOString(), role: "sarah", body: data.reply.trim(), via: "app" });
            }
            const taskIds = Array.isArray(data.tasksCreated)
              ? data.tasksCreated.filter((t): t is string => typeof t === "string")
              : [];
            if (taskIds.length > 0) {
              // Record the batch; LuBuildTracker (in the thread) polls the dock for these ids and
              // shows queued → building → preview → needs-approval, ending at PublishApprovals.
              setBuilds((prev) => [...prev, { id: nextId(), chatId, at: new Date().toISOString(), taskIds }]);
            }
            // ask_user questions come back inline (non-blocking) — surface them on Home as
            // "Needs clarification" until the owner answers or dismisses them.
            const asks = Array.isArray(data.actions)
              ? data.actions.filter(
                  (a): a is { type: string; question: string; options?: string[] } =>
                    !!a &&
                    typeof a === "object" &&
                    (a as { type?: unknown }).type === "ask_user" &&
                    typeof (a as { question?: unknown }).question === "string",
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
              role: "sarah",
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
        toast("Dropped it", { description: `Sarah won't send: ${target.summary}` });
      }
    },
    [approvals],
  );

  const startNewChat = React.useCallback(() => {
    const id = `chat_${nextId()}`;
    setChats((cs) => [
      {
        id,
        title: "New chat",
        messages: [
          { id: nextId(), at: new Date().toISOString(), role: "sarah", body: `Fresh page, ${ownerName} — what do you need?`, via: "app" },
        ],
      },
      ...cs,
    ]);
    setActiveChatId(id);
  }, [ownerName]);

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
  const chips = surface ? MODULES[surface].sarahChips : MODULES.home.sarahChips;

  const value: SarahState = {
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
    pendingCount: approvals.length + escalations.length,
    typing,
    widgetOpen,
    setWidgetOpen: persistOpen,
    widgetMode,
    setWidgetMode: persistMode,
    openWidget: (ctx) => {
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
    sendMessage,
    startNewChat,
    approve: (id, editedPreview) => resolveApproval(id, "approved", editedPreview),
    decline: (id) => resolveApproval(id, "declined"),
    beginEscalationAnswer,
    composerPrefill,
    consumePrefill,
    chipsForCurrentPage: chips,
    currentPageLabel: surface ? MODULES[surface].label : null,
  };

  return <SarahContext.Provider value={value}>{children}</SarahContext.Provider>;
}
