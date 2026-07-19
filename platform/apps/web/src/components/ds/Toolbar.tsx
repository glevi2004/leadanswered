"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ToolbarIconButton } from "./ToolbarIconButton";

/**
 * Toolbar — the reusable icon-toolbar primitive (the canvas toolbar IS this). A `gloss` /
 * `gloss-ink` pill of ToolbarIconButtons, horizontal or vertical. Used for the canvas toolbar
 * (horizontal, ink, hover-to-expand from a "+") and the collapsed Lu rail (vertical, surface,
 * always shown). One component, two placements.
 */
export type ToolbarItem = {
  key: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** draw a divider before this item */
  dividerBefore?: boolean;
  /** render the icon; receives whether it's active/hovered (for stateful/animated icons) */
  render: (p: { active: boolean; hovered: boolean }) => React.ReactNode;
};

export function Toolbar({
  items,
  orientation = "horizontal",
  variant = "ink",
  expandOnHover = false,
  collapsed,
  expandedSize,
  className,
}: {
  items: ToolbarItem[];
  orientation?: "horizontal" | "vertical";
  variant?: "ink" | "surface";
  /** collapse to `collapsed` and expand on hover (the canvas toolbar). Needs `expandedSize`. */
  expandOnHover?: boolean;
  /** the node shown while collapsed (e.g. a Plus) */
  collapsed?: React.ReactNode;
  /** px along the main axis when expanded (only used with expandOnHover) */
  expandedSize?: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const vertical = orientation === "vertical";
  const shown = expandOnHover ? open : true;
  const dividerTone = variant === "ink" ? "bg-primary-foreground/15" : "bg-foreground/12";

  const style: React.CSSProperties | undefined = expandOnHover
    ? vertical
      ? { height: shown ? expandedSize : 44 }
      : { width: shown ? expandedSize : 44 }
    : undefined;

  return (
    <div
      className={cn("inline-flex", className)}
      onMouseEnter={expandOnHover ? () => setOpen(true) : undefined}
      onMouseLeave={expandOnHover ? () => setOpen(false) : undefined}
    >
      <div
        style={style}
        className={cn(
          variant === "ink" ? "gloss-ink" : "gloss",
          "relative flex overflow-hidden rounded-2xl transition-[width,height,padding] duration-200 ease-out",
          vertical ? "w-11 flex-col items-center" : "h-11 flex-row items-center",
          shown ? (vertical ? "py-1.5" : "px-1.5") : "p-0",
        )}
      >
        {expandOnHover && collapsed && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-100",
              shown ? "opacity-0" : "opacity-100",
            )}
          >
            {collapsed}
          </div>
        )}
        <div
          className={cn(
            "flex gap-0.5",
            vertical ? "flex-col items-center" : "flex-row items-center",
            !shown && "pointer-events-none",
          )}
        >
          {items.map((it, i) => (
            <React.Fragment key={it.key}>
              {it.dividerBefore && (
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 transition-opacity duration-150",
                    dividerTone,
                    vertical ? "my-1 h-px w-5" : "mx-1 h-6 w-px",
                    shown ? "opacity-100" : "opacity-0",
                  )}
                  style={expandOnHover ? { transitionDelay: shown ? "60ms" : "0ms" } : undefined}
                />
              )}
              <ToolbarIconButton
                variant={variant}
                active={!!it.active}
                title={it.label}
                aria-label={it.label}
                onClick={it.onClick}
                onMouseEnter={() => setHovered(it.key)}
                onMouseLeave={() => setHovered((h) => (h === it.key ? null : h))}
                style={expandOnHover ? { transitionDelay: shown ? `${40 + i * 22}ms` : "0ms" } : undefined}
                className={
                  expandOnHover
                    ? shown
                      ? "opacity-100"
                      : cn("opacity-0", vertical ? "-translate-y-1.5" : "translate-x-1.5")
                    : undefined
                }
              >
                {it.render({ active: !!it.active, hovered: hovered === it.key })}
              </ToolbarIconButton>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
