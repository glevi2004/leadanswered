"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { BrowserChrome } from "@/components/canvas/BrowserChrome";
import { type DockSite, siteHost, siteUrl } from "@/lib/dock/live";

/**
 * A live SITE-PREVIEW node on the canvas — one real Site row (GET /api/sites) rendered as a
 * browser window on the plane, near the Engineering agent. While the Site is `building`
 * (no deploy URL yet) it shows a "Building…" card; once a preview/production URL exists it
 * renders the deployment live in an iframe (desktop-width, scaled down like the page frames)
 * and the whole frame becomes an "Open preview" link (opens the deploy in a new tab).
 *
 * Carries `lu-node` so react-zoom-pan-pinch never starts a pan from it (matching the page
 * frames) — but it's NOT wired into the graph's drag/select machinery: it's pure live data,
 * anchored to a computed world position, so it can't steal pan/zoom/marquee/terminal.
 */

const DRAG_CLASS = "lu-node"; // pan-exclusion marker (see CompanyCanvas)
const IFRAME_W = 1280; // deploy rendered at desktop width, then scaled to fit the frame

export function SitePreviewNode({
  site,
  x,
  y,
  w,
  h,
}: {
  site: DockSite;
  x: number; // world-space CENTER
  y: number;
  w: number;
  h: number;
}) {
  const url = siteUrl(site);
  const host = siteHost(site);
  const repo = site.repoFullName?.split("/").pop() ?? "site";
  const scale = w / IFRAME_W;
  const innerH = Math.round(h / scale); // total inner (chrome + page) height, pre-scale

  const frameStyle = { left: x - w / 2, top: y - h / 2, width: w, height: h } as const;
  const shell =
    `${DRAG_CLASS} absolute overflow-hidden rounded-[10px] border border-black/5 bg-card elev-3 dark:border-white/10`;

  // BUILDING — repo exists, no deployment URL yet (status building / preview-pending)
  if (!url) {
    return (
      <div data-site={site.id} className={`${shell} flex flex-col`} style={frameStyle}>
        <BrowserChrome host={host} page={repo} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
          <Loader2 className="size-8 animate-spin" style={{ color: "rgb(96,165,250)" }} />
          <span className="text-sm font-medium text-foreground">Building…</span>
          <span className="max-w-[85%] truncate text-xs text-muted-foreground/70">
            {site.repoFullName ?? repo}
          </span>
        </div>
      </div>
    );
  }

  // LIVE — a deployment URL exists → render it, whole frame links out to open the preview
  return (
    <a
      data-site={site.id}
      className={`${shell} group block cursor-pointer`}
      style={frameStyle}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${host}`}
    >
      {/* the whole WINDOW (chrome + page) renders at desktop width then scales down */}
      <div
        className="flex origin-top-left flex-col"
        style={{ width: IFRAME_W, height: innerH, transform: `scale(${scale})` }}
      >
        <BrowserChrome host={host} page={repo} />
        <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
          {/* pointer-events off → the iframe is a read-only preview; clicks open the link */}
          <iframe
            src={url}
            title={host}
            loading="lazy"
            className="size-full border-0 bg-background"
            style={{ pointerEvents: "none" }}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* hover affordance — "Open preview" (some sites block framing; this always works) */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
        <span className="mb-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-black shadow">
          <ExternalLink className="size-3" /> Open preview
        </span>
      </div>
    </a>
  );
}
