"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLu } from "@/components/lu/lu-context";
import { KindChip } from "@/components/app/ApprovalCard";
import { LuIcon } from "@/components/icons/lu";
import { Textarea } from "@/components/ui/textarea";
import type { OpenEscalation } from "@/components/lu/lu-context";

function waited(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function RowBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

/**
 * The Linear-style approvals inbox (Levi, 2026-07-12): flat rows — kind chip ·
 * summary · wait time — that expand on hover (click pins, covers touch) to
 * reveal the draft and the actions, including INLINE editing of the draft
 * before sending. Shared by Home's "Needs you" card and the /sarah Approvals
 * tab; the dock keeps compact ApprovalCards.
 */
export function ApprovalRows({
  onAnswerEscalation,
}: {
  /** Where "Answer via Lu" lands — defaults to the dock; /sarah jumps to its Chat tab. */
  onAnswerEscalation?: (e: OpenEscalation) => void;
}) {
  const { approvals, escalations, approve, decline, openDock, beginEscalationAnswer } = useLu();
  const answer =
    onAnswerEscalation ??
    ((e: OpenEscalation) => {
      beginEscalationAnswer(e);
      openDock();
    });
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [pinnedId, setPinnedId] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  // editing keeps a row open even if the mouse wanders off
  const isOpen = (id: string) => hoverId === id || pinnedId === id || editingId === id;
  const rowProps = (id: string) => ({
    onMouseEnter: () => setHoverId(id),
    onMouseLeave: () => setHoverId((h) => (h === id ? null : h)),
    onClick: () => setPinnedId((p) => (p === id ? null : id)),
  });

  return (
    <div className="flex flex-col gap-2.5">
      {approvals.map((a) => {
        const editing = editingId === a.id;
        const draft = drafts[a.id] ?? a.preview;
        return (
          <div key={a.id} {...rowProps(a.id)} className="neu-card-in cursor-pointer rounded-xl px-3.5 py-3 transition">
            <div className="flex items-center gap-3">
              <KindChip kind={a.kind} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{a.summary}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{waited(a.createdAt)}</span>
            </div>
            <AnimatePresence initial={false}>
              {isOpen(a.id) && (
                <RowBody>
                  <div onClick={(e) => e.stopPropagation()}>
                    {editing ? (
                      <Textarea
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                        className="mt-2 text-sm"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{draft}”</p>
                    )}
                    <div className="mt-2.5 flex items-center gap-1.5 pb-0.5">
                      <button
                        className="gloss-ink press rounded-full px-3 py-1 text-[12px] font-medium text-white"
                        onClick={() => approve(a.id, drafts[a.id] !== undefined ? drafts[a.id] : undefined)}
                      >
                        Approve
                      </button>
                      <button
                        className="gloss press rounded-full px-3 py-1 text-[12px] font-medium text-foreground"
                        onClick={() => setEditingId(editing ? null : a.id)}
                      >
                        {editing ? "Done" : "Edit"}
                      </button>
                      <button
                        className="press rounded-full px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => decline(a.id)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </RowBody>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {escalations.map((e) => (
        <div key={e.id} {...rowProps(e.id)} className="neu-card-in cursor-pointer rounded-xl px-3.5 py-3 transition">
          <div className="flex items-center gap-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-300">
              <span className="size-1.5 rounded-full bg-orange-500" />
              Question
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{e.contactName}: “{e.question}”</p>
            <span className="shrink-0 text-xs text-muted-foreground">{waited(e.createdAt)}</span>
          </div>
          <AnimatePresence initial={false}>
            {isOpen(e.id) && (
              <RowBody>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">“{e.question}”</p>
                <div className="mt-2.5 flex items-center gap-2 pb-0.5" onClick={(ev) => ev.stopPropagation()}>
                  <button
                    className="gloss press inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium text-foreground"
                    onClick={() => answer(e)}
                  >
                    <LuIcon className="size-3.5" /> Answer via Lu
                  </button>
                </div>
              </RowBody>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
