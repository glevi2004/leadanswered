"use client";

import * as React from "react";
import type { SarahMessage } from "@/lib/data/shared";
import { LuBuildTracker } from "./LuBuildTracker";
import { cn } from "@/lib/utils";

/** The owner thread as authentic iMessage bubbles (marketing-site construction). */
export function SarahThread({
  messages,
  typing,
  className,
}: {
  messages: SarahMessage[];
  typing: boolean;
  className?: string;
}) {
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {messages.map((m, i) => {
        const mine = m.role === "owner";
        const prev = messages[i - 1];
        const gap = prev && prev.role !== m.role;
        return (
          <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start", gap && "mt-2")}>
            <div className={cn("msg", mine ? "msg-me" : "msg-them")}>
              {m.body}
              {m.via === "sms" && (
                <span className={cn("ml-1.5 align-middle text-[10px] opacity-60", mine ? "text-white" : "")}>· SMS</span>
              )}
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="mt-2 flex justify-start">
          <div className="msg msg-them" aria-label="Sarah is typing">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
      {/* The chat↔Engineer wire: Lu's dispatched builds unfold right here in the thread. */}
      <LuBuildTracker />
      <div ref={endRef} />
    </div>
  );
}
