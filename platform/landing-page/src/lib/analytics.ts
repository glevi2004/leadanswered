// Central analytics helper. Everything the site tracks routes through here and is
// captured by PostHog. NEVER send PII (names/emails/phones). See ANALYTICS-PLAN.md §4.

export type TrackParams = Record<string, unknown>;

export function track(event: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    posthog?: { capture?: (e: string, p?: TrackParams) => void };
  };
  // Captured once PostHog is initialized (post-consent). No-op before then.
  if (w.posthog && typeof w.posthog.capture === "function") {
    w.posthog.capture(event, params);
  }
}

// Coarse page_type for clean segmentation in reports.
export function pageType(path: string): string {
  const p = path.replace(/\/+$/, "") || "/";
  if (p === "/") return "home";
  if (p === "/blog") return "blog_index";
  if (p.startsWith("/blog/")) return "blog_post";
  if (p === "/for") return "trade_index";
  if (p.startsWith("/for/")) return "trade_page";
  if (p === "/about") return "about";
  if (p === "/privacy" || p === "/terms") return "legal";
  if (p === "/optin") return "optin";
  return "other";
}
