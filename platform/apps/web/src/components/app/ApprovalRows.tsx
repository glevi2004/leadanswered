"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircleQuestion } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { KIND_META } from "@/components/app/ApprovalCard";
import { SarahIcon } from "@/components/icons/sarah";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OpenEscalation } from "@/lib/data/home";

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
 * tab; the widget keeps compact ApprovalCards.
 */
export function ApprovalRows({
  escalations = [],
  onAnswerEscalation,
}: {
  escalations?: OpenEscalation[];
  /** Where "Answer via Sarah" goes — defaults to the widget; /sarah jumps to its Chat tab. */
  onAnswerEscalation?: () => void;
}) {
  const { approvals, approve, decline, openWidget } = useSarah();
  const answer = onAnswerEscalation ?? openWidget;
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
    <div className="divide-y divide-border/60">
      {approvals.map((a) => {
        const editing = editingId === a.id;
        const draft = drafts[a.id] ?? a.preview;
        return (
          <div key={a.id} {...rowProps(a.id)} className="-mx-2 cursor-pointer rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-3">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_META[a.kind].chip}`}>
                {KIND_META[a.kind].label}
              </span>
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
                      <p className="mt-2 pl-1 text-sm leading-relaxed text-muted-foreground">“{draft}”</p>
                    )}
                    <div className="mt-2.5 flex items-center gap-2 pb-1 pl-1">
                      <Button size="sm" className="btn-glow h-7 px-3 text-xs" onClick={() => approve(a.id)}>
                        Send it
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => setEditingId(editing ? null : a.id)}
                      >
                        {editing ? "Done" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 text-xs text-muted-foreground"
                        onClick={() => decline(a.id)}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                </RowBody>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {escalations.map((e) => (
        <div key={e.id} {...rowProps(e.id)} className="-mx-2 cursor-pointer rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-700 dark:text-orange-300">
              <MessageCircleQuestion className="mr-1 inline size-3" />
              Question
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{e.contactName} asked something</p>
            <span className="shrink-0 text-xs text-muted-foreground">{waited(e.createdAt)}</span>
          </div>
          <AnimatePresence initial={false}>
            {isOpen(e.id) && (
              <RowBody>
                <p className="mt-2 pl-1 text-sm leading-relaxed text-muted-foreground">“{e.question}”</p>
                <div className="mt-2.5 flex items-center gap-2 pb-1 pl-1" onClick={(ev) => ev.stopPropagation()}>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 px-3 text-xs" onClick={answer}>
                    <SarahIcon className="size-3.5" /> Answer via Sarah
                  </Button>
                </div>
              </RowBody>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
