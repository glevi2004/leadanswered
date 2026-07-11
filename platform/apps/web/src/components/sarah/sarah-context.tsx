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
 */

interface SarahState {
  demo: boolean;
  ownerName: string;
  messages: SarahMessage[];
  approvals: Approval[];
  actions: SarahAction[];
  pendingCount: number;
  typing: boolean;
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  openWidget: () => void;
  sendMessage: (body: string) => void;
  approve: (id: string) => void;
  decline: (id: string) => void;
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
  children,
}: {
  demo: boolean;
  ownerName: string;
  initialMessages: SarahMessage[];
  initialApprovals: Approval[];
  initialActions: SarahAction[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [messages, setMessages] = React.useState(initialMessages);
  const [approvals, setApprovals] = React.useState(initialApprovals);
  const [actions, setActions] = React.useState(initialActions);
  const [typing, setTyping] = React.useState(false);
  const [widgetOpen, setWidgetOpen] = React.useState(false);

  // ⌘/ toggles the widget; persist open state across pages.
  React.useEffect(() => {
    setWidgetOpen(window.localStorage.getItem("sarah_widget_open") === "1");
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

  const sendMessage = React.useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text) return;
      setMessages((m) => [...m, { id: nextId(), at: new Date().toISOString(), role: "owner", body: text, via: "app" }]);
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
        setMessages((m) => [...m, { id: nextId(), at: new Date().toISOString(), role: "sarah", body: reply, via: "app" }]);
      }, 900 + Math.random() * 600);
    },
    [demo],
  );

  const resolveApproval = React.useCallback(
    (id: string, decision: "approved" | "declined") => {
      const target = approvals.find((a) => a.id === id);
      if (!target) return;
      setApprovals((list) => list.filter((a) => a.id !== id));
      if (decision === "approved") {
        setActions((list) => [
          { id: nextId(), at: new Date().toISOString(), module: "core" as const, summary: `Sent: ${target.summary}`, contactId: target.contactId },
          ...list,
        ]);
        toast.success("Sent", { description: target.summary });
      } else {
        toast("Dropped it", { description: `Sarah won't send: ${target.summary}` });
      }
    },
    [approvals],
  );

  const surface = surfaceForPath(pathname ?? "");
  const chips = surface ? MODULES[surface].sarahChips : MODULES.home.sarahChips;

  const value: SarahState = {
    demo,
    ownerName,
    messages,
    approvals,
    actions,
    pendingCount: approvals.length,
    typing,
    widgetOpen,
    setWidgetOpen: persistOpen,
    openWidget: () => persistOpen(true),
    sendMessage,
    approve: (id) => resolveApproval(id, "approved"),
    decline: (id) => resolveApproval(id, "declined"),
    chipsForCurrentPage: chips,
    currentPageLabel: surface ? MODULES[surface].label : null,
  };

  return <SarahContext.Provider value={value}>{children}</SarahContext.Provider>;
}
