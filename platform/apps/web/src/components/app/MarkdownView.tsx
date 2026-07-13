import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal markdown renderer for Sarah-authored bodies (04-content §6):
 * paragraphs, ## headings, - lists, **bold**. Fixture-controlled input only —
 * a real markdown dependency arrives with the CMS, not before.
 */

function inline(text: string, strongCls: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className={strongCls}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function MarkdownView({
  markdown,
  tone = "app",
  className,
}: {
  markdown: string;
  /** "light" forces light-surface ink (phone screens are always white). */
  tone?: "app" | "light";
  className?: string;
}) {
  const body = tone === "light" ? "text-zinc-600" : "text-muted-foreground";
  const strongCls = tone === "light" ? "font-semibold text-zinc-900" : "font-semibold text-foreground";
  const headingCls = tone === "light" ? "pt-1 text-base font-semibold text-zinc-900" : "pt-1 text-base font-semibold text-foreground";
  const blocks = markdown.split(/\n\n+/);
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed", body, className)}>
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className={headingCls}>
              {block.slice(3)}
            </h2>
          );
        }
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2), strongCls)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(block, strongCls)}</p>;
      })}
    </div>
  );
}
