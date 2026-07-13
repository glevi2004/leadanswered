"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { Approval, SarahAction, SarahMessage } from "@/lib/data/shared";
import { MODULES, surfaceForPath } from "@/lib/data/registry";
import { scriptedReply } from "@/lib/data/fixtures/apex";

/**
 * The one owner conversation, shared by the widget and /sarah (00 §3: three
 * surfaces, one thread). Demo mode runs on fixtures with scripted replies;
 * real mode starts honest-empty — in-app turns land when POST /sarah/turn ships
 * (02-sarah §5); until then the composer says so instead of faking Sarah.
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

interface SarahState {
  demo: boolean;
  ownerName: string;
  /** the ACTIVE chat's messages — consumers don't care about the history model */
  messages: SarahMessage[];
  /** conversation history for the "New chat ▾" dropdown */
  chats: { id: string; title: string }[];
  activeChatId: string;
  switchChat: (id: string) => void;
  approvals: Approval[];
  escalations: OpenEscalation[];
  actions: SarahAction[];
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
  demo,
  ownerName,
  initialMessages,
  initialApprovals,
  initialActions,
  initialEscalations = [],
  initialPastChats = [],
  children,
}: {
  demo: boolean;
  ownerName: string;
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
  const [typing, setTyping] = React.useState(false);
  const [widgetOpen, setWidgetOpen] = React.useState(false);
  const [widgetMode, setWidgetMode] = React.useState<"docked" | "floating">("docked");
  const [contextEntity, setContextEntity] = React.useState<string | null>(null);
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
  React.useEffect(() => setContextEntity(null), [pathname]);

  const sendMessage = React.useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text) return;
      const chatId = activeChatIdRef.current;
      appendTo(chatId, { id: nextId(), at: new Date().toISOString(), role: "owner", body: text, via: "app" });

      // answering an escalation? resolve it: Sarah relays in her own words.
      const esc = answeringEscalation.current;
      if (esc) {
        answeringEscalation.current = null;
        setEscalations((list) => list.filter((x) => x.id !== esc.id));
        setActions((list) => [
          { id: nextId(), at: new Date().toISOString(), module: "core" as const, summary: `Answered ${esc.contactName}'s question — passed along in Sarah's words`, contactId: esc.contactId },
          ...list,
        ]);
        if (demo) {
          setTyping(true);
          window.setTimeout(() => {
            setTyping(false);
            appendTo(chatId, { id: nextId(), at: new Date().toISOString(), role: "sarah", body: `Got it — I'll pass that along to ${esc.contactName.split(" ")[0]} in my words and let you know what they say.`, via: "app" });
          }, 800);
        }
        return;
      }

      if (!demo) {
        // Honest until POST /sarah/turn exists: never fake a Sarah reply on real accounts.
        toast("In-app chat is almost ready", {
          description: "Sarah answers by text today — text her line and she's on it.",
        });
        return;
      }
      setTyping(true);
      const reply = scriptedReply(text);
      window.setTimeout(() => {
        setTyping(false);
        appendTo(chatId, { id: nextId(), at: new Date().toISOString(), role: "sarah", body: reply, via: "app" });
      }, 900 + Math.random() * 600);
    },
    [demo, appendTo],
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
    demo,
    ownerName,
    messages,
    chats: chats.map((c) => ({ id: c.id, title: c.title })),
    activeChatId,
    switchChat: setActiveChatId,
    approvals,
    escalations,
    actions,
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
